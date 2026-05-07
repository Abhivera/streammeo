import { useRef } from "react";
import "./App.css";
import { startSession } from "./transport/ws";
import type { Socket } from "socket.io-client";

const TTS_SAMPLE_RATE = 24000; // bulbul:v3 default

function App() {
  const socketConn = useRef<Socket>(null);
  const playbackCtx = useRef<AudioContext>(null);
  const nextPlayTime = useRef(0);
  const currentGenerationId = useRef(0);

  const playAudioChunk = (base64Audio: string) => {
    if (!playbackCtx.current) {
      playbackCtx.current = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
    }
    const ctx = playbackCtx.current;

    // Decode base64 → Int16 PCM → Float32 samples
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, TTS_SAMPLE_RATE);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTime.current);
    source.start(startTime);
    nextPlayTime.current = startTime + audioBuffer.duration;
  };

  const handleClick = async () => {
    if (!socketConn.current) {
      socketConn.current = startSession();

      socketConn.current.on("generation-start", (id: number) => {
        currentGenerationId.current = id;
      });

      socketConn.current.on("audio-chunk", (data: { audio: string; generationId: number }) => {
        if (data.generationId !== currentGenerationId.current) {
          console.log(`[AUDIO] Discarding stale chunk (gen ${data.generationId}, current ${currentGenerationId.current})`);
          return;
        }
        console.log(`[AUDIO] Chunk received, length: ${data.audio?.length}`);
        playAudioChunk(data.audio);
      });

      socketConn.current.on("stop-playback", () => {
        console.log("[AUDIO] Stop playback — barge-in detected");
        if (playbackCtx.current) {
          playbackCtx.current.close();
          playbackCtx.current = null;
        }
        nextPlayTime.current = 0;
      });
    }

    // get the mic live feed
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    const audioCtx = new AudioContext({
      sampleRate: 16000,
    });
    await audioCtx.audioWorklet.addModule("/pcm-worker.js");

    const source = audioCtx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(
      audioCtx,
      "pcm-processor",
    );

    worklet.port.onmessage = (
      e: MessageEvent<ArrayBuffer>,
    ) => {
      socketConn.current?.emit("audioChunk", e.data);
    };

    source.connect(worklet);
  };

  return (
    <>
      <button onClick={handleClick}>Start Agent</button>
    </>
  );
}

export default App;
