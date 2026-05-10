import { io, type Socket } from "socket.io-client";

type UIS = "idle" | "listening" | "thinking" | "speaking";

type SessionStateEvt = { state: string };

declare global {
  interface Window {
    VoiceWidgetInjected?: boolean;
  }
}

const SCRIPT_EL = document.currentScript as HTMLScriptElement | null;
if (!SCRIPT_EL) {
  console.error("VoiceWidget: embed via a dedicated <script> tag");
} else if (window.VoiceWidgetInjected) {
  /* noop */
} else {
  window.VoiceWidgetInjected = true;
  bootstrap(SCRIPT_EL);
}

function bootstrap(script: HTMLScriptElement): void {
  const apiKey = script.dataset.apiKey;
  const lang = script.dataset.lang ?? "ta";
  const backend =
    script.dataset.backendUrl ?? `${window.location.protocol}//${window.location.hostname}:3001`;

  if (!(apiKey && apiKey.length > 10)) {
    console.error("VoiceWidget: data-api-key is required");
    return;
  }

  const host = document.createElement("div");
  host.id = `vw-${crypto.randomUUID().slice(0, 8)}`;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const row = document.createElement("div");
  row.className = "dock";

  const panel = document.createElement("aside");
  panel.className = "panel";
  const messages = document.createElement("div");
  messages.className = "msgs";
  panel.appendChild(messages);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mic idle";
  btn.setAttribute("aria-label", "Voice support");
  btn.innerHTML =
    `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z"/><path d="M19 11a7 7 0 11-14 0M12 18v4M9 21h6"/></svg>`;

  row.appendChild(panel);
  row.appendChild(btn);
  shadow.appendChild(row);

  const socket: Socket = io(backend, {
    transports: ["websocket", "polling"],
    path: "/socket.io/",
    query: lang ? { lang } : undefined,
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
        socket.emit("end");
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
      endedByVad = false;

      recorder = pickRecorder(stream);

      recorder.addEventListener("dataavailable", (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          void ev.data.arrayBuffer().then((ab) => {
            socket.emit("audio", new Uint8Array(ab));
          });
        }
      });

      recorder.start(180);
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
        socket.emit("end");
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
    recorder?.stop();
    recorder = undefined;
    stream?.getTracks().forEach((t) => t.stop());
    stream = undefined;
    heardSpeech = false;
    if (resetUi) setUi(btn, panel, "idle");
  }
}

function setUi(btn: HTMLButtonElement, panel: HTMLElement, s: UIS): void {
  btn.classList.remove("idle", "listening", "thinking", "speaking");
  btn.classList.add(s);
  if (s === "thinking") {
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>`;
  } else {
    btn.innerHTML =
      `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z"/><path d="M19 11a7 7 0 11-14 0M12 18v4M9 21h6"/></svg>`;
  }

  panel.classList.toggle("open", ["listening", "thinking", "speaking"].includes(s));

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
  msgs.scrollTop = msgs.scrollHeight;
}

function toast(row: HTMLElement, text: string, ttl = 4500): void {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  row.insertBefore(t, row.firstChild);
  window.setTimeout(() => t.remove(), ttl);
}

const css = `
:host{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;color:#0f172a;}
.dock{position:fixed;right:22px;bottom:22px;z-index:2147483640;display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
.panel{width:320px;max-height:420px;display:none;background:#fff;color:#111;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 22px 50px rgb(15 23 42 / .18);}
.panel.open{display:block;}
.msgs{padding:14px;display:flex;flex-direction:column;gap:10px;max-height:360px;overflow:auto;}
.bubble{font-size:14px;line-height:1.45;padding:10px;border-radius:12px;white-space:pre-wrap;}
.bubble.user{align-self:flex-end;background:#eef2ff;}
.bubble.assistant{align-self:flex-start;background:#f4f4f5;}
.toast{width:320px;background:#111827;color:#fff;padding:8px 12px;font-size:12px;line-height:1.35;border-radius:10px;box-shadow:0 10px 30px rgb(15 23 42 / .15);}
.mic{width:56px;height:56px;border-radius:999px;border:none;cursor:pointer;display:grid;place-items:center;background:#e5e7eb;color:#111;box-shadow:0 10px 30px rgb(15 23 42 / .15);transition:transform .16s ease;}
.mic:hover{transform:translateY(-1px);}
.mic.listening{background:#fecaca;color:#7f1d1d;animation:vw-pulse 1.1s ease-in-out infinite;}
.mic.thinking{background:#bfdbfe;color:#1e3a8a;}
.mic.speaking{background:#bbf7d0;color:#14532d;animation:vw-pulse 1.1s ease-in-out infinite;}
.mic.idle{background:#e5e7eb;}
@keyframes vw-pulse{0%{box-shadow:0 0 0 0 rgb(239 68 68 / .45);}70%{box-shadow:0 0 0 14px rgb(239 68 68 / 0);}100%{box-shadow:0 0 0 0 rgb(239 68 68 / 0);}}
.spinner{width:22px;height:22px;border-radius:50%;border:3px solid #1e3a8a;border-top-color:transparent;animation:vw-spin .8s linear infinite;}
@keyframes vw-spin{to{transform:rotate(360deg);}}
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
