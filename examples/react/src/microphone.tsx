import { Button } from "antd";
import { AudioMutedOutlined, AudioOutlined } from "@ant-design/icons";
import MicrophoneStream from "microphone-stream";
import React, { useCallback, useEffect, useState } from "react";

import { AudioStreamer } from "./audiostreamer";
import { audioBucket } from "./audiobucket";
import { KaldiRecognizer } from "vosk-browser";

interface Props {
  recognizer: KaldiRecognizer | undefined;
  ready: boolean;
  loading: boolean;
}

let micStream: any;
let audioStreamer: AudioStreamer;

const Microphone: React.FunctionComponent<Props> = ({
  recognizer,
  loading,
  ready,
}) => {
  const [muted, setMuted] = useState(true);

  const startRecognitionStream = useCallback(async () => {
    if (recognizer) {
      setMuted(true);

      if (!micStream) {
        let mediaStream = null;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          micStream = new MicrophoneStream({
            objectMode: true,
            bufferSize: 1024,
          });

          micStream.setStream(mediaStream);
        } catch (err) {
          console.error(err);
        }
      } else {
        micStream.unpipe(audioStreamer);
        micStream.pipe(audioBucket);
      }

      audioStreamer = new AudioStreamer(recognizer, {
        objectMode: true,
      });
    }
  }, [recognizer]);

  useEffect(() => {
    startRecognitionStream();
  }, [recognizer]);

  useEffect(() => {
    setMuted(true);
  }, [loading]);

  useEffect(() => {
    if (!muted) {
      micStream?.unpipe(audioBucket);
      micStream?.pipe(audioStreamer);
    } else {
      micStream?.unpipe(audioStreamer);
      micStream?.pipe(audioBucket);
    }
  }, [muted]);

  const toggleMic = () => {
    setMuted((muted) => !muted);
  };

  return (
    <Button
      icon={muted ? <AudioMutedOutlined /> : <AudioOutlined />}
      disabled={!ready || loading}
      onMouseUp={toggleMic}
    >
      Speak
    </Button>
  );
};

export default Microphone;
