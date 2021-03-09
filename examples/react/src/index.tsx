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
      <h1>Vosk-Browser Demo</h1>
      <p>
        Select a language and load the model to start speech recognition. <br />
        You can either upload a file or speak on the microphone.
      </p>
      <Recognizer />
    </Wrapper>
  </React.StrictMode>,
  document.getElementById("root")
);
