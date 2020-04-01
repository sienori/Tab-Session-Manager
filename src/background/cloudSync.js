import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings, setSettings } from "../settings/settings";
import getSessions from "./getSessions";
import { listFiles, uploadSession, downloadFile, deleteFile } from "./cloudAPIs";
import { saveSession } from "./save";

const logDir = "background/cloudSync";

let isSyncing = false;
export const syncCloud = async () => {
  if (isSyncing) return;
  isSyncing = true;
  log.log(logDir, "syncCloud()");
  const files = await listFiles();
  const sessions = await getSessions();
  const removedQueue = getSettings("removedQueue") || [];

  const lastSyncTime = getSettings("lastSyncTime") || 0;
  const currentTime = Date.now();

  for (const file of files) {
    const shouldRemove = removedQueue.find(id => id == file.name);
    if (shouldRemove) {
      await deleteFile(file.id);
      continue;
    }

    const sameIdSession = sessions.find(session => session.id === file.name);
    const shouldDownload =
      !sameIdSession || file.appProperties.lastEditedTime > sameIdSession.lastEditedTime;
    if (shouldDownload) {
      const session = await downloadFile(file.id);
      saveSession(session);
    }
  }

  for (const session of sessions) {
    if (session.lastEditedTime < lastSyncTime) continue;
    const sameIdFile = files.find(file => file.name === session.id);
    if (sameIdFile) {
      const shouldUpload = session.lastEditedTime > sameIdFile.appProperties.lastEditedTime;
      if (shouldUpload) await uploadSession(session, sameIdFile.id);
    } else {
      await uploadSession(session);
    }
  }

  setSettings("lastSyncTime", currentTime);
  setSettings("removedQueue", []);
  isSyncing = false;
};

export const pushRemovedQueue = id => {
  const isSignedIn = getSettings("signedInEmail");
  if (!isSignedIn) return;

  log.log(logDir, "pushRemovedQueue()", id);
  let removedQueue = getSettings("removedQueue") || [];
  removedQueue.push(id);
  setSettings("removedQueue", removedQueue);
};
