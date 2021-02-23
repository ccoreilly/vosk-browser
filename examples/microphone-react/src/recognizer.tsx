import React, { useEffect, useState } from "react";

import { KaldiRecognizer, Model } from "vosk-browser";
import { AudioStreamer } from "./audiostreamer";
import Microphone from "./microphone";

interface Props {}

export const Recognizer: React.FunctionComponent = (props: Props) => {
  const [utterances, setUtterances] = useState<string[]>([]);
  const [audioStreamer, setAudioStreamer] = useState<AudioStreamer>();

  useEffect(() => {
    const model = new Model(process.env.PUBLIC_URL + "/model.tar.gz");

    const recognizer = new model.KaldiRecognizer();
    recognizer.on("result", (message: any) => {
      console.log(`Received message! ${JSON.stringify(message)}`);
      setUtterances((utt: string[]) => [...utt, message.result.text]);
    });
    console.log("creating audiostreamer");
    setAudioStreamer(new AudioStreamer(recognizer, { objectMode: true }));
  }, []);

  return (
    <div>
      <Microphone audioStreamer={audioStreamer} />
      {utterances.map((utt) => (
        <div>{utt}</div>
      ))}
    </div>
  );
};
