// Copyright 2020 Denis Treskunov

// https://emscripten.org/docs/api_reference/module.html#Module.preRun
var Module = (function(Module) {
    function determineCurrentScript() {
        if (typeof(document) !== 'undefined') {
            return document.currentScript.src
        }
        // we must be in a worker context
        if (typeof(self.CURRENT_SCRIPT) === 'string') {
            // if loaded from a Blob, this global variable should have been defined
            return self.CURRENT_SCRIPT
        }
        // otherwise, we can get the location where this script was loaded from like so
        return location.href
    }
    const currentScript = determineCurrentScript()

    // https://emscripten.org/docs/api_reference/module.html#Module.locateFile
    function locateFile(path, prefix) {
        const url = new URL(prefix + path, currentScript)
        return url.toString()
    }

    return Object.assign(Module, {
        'locateFile': locateFile,
    })
})(Module || {})

