# Vosk-Browser
A somewhat opinionated speech recognition library for the browser using a WebAssembly build of [Vosk](https://github.com/alphacep/vosk-api)

This library picks up the work done by [Denis Treskunov](https://github.com/dtreskunov/tiny-kaldi/tree/js) and packages an updated Vosk WebAssembly build as an easy-to-use browser library.

> Note: WebAssembly builds can target NodeJS, the browser's main thread or web workers. This library explicitly compiles Vosk to be used in a WebWorker context. If you want to use Vosk in a NodeJS application it is recommended to use the official [node bindings](https://www.npmjs.com/package/vosk).

## Live Demo

Checkout the demo running in-browser speech recognition of microphone input or audio files in 13 languages.

<div align="center">
<a href="https://ccoreilly.github.io/vosk-browser/">Vosk-Browser Live Demo</a>
</div>

## Installation

You can install vosk-browser as a module:

```
$ npm i vosk-browser
```

You can also use a CDN like jsdelivr to add the library to your page, which will be accessible via the global variable `Vosk`:

```
<script type="application/javascript" src="https://cdn.jsdelivr.net/npm/vosk-browser@0.0.5/dist/vosk.js"></script>
```

## Usage

See the [README](./lib/README.md) in `./lib` for API reference documentation or check out the [examples](./examples) folder for some ways of using the library

### Basic example

One of the simplest examples that assumes `vosk-browser` is loaded via a `script` tag. It loads the model named `model.tar.gz`located in the same path as the script and starts listening to the microphone. Recognition results are logged to the console.

```
async function init() {
    const model = await Vosk.createModel('model.tar.gz');

    const recognizer = new model.KaldiRecognizer();
    recognizer.on("result", (message) => {
        console.log(`Result: ${message.result.text}`);
    });
    recognizer.on("partialresult", (message) => {
        console.log(`Partial result: ${message.result.partial}`);
    });
    
    const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate: 16000
        },
    });
    
    const audioContext = new AudioContext();
    const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1)
    recognizerNode.onaudioprocess = (event) => {
        try {
            recognizer.acceptWaveform(event.inputBuffer)
        } catch (error) {
            console.error('acceptWaveform failed', error)
        }
    }
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(recognizerNode);
}

window.onload = init;
```

## Todos

- Write tests
- Automate npm publish