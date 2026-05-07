class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0][0];
    if (input) {
      const pcm16 = new Int16Array(input.length);

      // Mapping the range. This works on % based.
      for (let i = 0; i < input.length; i++) {
        pcm16[i] = Math.max(
          -32768,
          Math.min(32767, input[i] * 32768),
        );
      }

      /**
       * The second argument is a transfer list. Instead of copying,
       * the browser moves ownership of that ArrayBuffer to the
       * receiving thread. The underlying memory pointer is
       * handed off — zero copy.
       **/

      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
