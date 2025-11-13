import log from "loglevel";
import Sessions from "./sessions.js";
import { saveSession } from "./save.js";
import { putThumbnail, putOfflinePage } from "./tabAssets";

const logDir = "background/import";

export default async function importSessions(importedSessions) {
  log.log(logDir, "import()", importedSessions);

  //同一セッションが存在しなければインポートする
  for (let importedSession of importedSessions) {
    const currentSessions = await Sessions.search("date", importedSession.date);

    const isSameSession = session =>
      session.id == importedSession.id && session.lastEditedTime >= importedSession.lastEditedTime;
    const existsSameSession = currentSessions.some(isSameSession);
    if (existsSameSession) continue;

    importedSession.lastEditedTime = Date.now();
    await restoreEmbeddedAssets(importedSession);
    await saveSession(importedSession);
  }
}

const dataUrlToBlob = dataUrl => {
  if (!dataUrl) return null;
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const restoreEmbeddedAssets = async session => {
  const assets = session?._embeddedAssets;
  if (!assets) return;

  const thumbnailEntries = Object.entries(assets.thumbnails || {});
  const offlineEntries = Object.entries(assets.offlinePages || {});

  await Promise.all(
    thumbnailEntries.map(async ([id, record]) => {
      try {
        const blob = dataUrlToBlob(record.dataUrl);
        if (!blob) return;
        await putThumbnail({
          id,
          sessionId: record.sessionId || session.id,
          tabId: record.tabId,
          blob,
          type: record.type,
          createdAt: record.createdAt || Date.now()
        });
      } catch (error) {
        log.warn(logDir, "restoreEmbeddedAssets() thumbnail", id, error);
      }
    })
  );

  await Promise.all(
    offlineEntries.map(async ([id, record]) => {
      try {
        await putOfflinePage({
          id,
          sessionId: record.sessionId || session.id,
          tabId: record.tabId,
          html: record.html,
          url: record.url,
          title: record.title,
          createdAt: record.createdAt || Date.now()
        });
      } catch (error) {
        log.warn(logDir, "restoreEmbeddedAssets() offline", id, error);
      }
    })
  );

  delete session._embeddedAssets;
};
