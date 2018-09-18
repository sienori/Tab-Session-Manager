import browser from "webextension-polyfill";
import updateOldSessions from "./updateOldSessions";
import { AutoSaveWhenClose, setAutoSave } from "./autoSave";
const autoSaveWhenClose = new AutoSaveWhenClose();
import Sessions from "./sessions";
import { replacePage } from "./replace";
import { backupSessions, importSessions } from "./import";
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

export const SessionStartTime = Date.now();

const addListeners = () => {
  const handleReplace = () => replacePage();
  browser.tabs.onActivated.addListener(handleReplace);
  browser.windows.onFocusChanged.addListener(handleReplace);

  browser.storage.onChanged.addListener((changes, areaName) => {
    handleSettingsChange(changes, areaName);
    setAutoSave(changes, areaName);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>
    autoSaveWhenClose.handleTabUpdate(tabId, changeInfo, tab)
  );
  browser.tabs.onRemoved.addListener((tabId, removeInfo) =>
    autoSaveWhenClose.handleTabRemoved(tabId, removeInfo)
  );
  browser.tabs.onCreated.addListener(() => autoSaveWhenClose.updateTemp());
  browser.windows.onCreated.addListener(() => autoSaveWhenClose.updateTemp());
  browser.windows.onRemoved.addListener(() => autoSaveWhenClose.saveWinClose());
};

let IsInit = false;
const init = async () => {
  await initSettings();
  await Sessions.init();
  IsInit = true;
  await updateOldSessions();

  autoSaveWhenClose.saveWinClose().then(() => {
    autoSaveWhenClose.openLastSession();
    autoSaveWhenClose.removeDuplicateTemp();
  });

  setAutoSave();
  backupSessions();
  addListeners();
};
init();

const onInstalledListener = details => {
  if (details.reason != "install" && details.reason != "update") return;

  //初回起動時にオプションページを表示して設定を初期化
  browser.tabs.create({
    url: "options/index.html#information?action=updated",
    active: false
  });
};

const onMessageListener = async (request, sender, sendResponse) => {
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
