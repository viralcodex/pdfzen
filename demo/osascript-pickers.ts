import { $ } from "bun";

// ─── Usage Example ──────────────────────────────────────────────────────────
// const files = await pickFiles();
// const folder = await pickFolder();
// const savePath = await saveFileDialog("output.png");

export async function pickFiles(): Promise<string[]> {
  const script = `set theFiles to choose file of type {{{type}}} with prompt "Select files" with multiple selections allowed
    set output to ""
    repeat with f in theFiles
      set output to output & POSIX path of f & "\\n"
    end repeat
    return output`;

  const result = await $`osascript -e ${script.replace("{{{type}}}", "public.item")}`.text();
  return result.trim().split("\n").filter(Boolean);
}

export async function pickFolder(): Promise<string | null> {
  const script = `
    try
      return POSIX path of (choose folder)
    on error number -128
      return ""
    end try
  `;
  const result = (await $`osascript -e ${script}`.text()).trim();
  return result || null;
}

// ─── Save File Dialog ───────────────────────────────────────────────────────
export async function saveFileDialog(defaultName = "Untitled"): Promise<string | null> {
  const script = `
    try
      return POSIX path of (choose file name default name "${defaultName}")
    on error number -128
      return ""
    end try
  `;
  const result = (await $`osascript -e ${script}`.text()).trim();
  return result || null;
}
