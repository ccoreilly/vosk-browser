let model;
let recognizer;
async function init() {
    const resultsContainer = document.getElementById('recognition-result');
    const partialContainer = document.getElementById('partial');

    partialContainer.textContent = "Loading...";
    model = await Vosk.createModel('model.tar.gz');
    recognizer = new model.KaldiRecognizer();
    recognizer.on("result", (message) => {
        const result = message.result;
        
        const newSpan = document.createElement('span');
        newSpan.textContent = `${result.text} `;
        resultsContainer.insertBefore(newSpan, partialContainer);
    });
    recognizer.on("partialresult", (message) => {
        const partial = message.result.partial;
        partialContainer.textContent = partial;
    });
    
    partialContainer.textContent = "Select a file to transcribe";
}

const recognize = async ({ target: { files }  }) => {
    const fileUrl = URL.createObjectURL(files[0]);
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.src = fileUrl;
    
    const audioGrabber = document.getElementById('audio-grabber');
    audioGrabber.src = fileUrl;
    const audioContext = new AudioContext();
    
    const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1)
    recognizerNode.onaudioprocess = (event) => {
        try {
            if ((audioGrabber.currentTime < audioGrabber.duration) && !audioGrabber.paused) {
                console.log(event.inputBuffer);
                recognizer.acceptWaveform(event.inputBuffer)
            }
        } catch (error) {
            console.error('acceptWaveform failed', error)
        }
    }
    const audioSource = audioContext.createMediaElementSource(audioGrabber);
    audioSource.connect(recognizerNode);
    // Uncomment the next line for it to work in Chrome.
    // recognizerNode.connect(audioContext.destination);
}

window.onload = () => {
    document.getElementById('uploader').disabled = true;
    init();
    document.getElementById('uploader').disabled = false;
    document.getElementById('uploader').addEventListener('change', recognize);
}