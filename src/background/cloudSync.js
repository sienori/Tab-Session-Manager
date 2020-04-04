import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings, setSettings } from "../settings/settings";
import getSessions from "./getSessions";
import { listFiles, uploadSession, downloadFile, deleteFile } from "./cloudAPIs";
import { saveSession } from "./save";

const logDir = "background/cloudSync";

const getShouldRemoveFiles = (files, sessions, removedQueue) => {
  // 削除するべきfile:
  // filesのうち removedQueueに含まれる かつ sessionsに存在しない
  const shouldRemoveFiles = files
    .filter(file => removedQueue.includes(file.name))
    .filter(file => sessions.every(session => session.id !== file.name));

  return shouldRemoveFiles;
};

const getShouldDownloadFiles = (files, sessions, shouldRemoveFiles) => {
  // ダウンロードするべきfile:
  // filesのうち sessionsに存在しない または lastEditedTimeが更新されている
  // かつ shouldRemovedFilesに含まれない
  const shouldDownloadFiles = files
    .filter(file => {
      const sameIdSession = sessions.find(session => session.id === file.name);
      if (!sameIdSession) return true;
      const isUpdated = file.appProperties.lastEditedTime > sameIdSession.lastEditedTime;
      return isUpdated;
    })
    .filter(file => !shouldRemoveFiles.includes(file));

  return shouldDownloadFiles;
};

const getShouldUploadSessions = (files, sessions, lastSyncTime) => {
  // アップロードするべきsession:
  // lastSyncedTime以降に編集されたsessionのうち filesに存在しない または filesに存在するものよりlastEditedTimeが新しい
  const shouldUploadSessions = sessions
    .filter(session => session.lastEditedTime > lastSyncTime)
    .filter(session => {
      const sameIdFile = files.find(file => file.name === session.id);
      if (!sameIdFile) return true;
      const isUpdated = session.lastEditedTime > sameIdFile.appProperties.lastEditedTime;
      return isUpdated;
    });

  return shouldUploadSessions;
};

let isSyncing = false;
export const syncCloud = async () => {
  if (isSyncing) return;
  isSyncing = true;
  log.log(logDir, "syncCloud()");
  const files = await listFiles();
  const sessions = (await getSessions()).filter(session => !session.tag.includes("temp"));
  const removedQueue = getSettings("removedQueue") || [];

  const lastSyncTime = getSettings("lastSyncTime") || 0;
  const currentTime = Date.now();

  const shouldRemoveFiles = getShouldRemoveFiles(files, sessions, removedQueue);
  const shouldDownloadFiles = getShouldDownloadFiles(files, sessions, shouldRemoveFiles);
  const shouldUploadSessions = getShouldUploadSessions(files, sessions, lastSyncTime);

  for (const file of shouldDownloadFiles) {
    const session = await downloadFile(file.id);
    saveSession(session);
  }

  for (const session of shouldUploadSessions) {
    const sameIdFile = files.find(file => file.name === session.id);
    if (sameIdFile) await uploadSession(session, sameIdFile.id);
    else await uploadSession(session);
  }

  for (const file of shouldRemoveFiles) {
    await deleteFile(file.id);
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
