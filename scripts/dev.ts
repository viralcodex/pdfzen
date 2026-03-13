import { mkdir, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { homedir } from "node:os";

type ExecOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

type PythonCommand = {
  executable: string;
  prefixArgs: string[];
};

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const projectDir = resolve(import.meta.dir, "..");
const backendDir = resolve(projectDir, "backend");
const venvDir = resolve(backendDir, ".venv");

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

async function execOrFail(cmd: string[], options: ExecOptions = {}): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd: options.cwd,
    env: options.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;
  if (code !== 0) {
    fail(`Command failed (${code}): ${cmd.join(" ")}`);
  }
}

async function commandWorks(cmd: string[]): Promise<boolean> {
  const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore", stdin: "ignore" });
  return (await proc.exited) === 0;
}

async function readCommandOutput(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
  });

  const stdout = (await new Response(proc.stdout).text()).trim();
  const stderr = (await new Response(proc.stderr).text()).trim();
  await proc.exited;
  return stdout || stderr;
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function cmdQuote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function getVenvPythonPath(): string {
  if (process.platform === "win32") {
    return join(venvDir, "Scripts", "python.exe");
  }
  return join(venvDir, "bin", "python3");
}

async function detectPythonCommand(): Promise<PythonCommand> {
  const candidates: PythonCommand[] =
    process.platform === "win32"
      ? [
          { executable: "py", prefixArgs: ["-3"] },
          { executable: "python", prefixArgs: [] },
          { executable: "python3", prefixArgs: [] },
        ]
      : [
          { executable: "python3", prefixArgs: [] },
          { executable: "python", prefixArgs: [] },
        ];

  for (const candidate of candidates) {
    if (await commandWorks([candidate.executable, ...candidate.prefixArgs, "--version"])) {
      return candidate;
    }
  }

  fail("Python 3 not found. Install Python 3.10+ and retry.");
}

async function checkDependencies(): Promise<PythonCommand> {
  step("Checking dependencies...");

  const python = await detectPythonCommand();
  const rawVersion = await readCommandOutput([python.executable, ...python.prefixArgs, "--version"]);
  success(`Python found: ${rawVersion.trim()}`);

  if (!(await commandWorks(["bun", "--version"]))) {
    fail("Bun not found. Install Bun and retry.");
  }
  const bunVersion = await readCommandOutput(["bun", "--version"]);
  success(`Bun found: ${bunVersion}`);

  return python;
}

async function setupBackend(python: PythonCommand): Promise<void> {
  step("Setting up Python backend...");

  if (!existsSync(venvDir)) {
    step("Creating virtual environment...");
    await execOrFail([python.executable, ...python.prefixArgs, "-m", "venv", ".venv"], { cwd: backendDir });
    success("Virtual environment created");
  } else {
    success("Virtual environment exists");
  }

  const venvPython = getVenvPythonPath();
  step("Installing Python dependencies...");
  await execOrFail([venvPython, "-m", "pip", "install", "-q", "--upgrade", "pip"], { cwd: backendDir });
  await execOrFail([venvPython, "-m", "pip", "install", "-q", "-r", "requirements.txt"], { cwd: backendDir });
  success("Python dependencies installed");

  step("Verifying backend...");
  const ok = await commandWorks([venvPython, "pdfzen_backend.py", "check-deps"]);
  if (ok) {
    success("Backend verified");
  } else {
    warning("Backend check-deps returned non-zero (may be okay)");
  }
}

async function setupFrontend(): Promise<void> {
  step("Setting up frontend...");

  if (!existsSync(resolve(projectDir, "node_modules"))) {
    step("Installing Bun dependencies...");
    await execOrFail(["bun", "install"], { cwd: projectDir });
    success("Bun dependencies installed");
  } else {
    success("Bun dependencies exist");
  }
}

async function runSetup(): Promise<void> {
  const python = await checkDependencies();
  await setupBackend(python);
  await setupFrontend();
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
  const normalized = process.platform === "win32" ? entry.toLowerCase() : entry;
  return pathValue
    .split(process.platform === "win32" ? ";" : ":")
    .map((part) => (process.platform === "win32" ? part.toLowerCase() : part))
    .includes(normalized);
}

async function updateWindowsUserPath(binDir: string): Promise<void> {
  if (binDir.includes(";")) {
    warning(`Refusing to update PATH with invalid directory: ${binDir}`);
    return;
  }

  const script = [
    "$target = $env:PDFZEN_BIN_DIR",
    "$current = [Environment]::GetEnvironmentVariable('Path', 'User')",
    "if ([string]::IsNullOrWhiteSpace($current)) {",
    "  [Environment]::SetEnvironmentVariable('Path', $target, 'User')",
    "  exit 0",
    "}",
    "$parts = $current.Split(';') | Where-Object { $_ -ne '' }",
    "if ($parts -contains $target) { exit 0 }",
    "$updated = $current.TrimEnd(';') + ';' + $target",
    "[Environment]::SetEnvironmentVariable('Path', $updated, 'User')",
  ].join("\n");

  const proc = Bun.spawn(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    env: { ...process.env, PDFZEN_BIN_DIR: binDir },
    stdin: "ignore",
    stdout: "ignore",
    stderr: "pipe",
  });

  const code = await proc.exited;
  if (code !== 0) {
    const stderr = await new Response(proc.stderr).text();
    warning(`Could not update Windows user PATH automatically: ${stderr.trim()}`);
    warning(`Add this directory manually to PATH: ${binDir}`);
  }
}

async function installGlobalCommand(): Promise<void> {
  step("Installing global 'pdfzen' command...");

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || resolve(homedir(), "AppData", "Local");
    const binDir = resolve(localAppData, "pdfzen", "bin");
    const cmdPath = resolve(binDir, "pdfzen.cmd");

    await mkdir(binDir, { recursive: true });
    const script = `@echo off\r\nsetlocal\r\nset "PDFZEN_PROJECT=${projectDir.replace(/"/g, '""')}"\r\nbun run --cwd ${cmdQuote("%PDFZEN_PROJECT%") } scripts/dev.ts %*\r\n`;
    await writeFile(cmdPath, script, "utf8");

    await updateWindowsUserPath(binDir);
    success(`Created launcher: ${cmdPath}`);
    success("Install complete. Open a new terminal and run: pdfzen");
    return;
  }

  let binDir = "";
  const pathValue = process.env.PATH ?? "";
  for (const candidate of ["/opt/homebrew/bin", "/usr/local/bin"]) {
    if (pathHasEntry(pathValue, candidate) && existsSync(candidate)) {
      try {
        const testFile = resolve(candidate, ".pdfzen-write-test");
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

  const launcherPath = resolve(binDir, "pdfzen");
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
  console.log("\nPDFZen is starting!\nPress Ctrl+C to stop\n");
  await execOrFail(["bun", "run", "dev"], { cwd: projectDir });
}

async function runBackend(args: string[]): Promise<void> {
  const venvPython = getVenvPythonPath();
  if (!existsSync(venvPython)) {
    warning("Backend virtual environment not found. Running setup first...");
    await runSetup();
  }

  await execOrFail([venvPython, resolve(backendDir, "pdfzen_backend.py"), ...args], {
    cwd: backendDir,
  });
}

function printBanner(): void {
  console.log("\n╔════════════════════════════════════╗");
  console.log("║       PDFZen Dev Environment       ║");
  console.log("╚════════════════════════════════════╝\n");
}

function printUsage(): void {
  console.log(`Usage: bun run scripts/dev.ts [command]

Commands:
  setup    Install backend/frontend dependencies
  install  Setup and install global "pdfzen" command
  backend  Run backend CLI directly
  ui       Run UI only
  help     Show this message

Default:
  Runs dependency checks + setup, then starts the UI.`);
}

async function main(): Promise<void> {
  printBanner();

  const [command = "", ...rest] = process.argv.slice(2);

  switch (command) {
    case "setup":
      await runSetup();
      success("Setup complete! Run 'bun run dev:all' to start.");
      break;
    case "install":
      await runSetup();
      await installGlobalCommand();
      break;
    case "backend":
      await runBackend(rest);
      break;
    case "ui":
      await execOrFail(["bun", "run", "dev"], { cwd: projectDir });
      break;
    case "help":
    case "-h":
    case "--help":
      printUsage();
      break;
    case "":
      await runSetup();
      await startUi();
      break;
    default:
      warning(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

await main();
