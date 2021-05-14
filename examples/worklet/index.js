let recognizerProcessor;
let source;

async function init() {
    const resultsContainer = document.getElementById('recognition-result');
    const partialContainer = document.getElementById('partial');

    partialContainer.textContent = "Loading...";
    
    const model = await Vosk.createModel('model.tar.gz');

    const sampleRate = 48000;
    
    const recognizer = new model.KaldiRecognizer(sampleRate);

    recognizer.on("result", (message) => {
        const result = message.result;
        console.log(JSON.stringify(result, null, 2));
        
        if (result.text.trim()) {
            const newSpan = document.createElement('span');
            newSpan.textContent = `${result.text} `;
            resultsContainer.insertBefore(newSpan, partialContainer);
        }
    });
    recognizer.on("partialresult", (message) => {
        const partial = message.result.partial;
        console.log(JSON.stringify(message.result, null, 2));

        partialContainer.textContent = partial;
    });
    
    partialContainer.textContent = "Ready";
    
    const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate
        },
    });
    
    const audioContext = new AudioContext();
    recognizerProcessor = await model.createAudioWorkletNode(audioContext, { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
    
    source = audioContext.createMediaStreamSource(mediaStream);
}

window.onload = () => {
    const trigger = document.getElementById('trigger');
    const stopper = document.getElementById('stop');
    trigger.onmouseup = () => {
        trigger.disabled = true;
        init().then(() => source.connect(recognizerProcessor));
    };

    stopper.onmouseup = () => {
        trigger.disabled = false;
        if (source && recognizerProcessor) {
            source.disconnect(recognizerProcessor);
        }
    };
}