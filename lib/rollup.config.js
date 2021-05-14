import { readFileSync, realpathSync } from 'fs';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import webWorkerLoader from "rollup-plugin-web-worker-loader";
import url from '@rollup/plugin-url';

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
				skipPlugins: ['url']
			}),
			typescript({
				typescript: require('typescript'),
			}),
			// url({
			// 	include: "**/recognizer-worklet-processor*"
			// })
			{
				name: 'file-as-blob',

				intro: function () {
					return `function __$strToBlobUri(str, mime, isBinary) {
						try {
							return window.URL.createObjectURL(
								new Blob([Uint8Array.from(
									str.split('').map(function(c) {return c.charCodeAt(0)})
								)], {type: mime})
							);
						} catch (e) {
							return "data:" + mime + (isBinary ? ";base64," : ",") + str;
						}
					}`.split('\n').map(Function.prototype.call, String.prototype.trim).join('');
				},

				load ( id ) {
					if ( !id.endsWith('recognizer-worklet-processor.js') ) { return null; }

					id = realpathSync(id);

					return new Promise((res)=> {

						const mime = 'application/javascript'
						const charset = 'utf-8'

						var readEncoding = 'base64';
						if (charset === 'utf-8') readEncoding = 'utf8';
						if (charset.indexOf('ascii') !== -1) readEncoding = 'ascii';

						let data = readFileSync( id, readEncoding );

						var code;
						if (readEncoding === 'base64') {
							code = `export default __$strToBlobUri(atob("${data}"), "${mime}", true);`;
						} else {
							// Unfortunately buble+rollup will create code that chokes
							// with newlines/quotes when the contents are read from
							// a file
							data = data.replace(/\n/g, '\\n')
									.replace(/\r/g, '\\r')
									.replace(/"/g, '\\"')
									.replace(/sourceMappingURL/g, 'sourceMap" + "pingURL');
							code = "export default __$strToBlobUri(\"" + data + "\", \"" + mime + "\", false);";
						}

						return res({ code: code, map: { mappings: '' } });
					});
				}
			}
		]
	},
];
