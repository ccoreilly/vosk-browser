import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { createModel } from "vosk-browser";
import { AudioStreamer } from "./audiostreamer";
import Microphone from "./microphone";

const Wrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  flex-direction: column;
  overflow: auto;
`;

const ResultContainer = styled.div`
  width: 80%;
  max-width: 700px;
  margin: 1rem auto;
  border: 1px solid #aaaaaa;
  padding: 1rem;
  resize: both;
  overflow: auto;
`;

const Word = styled.span<{ confidence: number }>`
  color: ${({ confidence }) => {
    const color = Math.max(255 * (1 - confidence) - 20, 0);
    return `rgb(${color},${color},${color})`;
  }};
  white-space: normal;
`;

interface VoskResult {
  result: Array<{
    conf: number;
    start: number;
    end: number;
    word: string;
  }>;
  text: string;
}

export const Recognizer: React.FunctionComponent = () => {
  const [utterances, setUtterances] = useState<VoskResult[]>([]);
  const [partial, setPartial] = useState("");
  const [audioStreamer, setAudioStreamer] = useState<AudioStreamer>();

  useEffect(() => {
    (async () => {
      const model = await createModel(process.env.PUBLIC_URL + "/model.tar.gz");
      const recognizer = new model.KaldiRecognizer();
      recognizer.on("result", (message: any) => {
        const result: VoskResult = message.result;
        setUtterances((utt: VoskResult[]) => [...utt, result]);
      });

      recognizer.on("partialresult", (message: any) => {
        setPartial(message.result.partial);
      });

      setAudioStreamer(new AudioStreamer(recognizer, { objectMode: true }));
    })();
  }, []);

  return (
    <Wrapper>
      <Microphone audioStreamer={audioStreamer} />
      <ResultContainer>
        {utterances.map((utt, uindex) =>
          utt?.result?.map((word, windex) => (
            <Word
              key={`${uindex}-${windex}`}
              confidence={word.conf}
              title={`Confidence: ${(word.conf * 100).toFixed(2)}%`}
            >
              {word.word}{" "}
            </Word>
          ))
        )}
        <span key="partial">{partial}</span>
      </ResultContainer>
    </Wrapper>
  );
};
