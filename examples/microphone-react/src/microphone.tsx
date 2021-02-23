import { AudioMutedOutlined, AudioOutlined } from "@ant-design/icons";
import MicrophoneStream from "microphone-stream";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { AudioStreamer } from "./audiostreamer";
import { AudioBucket } from "./audiobucket";
import { KaldiRecognizer, Model } from "vosk-browser";

const MicButtonOn = styled(AudioOutlined)`
  color: "red";
  box-sizing: border-box;
  padding: 0.2rem 0 0.2rem 0.5rem;
  > svg {
    height: 3rem;
    width: 3rem;
  }
  cursor: pointer;
`;

const MicButtonOff = styled(AudioMutedOutlined)`
  color: lightgray;
  box-sizing: border-box;
  padding: 0.2rem 0 0.2rem 0.5rem;
  > svg {
    height: 3rem;
    width: 3rem;
  }
  cursor: pointer;
`;

interface Props {
  audioStreamer: AudioStreamer | undefined;
}

let micStream: any;

const Microphone: React.FunctionComponent<Props> = ({ audioStreamer }) => {
  console.log(`audioStreamer ${audioStreamer}`);
  const [muted, setMuted] = useState(true);

  const startRecognitionStream = useCallback(async () => {
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
        console.log(err);
      }
    } else {
      (micStream as any).unpipe(AudioBucket);
    }

    micStream.pipe(audioStreamer);
  }, [muted, audioStreamer]);

  useEffect(() => {
    console.log("effect");
    if (!muted && audioStreamer) {
      console.log("start");
      startRecognitionStream();
    } else {
      if (micStream) {
        micStream.unpipe(audioStreamer);
        micStream.pipe(AudioBucket);
      }
    }
  }, [muted, audioStreamer]);

  const toggleMic = () => {
    setMuted((muted) => !muted);
  };

  return muted ? (
    <MicButtonOff onMouseUp={toggleMic} />
  ) : (
    <MicButtonOn onMouseUp={toggleMic} />
  );
};

export default Microphone;
