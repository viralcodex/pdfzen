import { mkdir, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { homedir } from "node:os";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const projectDir = resolve(import.meta.dir, "..");

function step(message: string): void {
  console.log(`${colors.blue}==>${colors.reset} ${message}`);
}

function success(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warning(message: string): void {
  console.log(`${colors.yellow}!${colors.reset} ${message}`);
}

function fail(message: string): never {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
  process.exit(1);
}

async function execOrFail(cmd: string[], cwd?: string): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  if ((await proc.exited) !== 0) {
    fail(`Command failed: ${cmd.join(" ")}`);
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

async function setupDependencies(): Promise<void> {
  if (!existsSync(resolve(projectDir, "node_modules"))) {
    step("Installing dependencies...");
    await execOrFail(["bun", "install"], projectDir);
    success("Dependencies installed");
  } else {
    success("Dependencies already installed");
  }
}

function getShellRcPath(): string {
  const shell = basename(process.env.SHELL ?? "zsh");
  if (shell === "bash") {
    const bashrc = resolve(homedir(), ".bashrc");
    return existsSync(bashrc) ? bashrc : resolve(homedir(), ".bash_profile");
  }
  const zdot = process.env.ZDOTDIR || homedir();
  return resolve(zdot, ".zshrc");
}

function pathHasEntry(pathValue: string, entry: string): boolean {
  return pathValue.split(":").includes(entry);
}

async function installGlobalCommand(): Promise<void> {
  step("Installing global 'tuidf' command...");

  let binDir = "";
  const pathValue = process.env.PATH ?? "";
  for (const candidate of ["/opt/homebrew/bin", "/usr/local/bin"]) {
    if (pathHasEntry(pathValue, candidate) && existsSync(candidate)) {
      try {
        const testFile = resolve(candidate, ".tuidf-write-test");
        await writeFile(testFile, "ok");
        await rm(testFile, { force: true });
        binDir = candidate;
        break;
      } catch {
        // Try next candidate.
      }
    }
  }

  const localBin = resolve(homedir(), ".local", "bin");
  if (!binDir) {
    binDir = localBin;
    await mkdir(binDir, { recursive: true });
  }

  const launcherPath = resolve(binDir, "tuidf");
  const quotedProjectDir = shellSingleQuote(projectDir);
  const launcher = `#!/usr/bin/env bash\nset -euo pipefail\nexec bun run --cwd ${quotedProjectDir} scripts/dev.ts "$@"\n`;
  await writeFile(launcherPath, launcher, "utf8");
  await chmod(launcherPath, 0o755);

  success(`Created launcher: ${launcherPath}`);

  if (binDir !== localBin) {
    success(`Installed into existing PATH location: ${binDir}`);
    return;
  }

  const rcFile = getShellRcPath();
  const pathLine = 'export PATH="$HOME/.local/bin:$PATH"';
  if (!existsSync(rcFile)) {
    await writeFile(rcFile, "", "utf8");
  }

  const rcContents = await readFile(rcFile, "utf8");
  if (!rcContents.includes(pathLine)) {
    await writeFile(rcFile, `${rcContents.trimEnd()}\n${pathLine}\n`, "utf8");
    success(`Added ${localBin} to PATH in ${rcFile}`);
  } else {
    success(`PATH entry already exists in ${rcFile}`);
  }

  if (pathHasEntry(pathValue, localBin)) {
    success(`Current shell already has ${localBin} in PATH`);
  } else {
    warning(`${localBin} is not in the current shell PATH yet`);
    warning("A script cannot change PATH of the parent shell process.");
    warning(`Run: source ${rcFile}`);
  }
}

async function startUi(): Promise<void> {
  step("Starting TUI...");
  await execOrFail(["bun", "run", "dev"], projectDir);
}

function printBanner(): void {
  console.log("\n╔════════════════════════════════════╗");
  console.log("║       TuiDF Dev Environment       ║");
  console.log("╚════════════════════════════════════╝\n");
}

function printUsage(): void {
  console.log(`Usage: bun run scripts/dev.ts [command]

Commands:
  setup    Install dependencies
  install  Setup and install global "tuidf" command
  help     Show this message

Default:
  Runs dependency checks + setup, then starts the UI.`);
}

async function main(): Promise<void> {
  printBanner();

  const [command = ""] = process.argv.slice(2);

  switch (command) {
    case "setup":
      await setupDependencies();
      success("Setup complete! Run 'bun run dev' to start.");
      break;
    case "install":
      await setupDependencies();
      await installGlobalCommand();
      break;
    case "help":
    case "-h":
    case "--help":
      printUsage();
      break;
    case "":
      await setupDependencies();
      await startUi();
      break;
    default:
      warning(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

await main();
