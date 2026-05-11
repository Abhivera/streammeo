import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "../../widget/dist/widget.js");
const dest = path.resolve(__dirname, "../public/widget.js");

if (!fs.existsSync(src)) {
  console.error("copy-widget: missing", src, "— run: npm run -w @streammeo/widget build");
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("copy-widget:", dest);
