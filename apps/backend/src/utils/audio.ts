export function arrayBufferToBase64(data: Int16Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
    "base64",
  );
}
