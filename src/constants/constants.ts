import { homedir } from "os";
import path from "path";

export const OUTPUT_DIR = path.join(homedir(), "Documents", "PDFZen");

export const toolsMenu = [
  { name: "Merge PDFs", command: "merge" },
  { name: "Split PDF", command: "split" },
  { name: "Compress PDF", command: "compress" },
  { name: "Rotate PDF", command: "rotate" },
  { name: "Delete Pages", command: "delete" },
  { name: "PDF to Images", command: "pdf-to-images" },
  { name: "Images to PDF", command: "images-to-pdf" },
  { name: "Protect PDF", command: "protect" },
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
