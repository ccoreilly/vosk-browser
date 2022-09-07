// Copyright 2020 Denis Treskunov

'use strict'

var VoskJS = (function() {
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
    function getFullUrlRelativeToCurrentScript(url = '') {
        return new URL(url, currentScript)
    }

    class BaseMicrophoneProcessor {
        // Chrome only allows using audio after user interaction
        // see https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
        constructor() {
            this._active = Promise.resolve(false)
            this._context = null
            this._stream = null
            this._nodes = null
        }
        /**
         * @param {AudioContext} context
         * @returns {AudioNode[]}
         */
        createIntermediateNodes(context) {
            return []
        }
        getActive() {
            return this._active
        }
        setActive(active) {
            this._active = new Promise((resolve, reject) => {
                (active ? this._start() : this._stop())
                .then(() => resolve(active))
                .catch(e => reject(e))
            })
            return this._active
        }
        /**
         * 
         * @param {Boolean} connect 
         * @param {AudioNode[]} nodes 
         */
        static _connectAudioNodesInSequence(connect, nodes) {
            for (let i=0; i<nodes.length - 1; i++) {
                const src = nodes[i]
                const dst = nodes[i+1]
                if (connect)
                    src.connect(dst)
                else
                    src.disconnect(dst)
            }
        }
        _stop() {
            // The spec states that: "Any AudioNodes which are connected in a cycle
            // and are directly or indirectly connected to the AudioDestinationNode
            // of the AudioContext will stay alive as long as the AudioContext is alive."
            // w3.org/TR/webaudio/#lifetime-AudioNode
            if (this._nodes) {
                BaseMicrophoneProcessor._connectAudioNodesInSequence(false, this._nodes)
                this._nodes = null
            }
            if (this._stream) {
                this._stream.getTracks().forEach(track => track.stop())
                this._stream = null
            }
            if (this._context) {
                this._context = null
            }
            return Promise.resolve()
        }
        _start() {
            return navigator.mediaDevices.getUserMedia({
                audio: {channelCount: 1},
                video: false
            }).then(stream => {
                this._stream = stream
                this._context = new AudioContext()
    
                // connecting processorNode to destination was required to get it working in Chrome
                this._nodes = [
                    this._context.createMediaStreamSource(this._stream),
                    ...this.createIntermediateNodes(this._context),
                    this._context.destination,
                ]
                BaseMicrophoneProcessor._connectAudioNodesInSequence(true, this._nodes)
            })
        }
    }
    
    class WorkerClient {
        constructor(workerUrl) {
            this._worker = this._createWorker(workerUrl)
            const _this = this
            this._worker.onmessage = event => _this._onmessage(event)
            this._messageIdsequence = 0
            this._inflightMessages = new Map() // maps messageId to [resolve, reject] pair
        }
        callWorkerMethod(method, ...params) {
            this._worker.postMessage({method, params})
        }
        callWorkerMethodAndWait(method, ...params) {
            const messageId = (this._messageIdsequence += 1)
            this._worker.postMessage({method, params, messageId})
            const promise = new Promise((resolve, reject) => {
                this._inflightMessages.set(messageId, [resolve, reject])
            })
            return promise
        }
        handleWorkerMessage(_data) {
            // to be overridden
        }
        _createWorker(url) {
            try {
                return new Worker(url)
            } catch (e) {
                // https://benohead.com/blog/2017/12/06/cross-domain-cross-browser-web-workers/
                console.debug(`Unable to create Worker('${url}'). Trying to work around cross-domain restriction.`, e)
                const blob = new Blob(
                    [`var CURRENT_SCRIPT='${url}';importScripts('${url}');`],
                    {type: 'application/javascript'})
                const blobUrl = URL.createObjectURL(blob)
                return new Worker(blobUrl)
            }
        }
        _onmessage(event) {
            // console.debug('WorkerClient: received event.data', event.data)
            var {result, error, messageId} = event.data
            if (messageId) {
                let inflightMessage = this._inflightMessages.get(messageId)
                if (inflightMessage) {
                    this._inflightMessages.delete(messageId)
                    let [resolve, reject] = inflightMessage
                    if (error) {
                        reject(error)
                    } else {
                        resolve(result)
                    }
                } else {
                    console.warn(`WorkerClient: received unexpected message ${messageId}`)
                }
            } else {
                this.handleWorkerMessage(event.data)
            }
        }
    }
    
    class WorkerServer {
        constructor() {
            const _this = this
            onmessage = event => _this.onmessage(event)
        }
        onmessage(event) {
            // console.debug('WorkerServer: received event.data', event.data)
            let {method, params, messageId} = event.data
            try {
                let _method = this[method]
                if (typeof(_method) !== 'function') {
                    throw new Error(`WorkerServer: method '${method}' not found`)
                }
                let result = _method.apply(this, params)
                if (result instanceof Promise) {
                    result
                        .then(actualResult => postMessage({messageId, result: actualResult}))
                        .catch(actualError => postMessage({messageId, error: actualError}))
                } else if (typeof(result) !== 'undefined' || typeof(messageId) !== 'undefined') {
                    postMessage({result, messageId})
                }
            } catch (error) {
                postMessage({error, messageId})
            }
        }
    }
    
    class Recognizer extends BaseMicrophoneProcessor {
        constructor(modelUrl, preload=true) {
            super()
    
            const workerUrl = getFullUrlRelativeToCurrentScript()
            workerUrl.searchParams.set('worker', 'true')
            workerUrl.searchParams.set('modelUrl', getFullUrlRelativeToCurrentScript(modelUrl))
            this._workerClient = new WorkerClient(workerUrl)
            const _this = this
            this._preload = preload
            this._workerClient.handleWorkerMessage = data => _this.handleWorkerMessage(data)
            if (this._preload) {
                this._workerClient.callWorkerMethod('start')
            }
        }
        handleWorkerMessage(data) {
            const {result} = data
            if (typeof(result) === 'object' && (result.partial || result.text)) {
                this.onresult(result)
            }
        }
        onresult(result) {
            console.debug('Recognizer: got result', result)
        }
        _start() {
            return this._workerClient.callWorkerMethodAndWait('start').then(() => super._start())
        }
        _stop() {
            return super._stop().then(() => {
                if (!this._preload) {
                    this._workerClient.callWorkerMethodAndWait('stop')
                }
            })
        }
        /**
         * @param {AudioContext} context
         * @returns {AudioNode[]}
         */
        createIntermediateNodes(context) {
            // Kaldi expects each sample to be a floating point number between -32768 and 32767 (range of signed Int16)
            // However, web audio samples are represented as floating point numbers between -1.0 and 1.0
            const gainNode = context.createGain()
            gainNode.gain.value = 0x8000
    
            // output channel is unused but needed to receive onaudioprocess events in Chrome
            const processorNode = context.createScriptProcessor(4096, 1, 1)
            processorNode.onaudioprocess = e => {
                try {
                    this.processAudioBuffer(e.inputBuffer)
                } catch (e) {
                    console.error('processAudioBuffer failed, stopping', e)
                    this._stop();
                }
            }
            return [gainNode, processorNode]
        }
        /**
         * @param {AudioBuffer} buffer 
         */
        processAudioBuffer(buffer) {
            if (buffer.numberOfChannels < 1) {
                throw new Error(`AudioProcessingEvent contained ${buffer.numberOfChannels} channels`);
            }
            const data = buffer.getChannelData(0);
            if (!(data instanceof Float32Array)) {
                throw new Error(`Channel data is not a Float32Array as expected: ${data}`);
            }
            this._workerClient.callWorkerMethod('processAudioChunk', {
                data: data,
                sampleRate: buffer.sampleRate,
                duration: buffer.duration,
            }, [data.buffer])
            // last param passes ownership of Transferable object data.buffer to the worker
            // data.buffer.byteLength becomes zero after postMessage()
        }
    }
    
    class RecognizerWorker extends WorkerServer {
        constructor(modelUrl) {
            super()
            console.debug(`RecognizerWorker: constructed with modelUrl=${modelUrl}`)
            importScripts(getFullUrlRelativeToCurrentScript('vosk.js'))
            this._Vosk = null
            this._modelUrl = modelUrl
            this._bufferAddr = null // address of buffer on the heap, has to be _malloc/_free-d
            this._bufferSize = null
            this._model = null
            this._recognizer = null
            this._determineRunning = Promise.resolve(false)
        }
        start() {
            this._determineRunning = this._determineRunning.then(running => {
                if (running) {
                    return true
                }
                console.debug('RecognizerWorker: starting')
                const storagePath = '/vosk'
                const modelPath = storagePath + '/' + this._modelUrl.replace(/[\W]/g, '_')
                return new Promise((resolve, reject) => LoadVosk().then(loaded => {
                    this._Vosk = loaded
                    resolve()
                }))
                .then(() => {
                    console.debug('Setting up persistent storage at ' + storagePath)
                    this._Vosk.FS.mkdir(storagePath)
                    this._Vosk.FS.mount(this._Vosk.IDBFS, {}, storagePath)
                    return this._Vosk.syncFilesystem(true)
                })
                .then(() => {
                    return this._Vosk.downloadAndExtract(this._modelUrl, modelPath)
                })
                .then(() => {
                    return this._Vosk.syncFilesystem(false)
                })
                .then(() => {
                    this._model = new this._Vosk.Model(modelPath)
                    console.debug(`RecognizerWorker: new Model()`)
                })
                .then(() => {
                    return true
                })
            })
            return this._determineRunning
        }
        stop() {
            this._determineRunning = this._determineRunning.then(running => {
                if (running) {
                    console.debug('RecognizerWorker: stopping')
                    if (this._recognizer) {
                        postMessage({result: JSON.parse(this._recognizer.FinalResult())})
                        this._recognizer.delete()
                        this._recognizer = null
                        console.debug('RecognizerWorker: ~Recognizer()')
                    }
                    if (this._model) {
                        this._model.delete()
                        this._model = null
                        console.debug('RecognizerWorker: ~Model()')
                    }
                    this._freeBuffer()
                }
                return false
            })
            return this._determineRunning
        }
        _allocateBuffer(size) {
            if (this._bufferAddr !== null && this._bufferSize === size) {
                return
            }
            this._freeBuffer()
            this._bufferAddr = this._Vosk._malloc(size)
            this._bufferSize = size
            console.debug(`RecognizerWorker: allocated buffer of ${this._bufferSize} bytes`);
        }
        _freeBuffer() {
            if (this._bufferAddr === null) {
                return
            }
            this._Vosk._free(this._bufferAddr)
            console.debug(`RecognizerWorker: freed buffer of ${this._bufferSize} bytes`);
            this._bufferAddr = null
            this._bufferSize = null
        }
        processAudioChunk({data, sampleRate, duration}) {
            if (this._recognizer === null) {
                this._recognizer = new this._Vosk.Recognizer(this._model, sampleRate)
                console.debug(`RecognizerWorker: new Recognizer (sampleRate=${sampleRate})`)
            }
            const requiredSize = data.length * data.BYTES_PER_ELEMENT
            this._allocateBuffer(requiredSize)
            this._Vosk.HEAPF32.set(data, this._bufferAddr / data.BYTES_PER_ELEMENT)
            let json
            if (this._recognizer.AcceptWaveform(this._bufferAddr, data.length)) {
                json = this._recognizer.Result()
            } else {
                json = this._recognizer.PartialResult()
            }
            return JSON.parse(json)
        }
    }

    if (typeof(HTMLElement) !== 'undefined' && typeof(customElements) !== 'undefined') {
        // undefined in worker context
        class WCRecognizer extends HTMLElement {
            connectedCallback () {
                const modelUrl = this.getAttribute('model-url')
                if (!modelUrl) {
                    throw new Error('model-url attribute is required')
                }
                // whether to stop automatically after a completed utterance
                this._oneshot = this.hasAttribute('oneshot')
                this._recognizer = new Recognizer(modelUrl)
                const template = document.createElement('template')
                template.innerHTML = WCRecognizer.template()
                this.attachShadow({ mode: 'open' })
                this.shadowRoot.appendChild(template.content.cloneNode(true))
                const textElement = this.shadowRoot.querySelector('#text')
                const buttonElement = this.shadowRoot.querySelector('#startStop')

                const updateButton = active => {
                    buttonElement.textContent = (active ? 'Stop' : 'Start')
                    buttonElement.disabled = false
                }

                buttonElement.addEventListener('click', () => {
                    buttonElement.disabled = true
                    this._recognizer.getActive()
                        .then(active => this._recognizer.setActive(!active))
                        .then(updateButton)
                        .catch(e => {
                            console.error(e)
                        })
                })

                this._recognizer.onresult = result => {
                    if (result.partial) {
                        textElement.classList.add('partial')
                        textElement.classList.remove('complete')
                        textElement.textContent = result.partial
                    }
                    if (result.result) {
                        console.debug(result)
                        textElement.classList.remove('partial')
                        textElement.classList.add('complete')
                        textElement.textContent = ''
                        result.result.forEach((x, i, arr) => {
                            const wordElement = document.createElement('span')
                            wordElement.textContent = x.word
                            wordElement.classList.add('word')
                            if (x.conf === 1.0) {
                                wordElement.classList.add('confidence-high')
                            } else if (x.conf > 0.9) {
                                wordElement.classList.add('confidence-medium')
                            } else {
                                wordElement.classList.add('confidence-low')
                            }
                            textElement.appendChild(wordElement)
                            if (i < arr.length) {
                                textElement.appendChild(document.createTextNode(' '))
                            }
                        })
                        if (this._oneshot) {
                            this._recognizer.setActive(false).then(updateButton)
                        }
                    }
                    this.dispatchEvent(new CustomEvent('vosk-recognizer-result', {detail: result}))
                }
            }
            static template () {
                return `
                    <style>
                        .confidence-medium {
                            text-decoration: dotted underline;
                        }
                        .confidence-low {
                            text-decoration: dotted underline;
                            text-decoration-color: red;
                        }
                        .partial::after {
                            content: "\\2026";
                        }
                        * {
                            font-size: var(--font-size, 1rem);
                        }
                    </style>
                    <button id="startStop">Start</button>
                    <span id="text"></span>
                `
            }
        }
        customElements.define('vosk-recognizer', WCRecognizer)
    }
    
    // this is similar to POSIX fork() - same code is loaded in two different threads
    // Here we detect if we are inside the worker context
    const searchParams = getFullUrlRelativeToCurrentScript().searchParams
    if (searchParams.get('worker') === 'true') {
        const modelUrl = searchParams.get('modelUrl')
        const worker = new RecognizerWorker(modelUrl)
    }

    return {Recognizer}
})()
