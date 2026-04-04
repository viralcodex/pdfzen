import solidTransformPlugin from "@opentui/solid/bun-plugin";
import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const projectDir = resolve(import.meta.dir, "..");
const distDir = resolve(projectDir, "dist");
const outDir = resolve(projectDir, "release/artifacts");
const buildDir = resolve(projectDir, "release/.build");

const targets = [
  { name: "darwin-arm64", bunTarget: "bun-darwin-arm64" },
  { name: "darwin-x64", bunTarget: "bun-darwin-x64" },
  { name: "linux-x64", bunTarget: "bun-linux-x64" },
  { name: "linux-arm64", bunTarget: "bun-linux-arm64" },
  { name: "windows-x64", bunTarget: "bun-windows-x64" },
] as const;

const log = (msg: string) => console.log(`\x1b[34m→\x1b[0m ${msg}`);
const ok = (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const die = (msg: string): never => { console.error(`\x1b[31m✗\x1b[0m ${msg}`); process.exit(1); };

async function bundle(outdir: string): Promise<void> {
  log("Bundling...");
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [resolve(projectDir, "src/index.tsx")],
    outdir,
    target: "bun",
    minify: true,
    sourcemap: "linked",
    plugins: [solidTransformPlugin],
  });

  if (!result.success) {
    for (const l of result.logs) console.error(l);
    die("Bundle failed");
  }
  ok(`Bundle → ${outdir}`);
}

async function compile(toBuild: typeof targets[number][]): Promise<void> {
  await mkdir(outDir, { recursive: true });

  // Collect external assets to embed (.wasm, .scm)
  const entries = await readdir(buildDir);
  const embedFiles = [
    ...entries.filter((e) => e.endsWith(".wasm") || e.endsWith(".scm")).map((e) => resolve(buildDir, e)),
    resolve(projectDir, "node_modules/mupdf/dist/mupdf-wasm.wasm"),
  ];

  for (const t of toBuild) {
    const ext = t.name.startsWith("windows") ? ".exe" : "";
    const outFile = resolve(outDir, `pdfzen-${t.name}${ext}`);
    log(`Compiling ${t.name}...`);

    const proc = Bun.spawn(
      [
        "bun", "build", "--compile",
        "--no-compile-autoload-bunfig",
        `--target=${t.bunTarget}`,
        `--outfile=${outFile}`,
        "--minify",
        ...embedFiles.map((f) => `--embed=${f}`),
        resolve(buildDir, "index.js"),
      ],
      { cwd: projectDir, stdin: "inherit", stdout: "inherit", stderr: "inherit" },
    );

    if ((await proc.exited) !== 0) die(`Failed to compile ${t.name}`);
    ok(t.name);
  }

  ok(`Artifacts in ${outDir}`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (!arg || arg === "dev") {
  await bundle(distDir);
} else if (arg === "release") {
  await bundle(buildDir);
  await compile([...targets]);
} else {
  const match = targets.filter((t) => t.name === arg);
  if (match.length === 0) die(`Unknown target: ${arg}\nUsage: bun run build [dev|release|${targets.map((t) => t.name).join("|")}]`);
  await bundle(buildDir);
  await compile(match);
}
