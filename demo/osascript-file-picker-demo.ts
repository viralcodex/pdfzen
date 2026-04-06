/**
 * Simple osascript file picker demo for macOS
 * Run: bun scripts/osascript-file-picker-demo.ts
 */

import { $ } from "bun";

// Pick files (returns array of paths)
async function pickFiles(types?: string[], multiple = true): Promise<string[]> {
  const typeFilter = types ? ` of type {${types.map((t) => `"${t}"`).join(", ")}}` : "";
  const multiFlag = multiple ? " with multiple selections allowed" : "";

  const script = `
    try
      set f to choose file${typeFilter}${multiFlag}
      if class of f is list then
        set o to ""
        repeat with x in f
          set o to o & POSIX path of x & linefeed
        end repeat
        return o
      else
        return POSIX path of f
      end if
    on error number -128
      return ""
    end try
  `;

  const result = await $`osascript -e ${script}`.text();
  return result.trim().split("\n").filter(Boolean);
}

// Pick folder (returns path or null)
async function pickFolder(): Promise<string | null> {
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

// Save dialog (returns path or null)
async function saveDialog(defaultName = "Untitled"): Promise<string | null> {
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

// Demo
async function main() {
  console.log("=== File Picker Demo ===\n");

  console.log("1. Select PDF files...");
  console.log("   Selected:", await pickFiles(["pdf"]));

  console.log("\n2. Select images...");
  console.log("   Selected:", await pickFiles(["png", "jpg", "jpeg"]));

  console.log("\n3. Select folder...");
  console.log("   Selected:", await pickFolder());

  console.log("\n4. Save dialog...");
  console.log("   Selected:", await saveDialog("output.pdf"));

  console.log("\n=== Done ===");
}

main();
