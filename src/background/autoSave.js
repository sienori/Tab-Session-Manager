import browser from "webextension-polyfill";
import uuidv4 from "uuid/v4";
import { openSession } from "./open.js";
import { getSessionsByTag } from "./tag.js";
import { loadCurrentSession, saveCurrentSession, saveSession, removeSession } from "./save.js";
import { getSettings } from "src/settings/settings";

let autoSaveTimer;

function startAutoSave() {
  autoSaveTimer = setInterval(async function() {
    let name = browser.i18n.getMessage("regularSaveSessionName");
    if (getSettings("useTabTitleforAutoSave")) name = await getCurrentTabName();
    const tag = ["regular"];
    const property = "saveAllWindows";
    saveCurrentSession(name, tag, property)
      .then(() => {
        removeOverLimit("regular");
      })
      .catch(() => {});
  }, getSettings("autoSaveInterval") * 60 * 1000);
}

function stopAutoSave() {
  clearInterval(autoSaveTimer);
}

//定期保存の設定が変更されたときにセット
export function setAutoSave(changes, areaName) {
  if (isChangeAutoSaveSettings(changes, areaName)) {
    stopAutoSave();
    if (!getSettings("ifAutoSave")) return;
    startAutoSave();
  }
}

function isChangeAutoSaveSettings(changes, areaName) {
  if (changes == undefined) return true; //最初の一回
  if (changes.Settings == undefined) return false;

  const oldValue = changes.Settings.oldValue;
  const newValue = changes.Settings.newValue;
  return (
    oldValue.ifAutoSave != newValue.ifAutoSave ||
    oldValue.autoSaveInterval != newValue.autoSaveInterval
  );
}

const updateTemp = async () => {
  let name = browser.i18n.getMessage("winCloseSessionName");
  if (getSettings("useTabTitleforAutoSave")) name = await getCurrentTabName();

  let session = await loadCurrentSession(name, ["temp"], "default");
  let tempSessions = await getSessionsByTag("temp");

  //現在のセッションをtempとして保存
  if (tempSessions[0]) session.id = tempSessions[0].id;
  await saveSession(session, false);
};

let updateTempTimer;
export const setUpdateTempTimer = () => {
  if (
    !getSettings("ifAutoSaveWhenClose") &&
    !getSettings("ifAutoSaveWhenExitBrowser") &&
    !getSettings("ifOpenLastSessionWhenStartUp")
  )
    return;

  clearTimeout(updateTempTimer);
  updateTempTimer = setTimeout(updateTemp, 1500);
};

export const handleTabUpdated = (tabId, changeInfo, tab) => {
  if (changeInfo.status != "complete") return;
  setUpdateTempTimer();
};

export const handleTabRemoved = (tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;
  setUpdateTempTimer();
};

export const autoSaveWhenWindowClose = async removedWindowId => {
  if (!getSettings("ifAutoSaveWhenClose")) return;

  const tempSessions = await getSessionsByTag("temp");
  if (!tempSessions[0]) return;

  let session = tempSessions[0];
  for (const windowId in session.windows) {
    if (windowId != removedWindowId) {
      delete session.windows[windowId];
      delete session.windowsInfo[windowId];
    }
  }
  session.tag = ["winClose"];
  session.id = uuidv4();
  session.windowsNumber = 1;
  session.tabsNumber = Object.keys(session.windows[removedWindowId]).length;

  await saveSession(session);
  removeOverLimit("winClose");
};





export const openLastSession = async () => {
  if (!getSettings("ifOpenLastSessionWhenStartUp")) return;

  const currentWindows = await browser.windows.getAll();
  const winCloseSessions = await getSessionsByTag("browserExit");
  await openSession(winCloseSessions[0], "openInNewWindow");

  for (const window of currentWindows) {
    await browser.windows.remove(window.id);
  }
};

export const removeDuplicateTemp = async () => {
  const tempSessions = await getSessionsByTag("temp");

  let isFirst = true;
  for (let tempSession of tempSessions) {
    if (isFirst) {
      isFirst = false;
      continue;
    }
    removeSession(tempSession.id, false);
  }
};

async function removeOverLimit(tagState) {
  let limit;
  if (tagState == "regular") limit = getSettings("autoSaveLimit");
  else if (tagState == "winClose") limit = parseInt(getSettings("autoSaveWhenCloseLimit"));

  const autoSavedArray = await getSessionsByTag(tagState, ["id", "tag", "date"]);

  //上限を超えている場合は削除
  if (autoSavedArray.length > limit) {
    const removeSessions = autoSavedArray.slice(limit);
    for (let session of removeSessions) {
      removeSession(session.id);
    }
  }
}

async function getCurrentTabName() {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tabs[0] == undefined) return "";

  if (!getSettings("ifSavePrivateWindow") && tabs[0].incognito) {
    tabs = await browser.tabs.query({
      active: true
    });
    tabs = tabs.filter(element => {
      return !element.incognito;
    });

    const tabTitle = tabs[0] != undefined ? tabs[0].title : "";
    return await tabTitle;
  } else {
    return await tabs[0].title;
  }
}
