export const sliceTextByBytes = (text, byteLength) => {
  const utf8array = new TextEncoder("utf-8").encode(text);
  const slicedText = new TextDecoder("utf-8").decode(utf8array.slice(0, byteLength));
  return slicedText;
};
