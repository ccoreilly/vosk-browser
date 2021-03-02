import { AudioMutedOutlined, AudioOutlined } from "@ant-design/icons";
import MicrophoneStream from "microphone-stream";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { AudioStreamer } from "./audiostreamer";
import { audioBucket } from "./audiobucket";
import { KaldiRecognizer } from "vosk-browser";

const Loading = styled.span`
  box-sizing: border-box;
  padding: 0.2rem 0 0.2rem 0.5rem;
  line-height: 3rem;
`;

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
  recognizer: KaldiRecognizer | undefined;
  loading: boolean;
}

let micStream: any;
let audioStreamer: AudioStreamer;

const Microphone: React.FunctionComponent<Props> = ({
  recognizer,
  loading,
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

  if (loading) {
    return <Loading>Loading model...</Loading>;
  }

  return muted ? (
    <MicButtonOff onMouseUp={toggleMic} />
  ) : (
    <MicButtonOn onMouseUp={toggleMic} />
  );
};

export default Microphone;
