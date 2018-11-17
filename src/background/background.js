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
  openLastSession
} from "./autoSave";
import Sessions from "./sessions";
import { replacePage } from "./replace";
import importSessions from "./import";
import backupSessions from "./backup";
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
import { addTag, removeTag } from "./tag";
import { initSettings, handleSettingsChange } from "src/settings/settings";
import exportSessions from "./export";
import onInstalledListener, { isUpdated } from "./onInstalledListener";
import { updateLogLevel, overWriteLogLevel } from "../common/log";

const logDir = "background/background";
export const SessionStartTime = Date.now();

const addListeners = () => {
  const handleReplace = () => replacePage();
  browser.tabs.onActivated.addListener(handleReplace);
  browser.windows.onFocusChanged.addListener(handleReplace);

  browser.storage.onChanged.addListener((changes, areaName) => {
    handleSettingsChange(changes, areaName);
    setAutoSave(changes, areaName);
    updateLogLevel();
  });

  browser.tabs.onUpdated.addListener(handleTabUpdated);
  browser.tabs.onRemoved.addListener(handleTabRemoved);
  browser.tabs.onCreated.addListener(setUpdateTempTimer);
  browser.windows.onCreated.addListener(setUpdateTempTimer);

  browser.windows.onRemoved.addListener(autoSaveWhenWindowClose);
};

let IsInit = false;
const init = async () => {
  await initSettings();
  overWriteLogLevel();
  updateLogLevel();
  log.info(logDir, "init()");
  await Sessions.init();
  IsInit = true;
  await updateOldSessions();

  if (!isUpdated) {
    autoSaveWhenExitBrowser().then(() => {
      openLastSession();
    });
  }

  setAutoSave();
  backupSessions();
  addListeners();
};
init();

const onMessageListener = async (request, sender, sendResponse) => {
  log.info(logDir, "onMessageListener()", request);
  switch (request.message) {
    case "save":
      saveSession(request.session);
      break;
    case "saveCurrentSession":
      const name = request.name;
      const property = request.property;
      saveCurrentSession(name, [], property).catch(() => {});
      break;
    case "open":
      openSession(request.session, request.property);
      break;
    case "remove":
      removeSession(request.id, request.isSendResponce);
      break;
    case "rename":
      renameSession(request.id, request.name);
      break;
    case "update":
      updateSession(request.session, request.isSendResponce);
      break;
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
    case "addTag":
      addTag(request.id, request.tag);
      break;
    case "removeTag":
      removeTag(request.id, request.tag);
      break;
    case "getInitState":
      return IsInit;
    case "getCurrentSession":
      const currentSession = await loadCurrentSession("", [], request.property).catch(() => {});
      return currentSession;
  }
};

browser.runtime.onInstalled.addListener(onInstalledListener);
browser.runtime.onMessage.addListener(onMessageListener);
