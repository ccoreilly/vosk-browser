async function init() {
    const resultsContainer = document.getElementById('recognition-results');
    resultsContainer.textContent = "Loading...";
    const model = await Vosk.createModel('model.tar.gz');

    const recognizer = new model.KaldiRecognizer();
    recognizer.on("result", (message) => {
        const result = message.result;
        resultsContainer.textContent = result.text;
    });
    recognizer.on("partialresult", (message) => {
        const partial = message.result.partial;
        resultsContainer.textContent = partial;
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
    const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1);
    recognizerNode.onaudioprocess = (event) => {
        try {
            console.log("sending");
            recognizer.acceptWaveform(event.inputBuffer);
        } catch (error) {
            console.error('acceptWaveform failed', error);
        }
    }
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(recognizerNode);
    resultsContainer.textContent = "Ready";
}

window.onload = () => {
    const trigger = document.getElementById('trigger');
    trigger.onmouseup = () => {
        trigger.disabled = true;
        init();
    };
}