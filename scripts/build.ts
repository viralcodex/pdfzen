/**
 * Build script for compiling pdfzen TUI to standalone executables.
 * Uses OpenTUI's Bun plugin for proper Solid JSX transformation.
 * 
 * Usage:
 *   bun run scripts/build.ts [target] [outfile]
 *   
 * Examples:
 *   bun run scripts/build.ts                           # Bundle only (dev)
 *   bun run scripts/build.ts bun-linux-x64 dist/pdfzen # Cross-compile
 */
import solidPlugin from "@opentui/solid/bun-plugin";
import { rmSync } from "fs";

const targetArg = process.argv[2];
// "native" means build for current platform (no --target flag)
const target = targetArg === "native" ? undefined : targetArg as 
  | "bun-linux-x64"
  | "bun-darwin-arm64"
  | "bun-darwin-x64"
  | "bun-windows-x64"
  | undefined;

const outfile = process.argv[3] || "dist/pdfzen-tui";

async function build() {
  console.log(`Building for target: ${targetArg === "native" ? "native (current platform)" : target || "current platform"}`);
  console.log(`Output: ${outfile}`);

  // Step 1: Bundle with Solid JSX transform
  const bundleOutDir = ".build-temp";
  const bundleName = "bundle.js";
  
  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    outdir: bundleOutDir,
    target: "bun",
    minify: true,
    plugins: [solidPlugin],
    naming: bundleName,
  });

  if (!result.success) {
    console.error("Bundle failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  const bundlePath = `${bundleOutDir}/${bundleName}`;
  console.log(`Bundle created: ${bundlePath}`);

  // Step 2: Compile to standalone executable
  const compileArgs = ["bun", "build", "--compile", "--minify", bundlePath, "--outfile", outfile];
  if (target) {
    compileArgs.splice(4, 0, `--target=${target}`);
  }
  
  console.log(`Compiling: ${compileArgs.join(" ")}`);
  
  const proc = Bun.spawn({
    cmd: compileArgs,
    stdout: "inherit",
    stderr: "inherit",
  });
  
  const exitCode = await proc.exited;
  
  // Clean up intermediate bundle
  try {
    rmSync(bundleOutDir, { recursive: true, force: true });
  } catch {}
  
  if (exitCode !== 0) {
    console.error(`Compile failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }

  console.log("Build complete!");
}

build();
