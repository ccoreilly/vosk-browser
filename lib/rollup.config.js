import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import webWorkerLoader from "rollup-plugin-web-worker-loader";
import { wasm } from "@rollup/plugin-wasm";

const extensions = [".js", ".jsx", ".ts", ".tsx"];

export default [
  // browser-friendly UMD build
  {
    input: ["src/vosk.ts"],
    output: {
      name: "Vosk",
      dir: "dist",
      format: "es",
    },
    plugins: [
      resolve({ extensions, browser: true }),
      commonjs(),
      webWorkerLoader({
        inline: true,
        targetPlatform: "auto",
        preserveFileNames: true,
      }),
      typescript({
        typescript: require("typescript"),
      }),
      wasm(),
    ],
  },
];
