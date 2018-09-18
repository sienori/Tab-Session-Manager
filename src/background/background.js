import browser from "webextension-polyfill";
import uuidv4 from "uuid/v4";
import { AutoSaveWhenClose, setAutoSave } from "./autoSave.js";
const autoSaveWhenClose = new AutoSaveWhenClose();
import Sessions from "./sessions.js";
import { replacePage } from "./replace.js";
import { backupSessions, importSessions } from "./import.js";
import {
  loadCurrentSession,
  saveCurrentSession,
  saveSession,
  removeSession,
  deleteAllSessions,
  updateSession,
  renameSession
} from "./save.js";
import { openSession } from "./open.js";
import { addTag, removeTag } from "./tag.js";
import { initSettings, handleSettingsChange } from "src/settings/settings";
import exportSessions from "./export";

export const SessionStartTime = Date.now();

let IsInit = false;
async function init() {
  await initSettings();
  await Sessions.init();
  IsInit = true;
  await updateOldSessions();

  const handleReplace = () => replacePage();

  browser.tabs.onActivated.addListener(handleReplace);
  browser.windows.onFocusChanged.addListener(handleReplace);

  autoSaveWhenClose.saveWinClose().then(() => {
    autoSaveWhenClose.openLastSession();
    autoSaveWhenClose.removeDuplicateTemp();
  });

  setAutoSave();
  browser.storage.onChanged.addListener((changes, areaName) => {
    handleSettingsChange(changes, areaName);
    setAutoSave(changes, areaName);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    autoSaveWhenClose.handleTabUpdate(tabId, changeInfo, tab);
  });
  browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    autoSaveWhenClose.handleTabRemoved(tabId, removeInfo);
  });
  browser.tabs.onCreated.addListener(() => {
    autoSaveWhenClose.updateTemp();
  });
  browser.windows.onCreated.addListener(() => {
    autoSaveWhenClose.updateTemp();
  });
  browser.windows.onRemoved.addListener(() => {
    autoSaveWhenClose.saveWinClose();
  });

  backupSessions();
}
init();
browser.runtime.onInstalled.addListener(onInstalledListener);
browser.runtime.onMessage.addListener(onMessageListener);

async function onInstalledListener(details) {
  if (details.reason != "install" && details.reason != "update") return;

  //初回起動時にオプションページを表示して設定を初期化
  browser.tabs.create({
    url: "options/index.html#information?action=updated",
    active: false
  });
}

async function updateOldSessions() {
  await migrateSessionsFromStorage();

  //DBの更新が必要な場合
  //await Sessions.DBUpdate();

  addNewValues();
}

async function addNewValues() {
  const sessions = await Sessions.getAll().catch(() => {});
  for (let session of sessions) {
    if (session.windowsNumber === undefined) {
      session.windowsNumber = Object.keys(session.windows).length;

      updateSession(session);
    }
  }
}

async function migrateSessionsFromStorage() {
  // TODO:chrome無効
  const getSessionsByStorage = () => {
    return new Promise(async resolve => {
      const value = await browser.storage.local.get("sessions");
      resolve(value.sessions || []);
    });
  };
  let sessions = await getSessionsByStorage();
  if (sessions.length == 0) return;

  //タグを配列に変更
  const updateTags = () => {
    for (let i of sessions) {
      if (!Array.isArray(i.tag)) {
        i.tag = i.tag.split(" ");
      }
    }
  };
  //UUIDを追加 タグからauto,userを削除
  const updateSessionId = () => {
    for (let i of sessions) {
      if (!i["id"]) {
        i["id"] = uuidv4();

        i.tag = i.tag.filter(element => {
          return !(element == "user" || element == "auto");
        });
      }
    }
  };
  //autosaveのセッション名を変更
  const updateAutoName = () => {
    for (let i in sessions) {
      if (sessions[i].tag.includes("winClose")) {
        if (sessions[i].name === "Auto Saved - Window was closed")
          sessions[i].name = browser.i18n.getMessage("winCloseSessionName");
      } else if (sessions[i].tag.includes("regular")) {
        if (sessions[i].name === "Auto Saved - Regularly")
          sessions[i].name = browser.i18n.getMessage("regularSaveSessionName");
      }
    }
  };
  updateTags();
  updateSessionId();
  updateAutoName();

  for (let session of sessions) {
    await saveSession(session);
  }

  browser.storage.local.remove("sessions");
  return Promise.resolve;
}

async function onMessageListener(request, sender, sendResponse) {
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
}

export async function getSessions(id = null, needKeys = null) {
  let sessions;
  if (id == null) {
    sessions = await Sessions.getAll(needKeys).catch(() => {});
  } else {
    sessions = await Sessions.get(id).catch(() => {});
  }

  return sessions;
  //該当するセッションが存在しない時
  //idを指定:undefined, 非指定:[] を返す
}
