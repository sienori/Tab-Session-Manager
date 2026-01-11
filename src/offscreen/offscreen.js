import browser from "webextension-polyfill";

let downloadCounter = 0;

const waitForDownloadLimit = async limit => {
  while (downloadCounter > limit) {
    return new Promise(resolve =>
      setTimeout(() => {
        resolve(waitForDownloadLimit(limit));
      }, 100)
    );
  }
};

const createObjectURL = async sessions => {
  downloadCounter++;
  await waitForDownloadLimit(5);

  return URL.createObjectURL(
    new Blob([JSON.stringify(sessions, null, "  ")], {
      type: "application/json"
    })
  );
};

const revokeObjectURL = downloadUrl => {
  downloadCounter--;
  URL.revokeObjectURL(downloadUrl);
};

const onMessageListener = async (request, sender, sendResponse) => {
  switch (request.message) {
    case "offscreen_createObjectUrl":
      return await createObjectURL(request.sessions);
    case "offscreen_revokeObjectUrl":
      return revokeObjectURL(request.downloadUrl);
  }

  // backgroundやpopup宛のメッセージとの混信を防ぐ
  const empty = new Promise(resolve => {
    setTimeout(() => {
      return resolve("");
    }, 1000);
  });
  return empty;
};

browser.runtime.onMessage.addListener(onMessageListener);
