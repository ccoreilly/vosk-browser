import { Writable } from "readable-stream";

export const audioBucket = new Writable({
  write: function (chunk, encoding, callback) {
    callback();
  },
  objectMode: true,
  decodeStrings: false,
});
