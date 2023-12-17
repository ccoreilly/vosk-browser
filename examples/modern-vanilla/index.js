async function init() {
  const resultsContainer = document.getElementById("recognition-result");
  const partialContainer = document.getElementById("partial");

  partialContainer.textContent = "Loading...";

  const channel = new MessageChannel();
  const model = await Vosk.createModel("model.tar.gz");
  model.registerPort(channel.port1);

  const sampleRate = 48000;

  const recognizer = new model.KaldiRecognizer(sampleRate);
  recognizer.setWords(true);

  recognizer.on("result", (message) => {
    const result = message.result;
    // console.log(JSON.stringify(result, null, 2));

    const newSpan = document.createElement("span");
    newSpan.textContent = `${result.text} `;
    resultsContainer.insertBefore(newSpan, partialContainer);
  });
  recognizer.on("partialresult", (message) => {
    const partial = message.result.partial;

    partialContainer.textContent = partial;
  });

  partialContainer.textContent = "Ready";

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
      sampleRate,
    },
  });

  const audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule("recognizer-processor.js");
  const recognizerProcessor = new AudioWorkletNode(
    audioContext,
    "recognizer-processor",
    { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 },
  );
  recognizerProcessor.port.postMessage(
    { action: "init", recognizerId: recognizer.id },
    [channel.port2],
  );
  recognizerProcessor.connect(audioContext.destination);

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(recognizerProcessor);
}

window.onload = () => {
  const trigger = document.getElementById("trigger");
  trigger.onmouseup = () => {
    trigger.disabled = true;
    init();
  };
};
