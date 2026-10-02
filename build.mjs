import { rm } from "node:fs/promises";
import ts from "typescript";
import { build } from "vite-plus/pack";

const shared = {
  config: false,
  outDir: "dist",
  platform: "neutral",
  fixedExtension: false,
  hash: false,
  minify: false,
  // Shiki is baked into the package. Svelte stays external (type-only today).
  deps: {
    neverBundle: ["svelte"],
    onlyBundle: false,
  },
};

// One entry per build so dynamic Shiki imports stay in a single file.
await build({
  ...shared,
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outputOptions: {
    codeSplitting: false,
  },
});

await build({
  ...shared,
  entry: { "copy-action": "src/copy-action.ts" },
  format: ["esm", "cjs"],
  // Svelte's `Action` is type-only. The declaration bundler treats that import
  // as a missing runtime export, so this file is emitted with tsc below.
  dts: false,
  clean: false,
});

emitCopyActionDeclarations();

// Package exports point at dist/index.d.ts. The CJS declaration twin is unused.
await rm("dist/index.d.cts", { force: true });

function emitCopyActionDeclarations() {
  const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    throw new Error("Could not find tsconfig.json");
  }

  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) {
    throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, "\n"));
  }

  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, "./");
  const program = ts.createProgram({
    rootNames: ["src/copy-action.ts"],
    options: {
      ...parsed.options,
      noEmit: false,
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: false,
      outDir: "dist",
      rootDir: "src",
    },
  });
  const result = program.emit();
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);

  if (diagnostics.length > 0) {
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => "\n",
      }),
    );
  }

  if (
    result.emitSkipped ||
    diagnostics.some((item) => item.category === ts.DiagnosticCategory.Error)
  ) {
    throw new Error("Declaration emit failed");
  }
}
