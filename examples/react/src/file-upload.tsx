import React, { useRef } from "react";
import { Button, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { KaldiRecognizer } from "vosk-browser";

const StyledButton = styled(Button)`
  box-sizing: border-box;
  margin-left: 0.5rem;
`;

interface Props {
  recognizer: KaldiRecognizer | undefined;
  ready: boolean;
  loading: boolean;
}

const FileUpload: React.FunctionComponent<Props> = ({
  recognizer,
  ready,
  loading,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const onChange = ({ file }: any) => {
    if (recognizer && audioRef.current) {
      const fileUrl = URL.createObjectURL(file.originFileObj);
      const audioPlayer = audioRef.current;
      audioPlayer.src = fileUrl;

      const audioContext = new AudioContext();

      const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1);
      recognizerNode.onaudioprocess = (event) => {
        try {
          if (
            audioPlayer.currentTime < audioPlayer.duration &&
            !audioPlayer.paused
          ) {
            recognizer.acceptWaveform(event.inputBuffer);
          }
        } catch (error) {
          console.error("acceptWaveform failed", error);
        }
      };
      const audioSource = audioContext.createMediaElementSource(audioPlayer);
      audioSource.connect(recognizerNode);
    }
  };

  const dummyRequest = ({ file, onSuccess }: any) => {
    onSuccess("ok");
  };

  return (
    <>
      <Upload
        onChange={onChange}
        customRequest={dummyRequest}
        accept="audio/*"
        showUploadList={false}
      >
        <StyledButton icon={<UploadOutlined />} disabled={!ready || loading}>
          Upload File
        </StyledButton>
      </Upload>
      <audio ref={audioRef} autoPlay></audio>
    </>
  );
};

export default FileUpload;
