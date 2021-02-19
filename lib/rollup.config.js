import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import webWorkerLoader from "rollup-plugin-web-worker-loader";
import pkg from './package.json';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

export default [
	// browser-friendly UMD build
	{
		input: 'src/index.ts',
		output: {
			name: 'Vosk',
			dir: 'dist',
			file: pkg.browser,
			format: 'umd'
		},
		plugins: [
			resolve({ extensions, browser: true }),
            commonjs(),
			webWorkerLoader({
				forceInline: true,
			  }),
			typescript({
				typescript: require('typescript'),
			}),
		]
	},
];
