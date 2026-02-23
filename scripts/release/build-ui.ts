import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import solidPlugin from "@opentui/solid/bun-plugin";

const projectDir = resolve(import.meta.dir, "../..");
const entrypoint = resolve(projectDir, "src/index.tsx");
const outfile = resolve(projectDir, "release/lib/pdfzen-ui");

await mkdir(dirname(outfile), { recursive: true });

const result = await Bun.build({
  entrypoints: [entrypoint],
  target: "bun",
  outdir: resolve(projectDir, "release/lib"),
  plugins: [solidPlugin],
  compile: {
    outfile,
  },
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("UI build failed");
}

console.log(`Built UI executable at: ${outfile}`);
