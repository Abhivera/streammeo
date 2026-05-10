/** Workspace language codes ta | hi | en → Sarvam locale */
export type SarvamLocale = "ta-IN" | "hi-IN" | "en-IN";

export function workspaceLangToSarvam(code: string): SarvamLocale {
  switch (code) {
    case "hi":
      return "hi-IN";
    case "en":
      return "en-IN";
    default:
      return "ta-IN";
  }
}
