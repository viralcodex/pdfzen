import wasmPath from "../assets/mupdf-wasm.wasm" with { type: "file" };

type MupdfModuleConfig = {
  wasmBinary: Uint8Array;
};

const globalWithMupdfConfig = globalThis as typeof globalThis & {
  $libmupdf_wasm_Module?: MupdfModuleConfig;
};

if (!globalWithMupdfConfig.$libmupdf_wasm_Module) {
  globalWithMupdfConfig.$libmupdf_wasm_Module = {
    wasmBinary: new Uint8Array(await Bun.file(wasmPath).arrayBuffer()),
  };
}

const mupdf = (await import("mupdf")).default;

export default mupdf;
