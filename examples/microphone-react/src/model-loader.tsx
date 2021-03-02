import { Select } from "antd";
import React from "react";

const { Option } = Select;

interface Props {
  onModelChange: (value: string) => void;
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
    name: "German",
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
    name: "Spanish",
    path: "vosk-model-small-es-0.3.tar.gz",
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

export const ModelLoader: React.FunctionComponent<Props> = ({
  onModelChange,
}) => {
  return (
    <Select
      style={{
        height: "2rem",
        margin: "auto 0",
        width: "10rem",
      }}
      defaultValue={models[4].path}
      onChange={onModelChange}
    >
      {models.map((model, index) => (
        <Option value={model.path} key={index}>
          {model.name}
        </Option>
      ))}
    </Select>
  );
};
