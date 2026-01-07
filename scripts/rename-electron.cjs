const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "dist-electron");

const pairs = [
  ["main.js", "main.cjs"],
  ["preload.js", "preload.cjs"],
];

for (const [from, to] of pairs) {
  const a = path.join(outDir, from);
  const b = path.join(outDir, to);

  if (!fs.existsSync(a)) {
    console.error(`[rename-electron] Missing: ${a}`);
    process.exit(1);
  }

  fs.copyFileSync(a, b);
  console.log(`[rename-electron] ${from} -> ${to}`);
}
