import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import webWorkerLoader from "rollup-plugin-web-worker-loader";

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

export default [
	// browser-friendly UMD build
	{
		input: 'src/vosk.ts',
		output: {
			name: 'Vosk',
			dir: 'dist',
			format: 'umd',
		},
		plugins: [
			resolve({ extensions, browser: true }),
            commonjs(),
			webWorkerLoader({
				forceInline: true,
				targetPlatform: 'browser'
			  }),
			typescript({
				typescript: require('typescript'),
			}),
		]
	},
];
