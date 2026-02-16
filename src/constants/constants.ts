import { homedir } from "os";
import path from "path";

export const OUTPUT_DIR = path.join(homedir(), "Documents", "PDFZen");

export const toolsMenu = [
  { name: "Merge PDFs", command: "merge" },
  { name: "Split PDF", command: "split" },
  { name: "Compress PDF", command: "compress" },
  { name: "Rotate PDF", command: "rotate" },
  { name: "Delete Pages", command: "delete" },
  { name: "PDF to Images", command: "pdfToImages" },
  { name: "Images to PDF", command: "imagesToPDF" },
  { name: "Encrypt PDF", command: "protect" },
];

export const EmptyBorderChars = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
  horizontal: "",
};

export const osaScript = `set theFiles to choose file of type {{{type}}} with prompt "Select files" with multiple selections allowed\n set output to ""\n repeat with f in theFiles\n set output to output & POSIX path of f & "\\n"\n end repeat\n return output\n`;

export const windowsScript = `Add-Type -AssemblyName System.Windows.Forms; $ofd = New-Object System.Windows.Forms.OpenFileDialog; $ofd.Filter = "{{type}}"; $ofd.Multiselect = $true; if ($ofd.ShowDialog() -eq "OK") { $ofd.FileNames -join "\\n" }`;

export const linuxScript = `zenity --file-selection --title="Select PDF files" --file-filter="{{type}}" --multiple --separator="\n"`;