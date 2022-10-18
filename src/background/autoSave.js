import browser from "webextension-polyfill";
import uuidv4 from "uuid/v4";
import log from "loglevel";
import { openSession } from "./open.js";
import { getSessionsByTag } from "./tag.js";
import { loadCurrentSession, saveCurrentSession, saveSession, removeSession } from "./save.js";
import { getSettings } from "src/settings/settings";
import ignoreUrls from "./ignoreUrls";
import { IsTracking, updateTrackingSession } from "./track.js";

const logDir = "background/autoSave";
let autoSaveTimer;

const autoSaveRegular = async () => {
  log.info(logDir, "autoSaveRegular()");
  try {
    const name = getSettings("useTabTitleforAutoSave")
      ? await getCurrentTabName()
      : browser.i18n.getMessage("regularSaveSessionName");
    const tag = ["regular"];
    const property = "saveAllWindows";
    const session = await loadCurrentSession(name, tag, property);

    const isChanged = await isChangedAutoSaveSession(session);
    if (!isChanged) return;

    await saveSession(session);
    const limit = getSettings("autoSaveLimit");
    removeOverLimit("regular", limit);
  } catch (e) {
    log.error(logDir, "autoSaveRegular()", e);
  }
};

function startAutoSave() {
  log.log(logDir, "startAutoSave()");
  autoSaveTimer = setInterval(autoSaveRegular, getSettings("autoSaveInterval") * 60 * 1000);
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
  try {
    const name = await getCurrentTabName();
    let session = await loadCurrentSession(name, ["temp"], "default");
    const tempSessions = await getSessionsByTag("temp");

    //現在のセッションをtempとして保存
    if (tempSessions[0]) session.id = tempSessions[0].id;
    await saveSession(session, false);

    if (IsTracking) updateTrackingSession(session);
  } catch (e) {
    log.error(logDir, "updateTemp()", e);
  }
};

let updateTempTimer;
export const setUpdateTempTimer = () => {
  if (
    !getSettings("ifAutoSaveWhenClose") &&
    !getSettings("ifAutoSaveWhenExitBrowser") &&
    !getSettings("ifOpenLastSessionWhenStartUp") &&
    !IsTracking
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

export const autoSaveWhenOpenInCurrentWindow = async () => {
  if (!getSettings("ifAutoSaveWhenClose")) return;
  const currentWindow = await browser.windows.getCurrent({ populate: true });
  if (currentWindow.tabs.length > 2) await autoSaveWhenWindowClose(currentWindow.id);
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
  if (getSettings("useTabTitleforAutoSave")) {
    const activeTab = Object.values(session.windows[removedWindowId]).find(tab => tab.active);
    session.name = activeTab.title;
  } else {
    session.name = browser.i18n.getMessage("winCloseSessionName");
  }
  session.date = Date.now();
  session.tag = ["winClose"];
  session.id = uuidv4();
  session.windowsNumber = 1;
  session.tabsNumber = Object.keys(session.windows[removedWindowId]).length;
  
  if (session.tabsNumber != 1)
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

//前回の自動保存からタブが変わっているか判定
async function isChangedAutoSaveSession(session) {
  log.log(logDir, "isChangedAutoSaveSession()");
  const regularSessions = await getSessionsByTag("regular", ["id", "tag", "date", "windows"]);
  if (regularSessions.length == 0) return true;

  const tabsToString = session => {
    let retArray = [];
    for (let windowNo in session.windows) {
      retArray.push(windowNo);
      for (let tabNo in session.windows[windowNo]) {
        const tab = session.windows[windowNo][tabNo];
        retArray.push(tab.id, tab.url);
      }
    }
    return retArray.toString();
  };

  //前回保存時とタブが異なればtrue
  return tabsToString(regularSessions[0]) != tabsToString(session);
}
