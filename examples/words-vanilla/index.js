async function init() {
const resultsContainer = document.getElementById('recognition-result');
    const partialContainer = document.getElementById('partial');

    partialContainer.textContent = "Loading...";
    const model = await Vosk.createModel('model.tar.gz');

    const sampleRate = 16000;
    
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
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    const recognizer = new model.KaldiRecognizer(sampleRate, JSON.stringify(['[unk]', 'encen el llum', 'apaga el llum']));
    
    recognizer.on("result", (message) => {
        const result = message.result;
        console.log(JSON.stringify(result, null, 2));
        
        const newSpan = document.createElement('span');
        newSpan.textContent = `${result.text} `;
        resultsContainer.insertBefore(newSpan, partialContainer);
    });
    recognizer.on("partialresult", (message) => {
        const partial = message.result.partial;
        console.log(JSON.stringify(message.result, null, 2));

        partialContainer.textContent = partial;
    });
    
    partialContainer.textContent = "Ready";
    

    
    const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1)
    recognizerNode.onaudioprocess = (event) => {
        try {
            recognizer.acceptWaveform(event.inputBuffer)
        } catch (error) {
            console.error('acceptWaveform failed', error)
        }
    }
    source.connect(recognizerNode);
}

window.onload = () => {
    const trigger = document.getElementById('trigger');
    trigger.onmouseup = () => {
        trigger.disabled = true;
        init();
    };
}