// Finish the `output: "standalone"` build.
//
// Next.js emits `.next/standalone` without the static assets or `public/`,
// so they have to be copied in afterwards. Done in Node rather than `cp -r`
// so the build works on Windows as well as Unix.

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error(
    'No .next/standalone directory — did `next build` run with output: "standalone"?',
  );
  process.exit(1);
}

const copies = [
  [join(root, ".next", "static"), join(standalone, ".next", "static")],
  [join(root, "public"), join(standalone, "public")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`skipped (missing): ${from}`);
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`copied ${from} -> ${to}`);
}
