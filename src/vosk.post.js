// Copyright 2020 Denis Treskunov

// Some useful functions that don't affect the runtime
// Has to be ES6 compliant (if you want to compile with --closure). Can't use async.
// See:
// http://es6-features.org
// https://emscripten.org/docs/api_reference/module.html#Module.postRun
// https://github.com/emscripten-core/emscripten/blob/master/tools/acorn-optimizer.js
(function() {
    'use strict';

    /**
     * When you can't use async/await, use generator control-flow
     * @see http://es6-features.org/#GeneratorControlFlow
     * @param {Generator} generator 
     * @param  {...any} params 
     */
    function async(generator, ...params) {
        let iterator = generator(...params);
        return new Promise((resolve, reject) => {
            function loop(value) {
                let result;
                try {
                    result = iterator.next(value);
                } catch (err) {
                    reject(err);
                }
                if (result.done) {
                    resolve(result.value);
                } else if (typeof result.value      === 'object'
                        && typeof result.value.then === 'function') {
                    // walks like a Promise, talks like a Promise
                    result.value.then((value) => {
                        loop(value);
                    }, (err) => {
                        reject(err);
                    });
                } else {
                    loop(result.value);
                }
            }
            loop();
        });
    }

    function writeStreamToFile(reader, file, length = undefined) {
        return async(function*() {
            let bytesWritten = 0;
            while (true) {
                var {done, value} = yield reader.read();
                if (done) {
                    return bytesWritten;
                }
                if (value instanceof Uint8Array) {
                    FS.write(file, value, 0, value.length);
                    bytesWritten = bytesWritten + value.length;
                    if (length) {
                        console.debug(`${Math.round(100*bytesWritten/length)}% (${bytesWritten} of ${length} bytes)`);
                    } else {
                        console.debug(`${bytesWritten} bytes`);
                    }
                } else {
                    throw new Error('read() returned value in unexpected format');
                }
            }
        });
    }

    /**
     * @param {String} url 
     * @param {String} path 
     * @return {Promise}
     */
    function download(url, path) {
        return async(function*() {
            console.debug(`Attempting to download from ${url}`);
            let response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contentLength = parseInt(response.headers.get('Content-Length'));
            const lastSlashIdx = path.lastIndexOf('/');
            const dir = path.substring(0, lastSlashIdx);
            if (dir !== '') {
                console.debug(`Ensuring ${dir} is a valid directory`);
                FS.mkdirTree(dir);
            }
            console.debug(`Writing response to ${path}, Content-Length: ${contentLength}`);
            const file = FS.open(path, 'w');
            try {
                yield writeStreamToFile(response.body.getReader(), file, contentLength);
            } finally {
                FS.close(file);
            }
        });
    }

    function extract(archivePath, outputPath, stripFirstComponent) {
        return new Promise(function(resolve, reject) {
            let helper = Module.ArchiveHelper.implement({
                onsuccess: resolve,
                onerror: reject
            });
            helper.Extract(archivePath, outputPath, stripFirstComponent);
        });
    }

    function isFile(path) {
        try {
            let fileStat = FS.stat(path);
            return FS.isFile(fileStat.mode);
        } catch(e) {
            return false;
        }
    }

    function touchFile(path) {
        FS.close(FS.open(path, 'a'));
    }

    function downloadAndExtract(url, localPath) {
        return async(function*() {
            const extractedOk = localPath + '/extracted.ok';
            if (isFile(extractedOk)) {
                console.debug(`${localPath} was found cached`);
                return;
            }
            const archivePath = localPath + '/downloaded.tar.gz';
            const downloadedOk = localPath + '/downloaded.ok';
            if (isFile(downloadedOk)) {
                console.debug(`Archive was found already downloaded to ${localPath}`);
            } else {
                yield download(url, archivePath);
                touchFile(downloadedOk);
            }
            yield extract(archivePath, localPath, true);
            FS.unlink(archivePath);
            FS.unlink(downloadedOk);
            touchFile(extractedOk);
        });
    }

    function syncFilesystem(fromPersistent) {
        return new Promise((resolve, reject) =>
            FS.syncfs(fromPersistent, err => {
                if (err) {
                    reject('Failed to sync file system: ' + err);
                } else {
                    console.debug('File system synced ' +
                        (fromPersistent ? 'from host to runtime' : 'from runtime to host'));
                    resolve();
                }
            })
        )
    }

    // It should be possible to replace FS-symbols by specifying
    // "-s RUNTIME_EXPORTS=['FS', ...]" in the Makefile, once the base Docker
    // image (based on dockcross/web-wasm) is updated to contain Emscripten
    // commit 2f6cf395 (>= 1.39.8)
    // 1. https://hub.docker.com/r/dockcross/web-wasm/tags
    // 2. https://github.com/emscripten-core/emscripten/commit/2f6cf395
    // 3. https://github.com/emscripten-core/emscripten/pull/10368
    // 4. https://github.com/emscripten-core/emscripten/issues/10317
    Object.assign(Module, {
        'FS': FS,
        'MEMFS': MEMFS,
        'NODEFS': NODEFS,
        'IDBFS': IDBFS,
        'WORKERFS': WORKERFS,
        'downloadAndExtract': downloadAndExtract,
        'syncFilesystem': syncFilesystem,
    });
})();
