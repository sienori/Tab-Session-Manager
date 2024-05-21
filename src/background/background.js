import browser from "webextension-polyfill";
import log from "loglevel";
import updateOldSessions from "./updateOldSessions";
import {
  setAutoSave,
  handleTabUpdated,
  handleTabRemoved,
  autoSaveWhenWindowClose,
  autoSaveWhenExitBrowser,
  setUpdateTempTimer,
  openLastSession,
  autoSaveWhenOpenInCurrentWindow
} from "./autoSave";
import Sessions from "./sessions";
import { replacePage } from "./replace";
import importSessions from "./import";
import { backupSessions, resetLastBackupTime } from "./backup";
import {
  loadCurrentSession,
  saveCurrentSession,
  saveSession,
  removeSession,
  deleteAllSessions,
  updateSession,
  renameSession
} from "./save";
import getSessions from "./getSessions";
import { openSession } from "./open";
import { addTag, removeTag, applyDeviceName } from "./tag";
import { initSettings, handleSettingsChange, getSettings } from "src/settings/settings";
import exportSessions, { handleDownloadsChanged } from "./export";
import onInstalledListener from "./onInstalledListener";
import onUpdateAvailableListener from "./onUpdateAvailableListener";
import { onCommandListener } from "./keyboardShortcuts";
import { openStartupSessions } from "./startup";
import { signInGoogle, signOutGoogle } from "./cloudAuth";
import { syncCloud, syncCloudAuto, getSyncStatus } from "./cloudSync";
import { updateLogLevel, overWriteLogLevel } from "../common/log";
import { getsearchInfo } from "./search";
import { recordChange, undo, redo, updateUndoStatus } from "./undo";
import { compressAllSessions } from "./compressAllSessions";
import { startTracking, endTrackingByWindowDelete, updateTrackingStatus } from "./track";

const logDir = "background/background";
export const SessionStartTime = Date.now();

let IsInit = false;
export const init = async () => {
  if (IsInit) return;
  await initSettings();
  overWriteLogLevel();
  updateLogLevel();
  log.info(logDir, "init()");
  await Sessions.init();
  IsInit = true;

  //TODO: service workerで動くようにする
  setAutoSave();
  syncCloudAuto();
};

const onStartupListener = async () => {
  await init();
  log.info(logDir, "onStartupListener()");
  await autoSaveWhenExitBrowser();
  const startupBehavior = getSettings("startupBehavior");
  if (startupBehavior === "previousSession") openLastSession();
  else if (startupBehavior === "startupSession") openStartupSessions();
  setTimeout(backupSessions, 30000);
};

const onMessageListener = async (request, sender, sendResponse) => {
  await init();
  log.info(logDir, "onMessageListener()", request);
  switch (request.message) {
    case "save": {
      const afterSession = await saveSession(request.session);
      recordChange(null, afterSession);
      return afterSession;
    }
    case "saveCurrentSession":
      const name = request.name;
      const property = request.property;
      const afterSession = await saveCurrentSession(name, [], property);
      recordChange(null, afterSession);
      return afterSession;
    case "open":
      if (request.property === "openInCurrentWindow") await autoSaveWhenOpenInCurrentWindow();
      openSession(request.session, request.property);
      break;
    case "remove":
      const beforeSession = await getSessions(request.id);
      await removeSession(request.id, request.isSendResponce);
      recordChange(beforeSession, null);
      break;
    case "rename": {
      const beforeSession = await getSessions(request.id);
      const afterSession = await renameSession(request.id, request.name);
      recordChange(beforeSession, afterSession);
      break;
    }
    case "update": {
      const beforeSession = await getSessions(request.session.id);
      await updateSession(request.session, request.isSendResponce);
      recordChange(beforeSession, request.session);
      break;
    }
    case "import":
      importSessions(request.importSessions);
      break;
    case "exportSessions":
      exportSessions(request.id);
      break;
    case "deleteAllSessions":
      deleteAllSessions();
      break;
    case "getSessions":
      const sessions = await getSessions(request.id, request.needKeys);
      return sessions;
    case "addTag": {
      const beforeSession = await getSessions(request.id);
      const afterSession = await addTag(request.id, request.tag);
      recordChange(beforeSession, afterSession);
      break;
    }
    case "removeTag": {
      const beforeSession = await getSessions(request.id);
      const afterSession = removeTag(request.id, request.tag);
      recordChange(beforeSession, afterSession);
      break;
    }
    case "getInitState":
      return IsInit;
    case "getCurrentSession":
      const currentSession = await loadCurrentSession("", [], request.property).catch(() => { });
      return currentSession;
    case "signInGoogle":
      return await signInGoogle();
    case "signOutGoogle":
      return await signOutGoogle();
    case "syncCloud":
      return await syncCloud();
    case "getSyncStatus":
      return getSyncStatus();
    case "applyDeviceName":
      return await applyDeviceName();
    case "getsearchInfo":
      return await getsearchInfo();
    case "requestAllSessions": {
      const sendResponse = (sessions, isEnd) => browser.runtime.sendMessage({
        message: "responseAllSessions", sessions: sessions, isEnd: isEnd, port: request.port
      }).catch(() => { });
      return Sessions.getAllWithStream(sendResponse, request.needKeys, request.count);
    }
    case "undo":
      return undo();
    case "redo":
      return redo();
    case "updateUndoStatus":
      return updateUndoStatus();
    case "compressAllSessions": {
      const sendResponse = (status) => browser.runtime.sendMessage({
        message: "updateCompressStatus",
        status: status,
        port: request.port
      }).catch(() => { });
      return compressAllSessions(sendResponse);
    }
    case "updateTrackingStatus":
      return updateTrackingStatus();
    case "startTracking":
      return startTracking(request.sessionId, request.originalWindowId, request.openedWindowId);
    case "endTrackingByWindowDelete":
      return endTrackingByWindowDelete(request.sessionId, request.originalWindowId);
  }
};

const handleReplace = async () => {
  await init();
  replacePage();
}

const onChangeStorageListener = async (changes, areaName) => {
  await init();
  handleSettingsChange(changes, areaName);
  setAutoSave(changes, areaName);
  updateLogLevel();
  resetLastBackupTime(changes);
}

browser.runtime.onStartup.addListener(onStartupListener);
browser.runtime.onInstalled.addListener(onInstalledListener);
browser.runtime.onUpdateAvailable.addListener(onUpdateAvailableListener);
browser.runtime.onMessage.addListener(onMessageListener);
browser.commands.onCommand.addListener(onCommandListener);
browser.tabs.onActivated.addListener(handleReplace);
browser.windows.onFocusChanged.addListener(handleReplace);
browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.tabs.onRemoved.addListener(handleTabRemoved);
browser.tabs.onCreated.addListener(setUpdateTempTimer);
browser.tabs.onMoved.addListener(setUpdateTempTimer);
browser.windows.onCreated.addListener(setUpdateTempTimer);
browser.windows.onRemoved.addListener(autoSaveWhenWindowClose);
browser.downloads.onChanged.addListener(handleDownloadsChanged);
browser.storage.local.onChanged.addListener(onChangeStorageListener);
