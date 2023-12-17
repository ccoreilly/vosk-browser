import React, { useState } from "react";
import styled from "styled-components";

import { createModel, KaldiRecognizer, Model } from "vosk-browser";
import FileUpload from "./file-upload";
import Microphone from "./microphone";
import ModelLoader from "./model-loader";

const Wrapper = styled.div`
  width: 80%;
  text-align: left;
  max-width: 700px;
  margin: auto;
  display: flex;
  justify-content: center;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: center;
  margin: 1rem auto;
`;

const ResultContainer = styled.div`
  width: 100%;
  margin: 1rem auto;
  border: 1px solid #aaaaaa;
  padding: 1rem;
  resize: vertical;
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
  const [loadedModel, setLoadedModel] = useState<{
    model: Model;
    path: string;
  }>();
  const [recognizer, setRecognizer] = useState<KaldiRecognizer>();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const loadModel = async (path: string) => {
    setLoading(true);
    loadedModel?.model.terminate();

    const model = await createModel(process.env.PUBLIC_URL + "/models/" + path);

    setLoadedModel({ model, path });
    const recognizer = new model.KaldiRecognizer(48000);
    recognizer.setWords(true);
    recognizer.on("result", (message: any) => {
      const result: VoskResult = message.result;
      setUtterances((utt: VoskResult[]) => [...utt, result]);
    });

    recognizer.on("partialresult", (message: any) => {
      setPartial(message.result.partial);
    });

    setRecognizer(() => {
      setLoading(false);
      setReady(true);
      return recognizer;
    });
  };

  return (
    <Wrapper>
      <ModelLoader
        onModelChange={(path) => setReady(loadedModel?.path === path)}
        onModelSelect={(path) => {
          if (loadedModel?.path !== path) {
            loadModel(path);
          }
        }}
        loading={loading}
      />
      <Header>
        <Microphone recognizer={recognizer} loading={loading} ready={ready} />
        <FileUpload recognizer={recognizer} loading={loading} ready={ready} />
      </Header>
      <ResultContainer>
        {utterances.map(
          (utt, uindex) =>
            utt?.result?.map((word, windex) => (
              <Word
                key={`${uindex}-${windex}`}
                confidence={word.conf}
                title={`Confidence: ${(word.conf * 100).toFixed(2)}%`}
              >
                {word.word}{" "}
              </Word>
            )),
        )}
        <span key="partial">{partial}</span>
      </ResultContainer>
    </Wrapper>
  );
};
