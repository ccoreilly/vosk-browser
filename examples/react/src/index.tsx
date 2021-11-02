import "antd/dist/antd.min.css";

import React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

import "./index.css";

import { Recognizer } from "./recognizer";

const Wrapper = styled.div`
  text-align: center;
  margin: auto;
  justify-content: center;
`;

ReactDOM.render(
  <React.StrictMode>
    <Wrapper>
      <h1>Vosk-Browser Speech Recognition Demo</h1>
      <p>
        Select a language and load the model to start speech recognition. <br />
        You can either upload a file or speak on the microphone.
      </p>
      <p>
        Note: Recognition from a file does not work on Chrome for now, use
        Firefox instead.
      </p>
      <Recognizer />
      <p>
        <a href="https://github.com/ccoreilly/vosk-browser">
          Vosk-Browser Github Repository
        </a>
      </p>
      <p>
        Malayalam model is Copyright 2021{" "}
        <a href="https://gitlab.com/kavyamanohar/vosk-malayalam/">
          Kavya Manohar
        </a>
        . All other models are Copyright 2019{" "}
        <a href="https://alphacephei.com/en/">Alpha Cephei</a> Inc. All Rights
        Reserved. <a href="https://alphacephei.com/vosk/models">Distributed</a>{" "}
        under Apache 2.0 license.
      </p>
    </Wrapper>
  </React.StrictMode>,
  document.getElementById("root")
);
