/* Builds a single self-contained page (CSS and JS inlined, no service worker)
   for publishing as a claude.ai artifact preview. Usage: node scripts/build-artifact.mjs [out.html] */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(root, p), "utf8");
const out = process.argv[2] || join(root, "dist", "artifact.html");

const index = read("index.html");
const body = index.slice(index.indexOf("<!--app-body-->") + 15, index.indexOf("<!--/app-body-->"));
const scripts = ["js/program.js", "js/demos.js", "js/figure.js", "js/app.js"].map(read);

const page = `<title>Rachel's Workouts</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap">
<style>
${read("css/app.css")}
</style>
${body.trim()}
<script>window.RW_NO_SW = true;</script>
${scripts.map(s => `<script>\n${s}\n</script>`).join("\n")}
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`Wrote ${out} (${Math.round(page.length / 1024)} KB)`);
