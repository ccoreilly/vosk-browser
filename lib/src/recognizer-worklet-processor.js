class RecognizerAudioProcessor extends AudioWorkletProcessor {

  constructor(options) {
    super(options);

    this.port.onmessage = this.processMessage.bind(this);
  }

  processMessage(event) {
    console.debug(`Received event ${JSON.stringify(event.data, null, 2)}`);
    if (event.data.event === "shareBuffer") {
      this.audioSharedArray = new Float32Array(event.data.sharedBuffers.audio);
      this.stateSharedArray = new Int32Array(event.data.sharedBuffers.state);
    }
  }

  process(
    inputs,
    outputs,
    parameters
  ) {
    const data = inputs[0][0];
    if (data && this.stateSharedArray) {
      // AudioBuffer samples are represented as floating point numbers between -1.0 and 1.0 whilst
      // Kaldi expects them to be between -32768 and 32767 (the range of a signed int16)
      const audioArray = data.map((value) => value * 0x8000);
      // console.log(this.audioSharedArray.length);
      // console.log(audioArray.length);
      // console.log(sampleRate);
      this.audioSharedArray.set(audioArray);
      Atomics.notify(this.stateSharedArray, 0, 1);
    }
    return true;
  }
}

registerProcessor("recognizer-audio-processor", RecognizerAudioProcessor);
