import wasmPath from "../assets/mupdf-wasm.wasm" with { type: "file" };

type MupdfModuleConfig = {
  wasmBinary: Uint8Array;
  printErr?: (message: string) => void;
};

export const shouldSuppressMupdfDiagnostic = (message: string) => {
  const normalized = message.trim().toLowerCase();

  return normalized.includes("garbage bytes before version marker");
};

const globalWithMupdfConfig = globalThis as typeof globalThis & {
  $libmupdf_wasm_Module?: MupdfModuleConfig;
};

if (!globalWithMupdfConfig.$libmupdf_wasm_Module) {
  globalWithMupdfConfig.$libmupdf_wasm_Module = {
    wasmBinary: new Uint8Array(await Bun.file(wasmPath).arrayBuffer()),
    printErr: (message: string) => {
      if (shouldSuppressMupdfDiagnostic(message)) {
        return;
      }

      console.error(message);
    },
  };
}

const mupdf = (await import("mupdf")).default;

export default mupdf;
