import { io, type Socket } from "socket.io-client";

type UIS = "idle" | "listening" | "thinking" | "speaking";
type DisplayMode = "corner" | "center";

type SessionStateEvt = { state: string };

declare global {
  interface Window {
    StreammeoInjected?: boolean;
  }
}

const SCRIPT_EL = document.currentScript as HTMLScriptElement | null;
if (!SCRIPT_EL) {
  console.error("Streammeo: embed via a dedicated <script> tag");
} else if (window.StreammeoInjected) {
  /* noop */
} else {
  window.StreammeoInjected = true;
  bootstrap(SCRIPT_EL);
}

function bootstrap(script: HTMLScriptElement): void {
  const apiKey = script.dataset.apiKey;
  const displayMode: DisplayMode = script.dataset.displayMode === "center" ? "center" : "corner";
  const backend =
    script.dataset.backendUrl ?? `${window.location.protocol}//${window.location.hostname}:3001`;

  if (!(apiKey && apiKey.length > 10)) {
    console.error("Streammeo: data-api-key is required");
    return;
  }

  const host = document.createElement("div");
  host.id = `sm-${crypto.randomUUID().slice(0, 8)}`;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const row = document.createElement("div");
  row.className = displayMode === "center" ? "dock dock-center" : "dock";

  const panel = document.createElement("aside");
  panel.className = "panel";
  const messages = document.createElement("div");
  messages.className = "msgs";
  panel.appendChild(messages);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mic idle";
  btn.dataset.displayMode = displayMode;
  btn.setAttribute("aria-label", "Voice customer support");
  btn.innerHTML = micSvg(displayMode);

  applyCriticalStyles(row, panel, messages, btn, displayMode);

  row.appendChild(panel);
  row.appendChild(btn);
  shadow.appendChild(row);

  const socket: Socket = io(backend, {
    transports: ["websocket", "polling"],
    path: "/socket.io/",
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect_error", (err: Error) => {
    toast(row, `Couldn't reach assistant server (${err.message})`);
  });

  socket.emit("join", { apiKey });

  socket.on("state", ({ state }: SessionStateEvt) => {
    if (state === "listening") setUi(btn, panel, "listening");
    else if (state === "processing") setUi(btn, panel, "thinking");
    else if (state === "speaking") setUi(btn, panel, "speaking");
    else setUi(btn, panel, "idle");
  });

  const wavChunks: BlobPart[] = [];

  socket.on("audio", (buf: unknown) => {
    if (buf instanceof ArrayBuffer) {
      wavChunks.push(new Uint8Array(buf));
      return;
    }
    if (buf instanceof Uint8Array) {
      wavChunks.push(new Uint8Array(buf));
    }
  });

  socket.on("transcript", (payload: { role: string; text: string }) => {
    if (payload.role === "assistant") {
      void finalizeAssistantPlayback();
    }
    pushMsg(messages, payload.role, payload.text);
  });

  socket.on("error", (payload: { message: string }) => {
    toast(row, payload.message);
    setUi(btn, panel, "idle");
  });

  async function finalizeAssistantPlayback(): Promise<void> {
    if (wavChunks.length === 0) return;
    const blob = new Blob(wavChunks, { type: "audio/wav" });
    wavChunks.length = 0;
    try {
      const ctx = await ensurePlaybackContext();
      const arrayBuf = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      await playBuffer(ctx, decoded);
    } catch (err) {
      console.error(err);
      toast(row, "Couldn't play assistant audio");
    }
  }

  let playbackCtx: AudioContext | undefined;
  async function ensurePlaybackContext(): Promise<AudioContext> {
    if (!(playbackCtx && playbackCtx.state === "running")) {
      playbackCtx = new AudioContext();
    }
    if (playbackCtx.state === "suspended") {
      await playbackCtx.resume();
    }
    return playbackCtx;
  }

  let recorder: MediaRecorder | undefined;
  let stream: MediaStream | undefined;
  /** Full utterance blobs; merged on stop into one WebM for the STT API (concatenating timeslice chunks is invalid). */
  const micChunks: Blob[] = [];
  let emitEndAfterRecorderStop = false;
  let vadRaf = 0;
  let vadCtx: AudioContext | undefined;
  let vadSilenceFrames = 0;
  const silenceNeeded = 35;
  const loudGate = 0.02;
  let heardSpeech = false;
  let endedByVad = false;

  btn.addEventListener("click", () => {
    void toggleMic();
  });

  async function toggleMic(): Promise<void> {
    if (recorder?.state === "recording") {
      if (!endedByVad) {
        emitEndAfterRecorderStop = true;
      }
      stopMic(false);
      setUi(btn, panel, "idle");
      return;
    }

    if (btn.classList.contains("speaking")) {
      socket.emit("barge");
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      wavChunks.length = 0;
      micChunks.length = 0;
      endedByVad = false;

      recorder = pickRecorder(stream);

      recorder.addEventListener("dataavailable", (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          micChunks.push(ev.data);
        }
      });

      /* No timeslice: one well-formed WebM on stop; avoids invalid concat on the server. */
      recorder.start();
      startVAD(stream);

      setUi(btn, panel, "listening");
      panel.classList.add("open");
    } catch (err) {
      console.error(err);
      toast(row, "Microphone unavailable or permission denied.");
    }
  }

  function pickRecorder(media: MediaStream): MediaRecorder {
    const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    return new MediaRecorder(media, { mimeType: preferredMime });
  }

  function startVAD(media: MediaStream): void {
    heardSpeech = false;
    vadSilenceFrames = 0;
    vadCtx = new AudioContext();
    const src = vadCtx.createMediaStreamSource(media);
    const analyser = vadCtx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    const tick = (): void => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const x = (data[i]! - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > loudGate) {
        heardSpeech = true;
        vadSilenceFrames = 0;
      } else if (heardSpeech && vadSilenceFrames++ >= silenceNeeded) {
        vadRaf && cancelAnimationFrame(vadRaf);
        endedByVad = true;
        emitEndAfterRecorderStop = true;
        stopMic(false);
        return;
      }
      vadRaf = requestAnimationFrame(tick);
    };
    vadRaf = requestAnimationFrame(tick);
  }

  function stopMic(resetUi: boolean): void {
    if (vadRaf) cancelAnimationFrame(vadRaf);
    vadRaf = 0;
    void vadCtx?.close().catch(() => undefined);
    vadCtx = undefined;

    const rec = recorder;
    const media = stream;
    recorder = undefined;
    stream = undefined;
    heardSpeech = false;

    const finishTracks = (): void => {
      media?.getTracks().forEach((t) => t.stop());
      if (resetUi) setUi(btn, panel, "idle");
    };

    if (rec && rec.state === "recording") {
      const mime = rec.mimeType;
      const shouldEnd = emitEndAfterRecorderStop;
      emitEndAfterRecorderStop = false;
      rec.addEventListener(
        "stop",
        () => {
          void (async () => {
            try {
              const blob = new Blob(micChunks, { type: mime });
              micChunks.length = 0;
              if (blob.size >= 32) {
                const ab = await blob.arrayBuffer();
                socket.emit("audio", new Uint8Array(ab));
              }
              if (shouldEnd) {
                socket.emit("end");
              }
            } finally {
              finishTracks();
            }
          })();
        },
        { once: true },
      );
      rec.stop();
      return;
    }

    emitEndAfterRecorderStop = false;
    micChunks.length = 0;
    finishTracks();
  }
}

function setUi(btn: HTMLButtonElement, panel: HTMLElement, s: UIS): void {
  btn.classList.remove("idle", "listening", "thinking", "speaking");
  btn.classList.add(s);
  applyButtonStateStyles(btn, s);
  const displayMode = buttonDisplayMode(btn);
  if (s === "thinking") {
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>`;
    const spinner = btn.querySelector<HTMLElement>(".spinner");
    if (spinner) {
      const spinnerSize = displayMode === "center" ? "34px" : "22px";
      spinner.style.cssText =
        `width:${spinnerSize};height:${spinnerSize};border-radius:50%;border:3px solid currentColor;border-top-color:transparent;animation:sm-spin .8s linear infinite;`;
    }
  } else {
    btn.innerHTML = micSvg(displayMode);
  }

  const panelOpen = ["listening", "thinking", "speaking"].includes(s);
  panel.classList.toggle("open", panelOpen);
  panel.style.display = panelOpen ? "block" : "none";

  btn.title =
    s === "idle"
      ? "Speak with support"
      : s === "listening"
      ? "Stop"
      : s === "thinking"
      ? "Thinking…"
      : "Assistant speaking… tap to interrupt";
}

function pushMsg(msgs: HTMLElement, role: string, text: string): void {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  msgs.appendChild(bubble);
}

function toast(row: HTMLElement, text: string, ttl = 4500): void {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  t.style.cssText =
    "width:min(320px,calc(100vw - 32px));box-sizing:border-box;background:#111827;color:#fff;padding:8px 12px;font:12px/1.35 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border-radius:10px;box-shadow:0 10px 30px rgb(15 23 42 / .15);";
  row.insertBefore(t, row.firstChild);
  window.setTimeout(() => t.remove(), ttl);
}

function applyCriticalStyles(
  row: HTMLElement,
  panel: HTMLElement,
  messages: HTMLElement,
  btn: HTMLButtonElement,
  displayMode: DisplayMode,
): void {
  row.style.cssText =
    displayMode === "center"
      ? "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483640;display:flex;flex-direction:column;align-items:center;gap:14px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;"
      : "position:fixed;right:22px;bottom:22px;z-index:2147483640;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;";
  panel.style.cssText =
    "width:min(320px,calc(100vw - 44px));display:none;background:#fff;color:#111;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 22px 50px rgb(15 23 42 / .18);overflow:visible;";
  messages.style.cssText =
    "box-sizing:border-box;padding:14px;display:flex;flex-direction:column;gap:10px;overflow:visible;";
  btn.style.cssText = baseButtonStyle("idle", displayMode);
}

function applyButtonStateStyles(btn: HTMLButtonElement, s: UIS): void {
  btn.style.cssText = baseButtonStyle(s, buttonDisplayMode(btn));
}

function buttonDisplayMode(btn: HTMLButtonElement): DisplayMode {
  return btn.dataset.displayMode === "center" ? "center" : "corner";
}

function micSvg(displayMode: DisplayMode): string {
  const size = displayMode === "center" ? 42 : 26;
  const stroke = displayMode === "center" ? 1.8 : 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}"><path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z"/><path d="M19 11a7 7 0 11-14 0M12 18v4M9 21h6"/></svg>`;
}

function baseButtonStyle(s: UIS, displayMode: DisplayMode): string {
  const tone =
    s === "listening"
      ? "background:#fecaca;color:#7f1d1d;animation:sm-pulse 1.1s ease-in-out infinite;"
      : s === "thinking"
      ? "background:#bfdbfe;color:#1e3a8a;"
      : s === "speaking"
      ? "background:#bbf7d0;color:#14532d;animation:sm-pulse 1.1s ease-in-out infinite;"
      : "background:#e5e7eb;color:#111827;";

  const size = displayMode === "center" ? "96px" : "56px";
  const shadow =
    displayMode === "center"
      ? "box-shadow:0 22px 60px rgb(15 23 42 / .2),0 0 0 10px rgb(255 255 255 / .45);"
      : "box-shadow:0 10px 30px rgb(15 23 42 / .15);";

  return `${tone}width:${size};height:${size};min-width:${size};min-height:${size};box-sizing:border-box;border-radius:999px;border:0;padding:0;margin:0;cursor:pointer;display:grid;place-items:center;${shadow}transition:transform .16s ease;appearance:none;-webkit-appearance:none;`;
}

const css = `
:host{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;color:#0f172a;}
.dock{position:fixed;right:22px;bottom:22px;z-index:2147483640;display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
.dock-center{left:50%;top:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);align-items:center;gap:14px;}
.panel{width:320px;display:none;background:#fff;color:#111;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 22px 50px rgb(15 23 42 / .18);}
.panel.open{display:block;}
.msgs{padding:14px;display:flex;flex-direction:column;gap:10px;}
.bubble{font-size:14px;line-height:1.45;padding:10px;border-radius:12px;white-space:pre-wrap;}
.bubble.user{align-self:flex-end;background:#eef2ff;}
.bubble.assistant{align-self:flex-start;background:#f4f4f5;}
.toast{width:320px;background:#111827;color:#fff;padding:8px 12px;font-size:12px;line-height:1.35;border-radius:10px;box-shadow:0 10px 30px rgb(15 23 42 / .15);}
.mic{width:56px;height:56px;border-radius:999px;border:none;cursor:pointer;display:grid;place-items:center;background:#e5e7eb;color:#111;box-shadow:0 10px 30px rgb(15 23 42 / .15);transition:transform .16s ease;}
.mic:hover{transform:translateY(-1px);}
.mic.listening{background:#fecaca;color:#7f1d1d;animation:sm-pulse 1.1s ease-in-out infinite;}
.mic.thinking{background:#bfdbfe;color:#1e3a8a;}
.mic.speaking{background:#bbf7d0;color:#14532d;animation:sm-pulse 1.1s ease-in-out infinite;}
.mic.idle{background:#e5e7eb;}
@keyframes sm-pulse{0%{box-shadow:0 0 0 0 rgb(239 68 68 / .45);}70%{box-shadow:0 0 0 14px rgb(239 68 68 / 0);}100%{box-shadow:0 0 0 0 rgb(239 68 68 / 0);}}
.spinner{width:22px;height:22px;border-radius:50%;border:3px solid #1e3a8a;border-top-color:transparent;animation:sm-spin .8s linear infinite;}
@keyframes sm-spin{to{transform:rotate(360deg);}}
`;

function playBuffer(ctx: AudioContext, buffer: AudioBuffer): Promise<void> {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  return new Promise((resolve, reject) => {
    src.onended = () => resolve();
    try {
      src.start();
    } catch (err) {
      reject(err);
    }
  });
}
