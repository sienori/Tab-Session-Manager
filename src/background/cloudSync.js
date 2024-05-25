import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings, setSettings } from "../settings/settings";
import getSessions from "./getSessions";
import { listFiles, uploadSession, downloadFile, deleteFile } from "./cloudAPIs";
import { refreshAccessToken } from "./cloudAuth";
import { saveSession, updateSession } from "./save";
import { showSyncErrorBadge, hideBadge } from "./setBadge";

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
  if (!getSettings("includesAutoSaveToSync")) {
    files = files.filter(
      file =>
        !file.appProperties.tag.includes("regular") &&
        !file.appProperties.tag.includes("winClose") &&
        !file.appProperties.tag.includes("browserExit")
    );
  }

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
  if (!getSettings("includesAutoSaveToSync")) {
    sessions = sessions.filter(
      session =>
        !session.tag.includes("regular") &&
        !session.tag.includes("winClose") &&
        !session.tag.includes("browserExit")
    );
  }

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

const syncStatus = {
  none: "none",
  pending: "pending",
  download: "download",
  upload: "upload",
  delete: "delete",
  complete: "complete",
  signInRequired: "signInRequired",
};

let currentSyncStatus = {
  status: syncStatus.none,
  progress: 0,
  total: 0
};

const updateSyncStatus = (status, progress = 0, total = 0) => {
  currentSyncStatus = {
    status: status,
    progress: progress,
    total: total
  };
  if (status !== syncStatus.none) {
    browser.runtime
      .sendMessage({ message: "updateSyncStatus", syncStatus: currentSyncStatus })
      .catch(() => { });
  }
};

export const getSyncStatus = () => {
  return currentSyncStatus;
};

let isSyncing = false;
export const syncCloud = async () => {
  if (isSyncing) return;
  isSyncing = true;
  log.log(logDir, "syncCloud()");
  hideBadge();

  updateSyncStatus(syncStatus.pending);
  const files = await listFiles().catch(e => null);
  if (files === null) {
    log.error(logDir, "syncCloud() listFiles");
    isSyncing = false;
    updateSyncStatus(syncStatus.none);
    return;
  }
  const sessions = (await getSessions()).filter(session => !session.tag.includes("temp"));
  const removedQueue = getSettings("removedQueue") || [];

  const lastSyncTime = getSettings("lastSyncTime") || 0;
  const currentTime = Date.now();

  const shouldRemoveFiles = getShouldRemoveFiles(files, sessions, removedQueue);
  const shouldDownloadFiles = getShouldDownloadFiles(files, sessions, shouldRemoveFiles);
  const shouldUploadSessions = getShouldUploadSessions(files, sessions, lastSyncTime);

  for (const [index, file] of shouldDownloadFiles.entries()) {
    updateSyncStatus(syncStatus.download, index + 1, shouldDownloadFiles.length);
    const downloadedSession = await downloadFile(file.id);
    const isUpdate = sessions.some(session => session.id === downloadedSession.id);
    if (isUpdate) updateSession(downloadedSession, true, false, true);
    else saveSession(downloadedSession, true, true);
  }

  for (const [index, session] of shouldUploadSessions.entries()) {
    updateSyncStatus(syncStatus.upload, index + 1, shouldUploadSessions.length);
    const sameIdFile = files.find(file => file.name === session.id);
    if (sameIdFile) await uploadSession(session, sameIdFile.id);
    else await uploadSession(session);
  }

  for (const [index, file] of shouldRemoveFiles.entries()) {
    updateSyncStatus(syncStatus.delete, index + 1, shouldRemoveFiles.length);
    await deleteFile(file.id);
  }

  setSettings("lastSyncTime", currentTime);
  setSettings("removedQueue", []);
  isSyncing = false;
  updateSyncStatus(syncStatus.complete);
  updateSyncStatus(syncStatus.none);
};

export const pushRemovedQueue = id => {
  const isSignedIn = getSettings("signedInEmail");
  if (!isSignedIn) return;

  log.log(logDir, "pushRemovedQueue()", id);
  let removedQueue = getSettings("removedQueue") || [];
  removedQueue.push(id);
  setSettings("removedQueue", removedQueue);
};

let autoSyncTimer;
export const syncCloudAuto = () => {
  const isLoggedIn = getSettings("signedInEmail");
  const enabledAutoSync = getSettings("enabledAutoSync");
  if (!(isLoggedIn && enabledAutoSync)) return;

  // 起動時またはセッション保存時に呼び出されるため、10秒以内にServiceWorkerが停止することはない想定
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(async () => {
    try {
      //Check sign in required
      await refreshAccessToken(false);
      syncCloud();
    } catch (e) {
      log.error(logDir, "syncCloudAuto()", "Sign in Required");
      updateSyncStatus(syncStatus.signInRequired);
      showSyncErrorBadge();
    }
  }, 10000);
};