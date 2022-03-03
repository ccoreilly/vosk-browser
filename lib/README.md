# Vosk-Browser
A somewhat opinionated speech recognition library for the browser using a WebAssembly build of [Vosk](https://github.com/alphacep/vosk-api)

## Live Demo

Checkout the demo running in-browser speech recognition of microphone input or audio files in 13 languages.

[Vosk-Browser Live Demo](https://ccoreilly.github.io/vosk-browser/)

## Installation

You can install vosk-browser as a module:

```
$ npm i vosk-browser
```

You can also use a CDN like jsdelivr to add the library to your page, which will be accessible via the global variable `Vosk`:

```
<script type="application/javascript" src="https://cdn.jsdelivr.net/npm/vosk-browser@0.0.3/dist/vosk.js"></script>
```

## Basic example

One of the simplest examples that assumes `vosk-browser` is loaded via a `script` tag. It loads the model named `model.tar.gz`located in the same path as the script and starts listening to the microphone. Recognition results are logged to the console.

```typescript
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
## Model format

The library loads models as gzipped tar archives of a model folder following the model structure expected by Vosk.

- model/am/final.mdl - acoustic model
- model/conf/mfcc.conf - mfcc config file. Make sure you take mfcc_hires.conf version if you are using hires model (most external ones)
- model/conf/model.conf - provide default decoding beams and silence phones. you have to create this file yourself, it is not present in kaldi model
- model/ivector/final.dubm - take ivector files from ivector extractor (optional folder if the model is trained with ivectors)
- model/ivector/final.ie
- model/ivector/final.mat
- model/ivector/splice.conf
- model/ivector/global_cmvn.stats
- model/ivector/online_cmvn.conf
- model/graph/phones/word_boundary.int - from the graph
- model/graph/HCLG.fst - this is the decoding graph, if you are not using lookahead
- model/graph/HCLr.fst - use Gr.fst and HCLr.fst instead of one big HCLG.fst if you want to run rescoring
- model/graph/Gr.fst
- model/graph/phones.txt - from the graph
- model/graph/words.txt - from the graph
- model/rescore/G.carpa - carpa rescoring is optional but helpful in big models. Usually located inside data/lang_test_rescore
- model/rescore/G.fst - also optional if you want to use rescoring

# Reference

## Model

```typescript
new Model(modelUrl: string): Model
```

The Model constructor. Creates a new Model that will spawn a new Web Worker in the background. `modelUrl` can be a relative or absolute URL but be aware that CORS also applies to Workers. As Model initialization can take a while depending on the model size, you should either wait for the `load` event or use the `createModel` function.

### Model#ready

```typescript
ready: boolean;
```

A property that specifies if the model is loaded and ready.

### Model#KaldiRecognizer

```typescript
new model.KaldiRecognizer(): KaldiRecognizer
```

Creates a new KaldiRecognizer. Multiple recognizers can be created from the same model

### Model#setLogLevel

```typescript
setLogLevel(level: number): void
```

Sets the log level:
-2: Error
-1: Warning
0: Info
1: Verbose
2: More verbose
3: Debug

### Model#terminate

```typescript
terminate(): void
```

Will terminate the Web Worker as well as free all allocated memory. Make sure to call this method when you are done
using a model in order to avoid memory leaks. The method will also remove all existing KaldiRecognizer instances.

### Events

A Model will also emit some useful events:

```typescript
.on('load', function(message: {
    event: "load";
    result: boolean;
}) {
    // If the model load was successful or not
})

.on('error', function(message: {
    event: "error";
    error: string;
}) {
    // An error occured
})

```

## KaldiRecognizer

### KaldiRecognizer#id

```typescript
id: string;
```

A unique ID for this KaldiRecognizer instance, passed in every event as `recognizerId`

### KaldiRecognizer#acceptWaveform

```typescript
acceptWaveform(buffer: AudioBuffer): void;
```

Preprocesses AudioBuffers and transfers them to the Web Worker for inference.

### KaldiRecognizer#setWords

```typescript
setWords(words: boolean): void;
```

Return word timestamps in the recognition message

### KaldiRecognizer#remove

```typescript
remove(): void
```

Will remove a recognizer from the model and free all allocated memory. Make sure to call this method when you are done using a recognizer in order to avoid memory leaks.

### Events

In order to obtain recognition results you should listen to the events of the KaldiRecognizer:

```js
.on('result', function(message: {
    event: "result";
    recognizerId: string;
    result: {
        result: Array<{
            conf: number;
            start: number;
            end: number;
            word: string;
        }>;
        text: string;
    };
}) {
    // A final recognition result
})

.on('partialresult', function(message: {
    event: "partialresult";
    recognizerId: string;
    result: {
        partial: string;
    };
}) {
    // A partial recognition result
})

```