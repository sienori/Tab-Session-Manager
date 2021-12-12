const handleInputFiles = async (event) => {
  const fileInfo = document.querySelector("#fileInfo");
  fileInfo.textContent = "Loading...";
  document.querySelector("#compressProgress").textContent = "";
  document.querySelector("#downloadLink").textContent = "";

  const files = event.target.files;
  let allSessions = [];

  try {
    let fileSize = 0;
    for (let file of files) {
      fileSize += file.size;
      const sessions = await readSessionsFromFile(file);
      allSessions = allSessions.concat(sessions);
    }
    fileInfo.textContent = `${allSessions.length} sessions (${(fileSize / 1000).toLocaleString()} KB)`;
  }
  catch (e) {
    console.error(e);
    fileInfo.textContent = `Load failed`;
    return;
  }
  const compressedSessions = await compressSessions(allSessions);

  showDownloadLink(compressedSessions);
};

const readSessionsFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const sessions = JSON.parse(e.target.result);
        resolve(sessions);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
};

const compressSessions = async sessions => {
  let compressedSessions = [];
  const compressProgress = document.querySelector("#compressProgress");
  let compressedCount = 0;

  for (let session of sessions) {
    compressedCount += 1;
    compressProgress.textContent = `Compressing... (${compressedCount} / ${sessions.length})`;

    const compressedSession = await compressSession(session);
    compressedSessions.push(compressedSession);
  }

  compressProgress.textContent = `Compression complete! (${compressedCount} / ${sessions.length})`;

  return compressedSessions;
};

const compressSession = async session => {
  session.lastEditedTime = Date.now();

  for (let winId in session.windows) {
    for (let tabId in session.windows[winId]) {
      let tab = session.windows[winId][tabId];

      if (tab?.favIconUrl?.startsWith("data:image")) {
        const compressedDataUrl = await compressDataUrl(tab.favIconUrl);
        tab.favIconUrl = compressedDataUrl;
        session.windows[winId][tabId] = tab;
      }
    }
  }

  return session;
};

const compressDataUrl = async dataUrl => {
  try {
    const file = await imageCompression.getFilefromDataUrl(dataUrl, "");
    const compressedFile = await imageCompression(file, {
      maxWidthOrHeight: 32,
      initialQuality: 0.5,
      maxIteration: 1,
      useWebWorker: false
    });

    const reader = new FileReader();
    return new Promise(resolve => {
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(compressedFile);
    });
  }
  catch{
    return dataUrl;
  }
};

const showDownloadLink = (sessions) => {
  const blob = new Blob([JSON.stringify(sessions, null, "  ")], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);

  const a = document.querySelector("#downloadLink");
  a.download = `Compressed (${sessions.length} sessions).json`;
  a.href = downloadUrl;
  a.textContent = `Download (${(blob.size / 1000).toLocaleString()} KB)`;
  document.querySelector("#app").appendChild(a);
};

const input = document.querySelector("#loadSessions");
input.addEventListener("change", handleInputFiles);