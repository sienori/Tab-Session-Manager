const MAX_SIZE = 32;

const loadImage = async dataUrl => {
  // Chrome's service worker has no Image element
  if (typeof Image === "undefined") {
    const response = await fetch(dataUrl);
    return createImageBitmap(await response.blob());
  }
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
};

const readAsDataUrl = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

// Avoid Blobs where possible: Firefox backs each canvas.toBlob() result with a 128KB buffer that
// the GC doesn't count, so blobs created on every save pile up in the background page.
export const compressDataUrl = async dataUrl => {
  try {
    const image = await loadImage(dataUrl);
    if (!image.width || !image.height) return dataUrl;

    const scale = Math.min(1, MAX_SIZE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas =
      typeof document === "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext("2d").drawImage(image, 0, 0, width, height);
    image.close?.();

    const compressedDataUrl = canvas.toDataURL
      ? canvas.toDataURL()
      : await readAsDataUrl(await canvas.convertToBlob());
    return compressedDataUrl.length < dataUrl.length ? compressedDataUrl : dataUrl;
  } catch {
    return dataUrl;
  }
};
