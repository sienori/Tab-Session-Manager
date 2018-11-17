import browser from "webextension-polyfill";
import uuidv4 from "uuid/v4";
import log from "loglevel";
import { openSession } from "./open.js";
import { getSessionsByTag } from "./tag.js";
import { loadCurrentSession, saveCurrentSession, saveSession, removeSession } from "./save.js";
import { getSettings } from "src/settings/settings";

const logDir = "background/autoSave";
let autoSaveTimer;

function startAutoSave() {
  log.log(logDir, "startAutoSave()");
  autoSaveTimer = setInterval(async function() {
    log.info(logDir, "startAutoSave() autoSaveTimer");
    let name = browser.i18n.getMessage("regularSaveSessionName");
    if (getSettings("useTabTitleforAutoSave")) name = await getCurrentTabName();
    const tag = ["regular"];
    const property = "saveAllWindows";
    saveCurrentSession(name, tag, property)
      .then(() => {
        const limit = getSettings("autoSaveLimit");
        removeOverLimit("regular", limit);
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
    log.info(logDir, "setAutoSave()", changes, areaName);
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
  log.log(logDir, "updateTemp()");
  const name = await getCurrentTabName();
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
  log.info(logDir, "setUpdateTempTimer()");

  clearTimeout(updateTempTimer);
  updateTempTimer = setTimeout(updateTemp, 1500);
};

export const handleTabUpdated = (tabId, changeInfo, tab) => {
  if (changeInfo.status != "complete") return;
  log.info(logDir, "handleTabUpdated()");
  setUpdateTempTimer();
};

export const handleTabRemoved = (tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;
  log.info(logDir, "handleTabRemoved()");
  setUpdateTempTimer();
};

export const autoSaveWhenWindowClose = async removedWindowId => {
  if (!getSettings("ifAutoSaveWhenClose")) return;
  log.info(logDir, "autoSaveWhenWindowClose()", removedWindowId);

  const tempSessions = await getSessionsByTag("temp");
  if (!tempSessions[0]) return;

  let session = tempSessions[0];
  for (const windowId in session.windows) {
    if (windowId != removedWindowId) {
      delete session.windows[windowId];
      delete session.windowsInfo[windowId];
    }
  }
  if (!getSettings("useTabTitleforAutoSave"))
    session.name = browser.i18n.getMessage("winCloseSessionName");
  session.tag = ["winClose"];
  session.id = uuidv4();
  session.windowsNumber = 1;
  session.tabsNumber = Object.keys(session.windows[removedWindowId]).length;

  await saveSession(session);

  const limit = getSettings("autoSaveWhenCloseLimit");
  removeOverLimit("winClose", limit);
};

export const autoSaveWhenExitBrowser = async () => {
  const tempSessions = await getSessionsByTag("temp");
  if (!tempSessions[0]) return;
  log.info(logDir, "autoSaveWhenExitBrowser()");

  let session = tempSessions[0];
  if (!getSettings("useTabTitleforAutoSave"))
    session.name = browser.i18n.getMessage("browserExitSessionName");
  session.tag = ["browserExit"];
  if (!getSettings("ifAutoSaveWhenExitBrowser")) session.tag.push("temp");
  session.id = uuidv4();

  await saveSession(session);

  let limit = getSettings("autoSaveWhenExitBrowserLimit");
  if (!getSettings("ifAutoSaveWhenExitBrowser")) limit++;
  removeOverLimit("browserExit", limit);
  removeOverLimit("temp", 1);
  setUpdateTempTimer();
};

export const openLastSession = async () => {
  if (!getSettings("ifOpenLastSessionWhenStartUp")) return;
  log.info(logDir, "openLastSession()");

  const currentWindows = await browser.windows.getAll();
  const browserExitSessions = await getSessionsByTag("browserExit");
  if (!browserExitSessions[0]) return;

  await openSession(browserExitSessions[0], "openInNewWindow");

  for (const window of currentWindows) {
    await browser.windows.remove(window.id);
  }
};

async function removeOverLimit(tag, limit) {
  log.log(logDir, "removeOverLimit()", tag, limit);
  const taggedSessions = await getSessionsByTag(tag, ["id", "tag", "date"]);

  if (taggedSessions.length > limit) {
    const removeSessions = taggedSessions.slice(limit);
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
