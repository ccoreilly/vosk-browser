import { Writable } from "readable-stream";

export const AudioBucket = new Writable({
  write: function (chunk, encoding, callback) {
    callback();
  },
  objectMode: true,
  decodeStrings: false,
});
