import { AppSyncRealtimeClient } from "./appsync";

type UIS = "idle" | "listening" | "thinking" | "speaking";
type DisplayMode = "corner" | "center";

declare global {
  interface Window {
    StreammeoInjected?: boolean;
  }
}

const TARGET_SAMPLE_RATE = 16_000;
const VAD_LOUD_GATE = 0.02;
const VAD_SILENCE_MS = 900;

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
  const backend = (
    script.dataset.backendUrl ?? `${window.location.protocol}//${window.location.hostname}:3001`
  ).replace(/\/$/, "");
  const appSyncUrl = script.dataset.appsyncUrl ?? "";
  const appSyncApiKey = script.dataset.appsyncApiKey ?? "";

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

  // --- Realtime + session state ---
  let sessionId = "";
  let workspaceId = "";
  let realtime: AppSyncRealtimeClient | null = null;
  const useRealtime = Boolean(appSyncUrl && appSyncApiKey);

  function applyState(state: string): void {
    if (state === "listening") setUi(btn, panel, "listening");
    else if (state === "processing") setUi(btn, panel, "thinking");
    else if (state === "speaking") setUi(btn, panel, "speaking");
    else setUi(btn, panel, "idle");
  }

  async function startSession(): Promise<void> {
    try {
      const res = await fetch(`${backend}/api/v1/voice/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast(row, body.error ?? "Couldn't start a voice session.");
        return;
      }
      const data = (await res.json()) as { sessionId: string; workspaceId: string };
      sessionId = data.sessionId;
      workspaceId = data.workspaceId;

      if (useRealtime) {
        realtime = new AppSyncRealtimeClient(appSyncUrl, appSyncApiKey, {
          onVoiceEvent: (event) => {
            pushMsg(messages, event.role, event.text);
            if (event.role === "assistant" && event.audioUrl) {
              void playUrl(event.audioUrl);
            }
          },
          onSessionState: (event) => applyState(event.state),
          onError: (message) => toast(row, message),
        });
        realtime.connect(workspaceId, sessionId);
      }
    } catch {
      toast(row, "Couldn't reach the assistant server.");
    }
  }
  void startSession();

  // --- Audio playback (S3 presigned MP3) ---
  let playbackCtx: AudioContext | undefined;
  let currentSource: AudioBufferSourceNode | null = null;

  async function ensurePlaybackContext(): Promise<AudioContext> {
    if (!playbackCtx) playbackCtx = new AudioContext();
    if (playbackCtx.state === "suspended") await playbackCtx.resume();
    return playbackCtx;
  }

  function stopPlayback(): void {
    try {
      currentSource?.stop();
    } catch {
      /* already stopped */
    }
    currentSource = null;
  }

  async function playUrl(url: string): Promise<void> {
    try {
      const ctx = await ensurePlaybackContext();
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      stopPlayback();
      await new Promise<void>((resolve, reject) => {
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
        currentSource = src;
        src.onended = () => {
          if (currentSource === src) currentSource = null;
          resolve();
        };
        try {
          src.start();
        } catch (err) {
          reject(err as Error);
        }
      });
    } catch (err) {
      console.error(err);
      toast(row, "Couldn't play assistant audio");
    }
  }

  // --- Microphone capture → 16 kHz mono PCM ---
  let stream: MediaStream | undefined;
  let captureCtx: AudioContext | undefined;
  let processor: ScriptProcessorNode | undefined;
  let sourceNode: MediaStreamAudioSourceNode | undefined;
  let pcmFrames: Float32Array[] = [];
  let captureRate = TARGET_SAMPLE_RATE;
  let recording = false;
  let heardSpeech = false;
  let silentMs = 0;
  let sending = false;

  btn.addEventListener("click", () => {
    void toggleMic();
  });

  async function toggleMic(): Promise<void> {
    if (recording) {
      void stopAndSend();
      return;
    }
    if (btn.classList.contains("speaking")) {
      stopPlayback();
    }
    if (!sessionId) {
      toast(row, "Session not ready yet — try again in a moment.");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      captureCtx = new AudioContext();
      captureRate = captureCtx.sampleRate;
      sourceNode = captureCtx.createMediaStreamSource(stream);
      processor = captureCtx.createScriptProcessor(4096, 1, 1);
      pcmFrames = [];
      heardSpeech = false;
      silentMs = 0;
      recording = true;

      const frameMs = (4096 / captureRate) * 1000;
      processor.onaudioprocess = (ev: AudioProcessingEvent): void => {
        if (!recording) return;
        const input = ev.inputBuffer.getChannelData(0);
        pcmFrames.push(new Float32Array(input));

        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i]! * input[i]!;
        const rms = Math.sqrt(sum / input.length);
        if (rms > VAD_LOUD_GATE) {
          heardSpeech = true;
          silentMs = 0;
        } else if (heardSpeech) {
          silentMs += frameMs;
          if (silentMs >= VAD_SILENCE_MS) {
            void stopAndSend();
          }
        }
      };

      sourceNode.connect(processor);
      processor.connect(captureCtx.destination);

      setUi(btn, panel, "listening");
      panel.classList.add("open");
    } catch (err) {
      console.error(err);
      toast(row, "Microphone unavailable or permission denied.");
    }
  }

  async function stopAndSend(): Promise<void> {
    if (!recording || sending) return;
    recording = false;

    try {
      processor?.disconnect();
      sourceNode?.disconnect();
    } catch {
      /* noop */
    }
    stream?.getTracks().forEach((t) => t.stop());
    const rate = captureRate;
    const frames = pcmFrames;
    pcmFrames = [];
    void captureCtx?.close().catch(() => undefined);
    captureCtx = undefined;
    processor = undefined;
    sourceNode = undefined;
    stream = undefined;

    const pcm = encodePcm16(frames, rate, TARGET_SAMPLE_RATE);
    if (pcm.byteLength < 32) {
      setUi(btn, panel, "idle");
      return;
    }

    sending = true;
    if (!useRealtime) setUi(btn, panel, "thinking");
    try {
      const res = await fetch(`${backend}/api/v1/voice/turn`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey, sessionId, audio: arrayBufferToBase64(pcm) }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        userText?: string;
        assistantText?: string;
        audioUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        toast(row, body.error ?? "Something went wrong. Please try again.");
        setUi(btn, panel, "idle");
        return;
      }
      // When AppSync is active, transcripts + audio arrive via subscription.
      if (!realtime) {
        if (body.userText) pushMsg(messages, "user", body.userText);
        if (body.assistantText) pushMsg(messages, "assistant", body.assistantText);
        if (body.audioUrl) {
          setUi(btn, panel, "speaking");
          await playUrl(body.audioUrl);
        }
        setUi(btn, panel, "idle");
      }
    } catch (err) {
      console.error(err);
      toast(row, "Couldn't reach the assistant server.");
      setUi(btn, panel, "idle");
    } finally {
      sending = false;
    }
  }

  window.addEventListener("beforeunload", () => {
    realtime?.close();
  });
}

function encodePcm16(frames: Float32Array[], inRate: number, outRate: number): ArrayBuffer {
  let length = 0;
  for (const f of frames) length += f.length;
  const flat = new Float32Array(length);
  let offset = 0;
  for (const f of frames) {
    flat.set(f, offset);
    offset += f.length;
  }
  const resampled = inRate === outRate ? flat : downsample(flat, inRate, outRate);
  const out = new ArrayBuffer(resampled.length * 2);
  const view = new DataView(out);
  for (let i = 0; i < resampled.length; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

function downsample(buffer: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return buffer;
  const ratio = inRate / outRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let pos = 0;
  for (let i = 0; i < newLength; i++) {
    const next = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = Math.round(i * ratio); j < next && j < buffer.length; j++) {
      sum += buffer[j]!;
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
    pos = next;
  }
  void pos;
  return result;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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
