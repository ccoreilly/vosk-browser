import { Button, Select } from "antd";
import React, { useState } from "react";
import styled from "styled-components";

const { Option } = Select;

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const StyledButton = styled(Button)`
  box-sizing: border-box;
  margin-left: 0.5rem;
`;
interface Props {
  onModelChange: (value: string) => void;
  onModelSelect: (value: string) => void;
  loading: boolean;
}

export const models: Array<{ name: string; path: string }> = [
  {
    name: "Catalan",
    path: "vosk-model-small-ca-0.4.tar.gz",
  },
  {
    name: "Chinese",
    path: "vosk-model-small-cn-0.3.tar.gz",
  },
  {
    name: "Deutsch",
    path: "vosk-model-small-de-0.15.tar.gz",
  },
  {
    name: "Indian English",
    path: "vosk-model-small-en-in-0.4.tar.gz",
  },
  {
    name: "English",
    path: "vosk-model-small-en-us-0.15.tar.gz",
  },
  {
    name: "Español",
    path: "vosk-model-small-es-0.3.tar.gz",
  },
  {
    name: "Esperanto",
    path: "vosk-model-small-eo-0.42.tar.gz",
  },
  {
    name: "Farsi",
    path: "vosk-model-small-fa-0.4.tar.gz",
  },
  {
    name: "French",
    path: "vosk-model-small-fr-pguyot-0.3.tar.gz",
  },
  {
    name: "Italiano",
    path: "vosk-model-small-it-0.4.tar.gz",
  },
  {
    name: "Malayalam",
    path: "vosk-model-malayalam-bigram.tar.gz",
  },
  {
    name: "Portuguese",
    path: "vosk-model-small-pt-0.3.tar.gz",
  },
  {
    name: "Russian",
    path: "vosk-model-small-ru-0.4.tar.gz",
  },
  {
    name: "Turkish",
    path: "vosk-model-small-tr-0.3.tar.gz",
  },
  {
    name: "Vietnamese",
    path: "vosk-model-small-vn-0.3.tar.gz",
  },
];

const ModelLoader: React.FunctionComponent<Props> = ({
  onModelChange,
  onModelSelect,
  loading,
}) => {
  const [model, setModel] = useState(models[4].path);

  return (
    <Wrapper>
      <Select
        style={{
          height: "2rem",
          margin: "auto 0",
          width: "10rem",
        }}
        defaultValue={models[4].path}
        onChange={(value: string) => {
          onModelChange(value);
          setModel(value);
        }}
      >
        {models.map((model, index) => (
          <Option value={model.path} key={index}>
            {model.name}
          </Option>
        ))}
      </Select>
      <StyledButton onClick={() => onModelSelect(model)}>
        {loading ? "Loading..." : "Load"}
      </StyledButton>
    </Wrapper>
  );
};

export default ModelLoader;
