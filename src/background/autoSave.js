import browser from "webextension-polyfill";
import uuidv4 from "uuid/v4";
import { IsOpeningSession, openSession } from "./open.js";
import { getSessionsByTag } from "./tag.js";
import { loadCurrentSession, saveCurrentSession, saveSession, removeSession } from "./save.js";
import { getSettings } from "src/settings/settings";

let autoSaveTimer;

function startAutoSave() {
  autoSaveTimer = setInterval(async function() {
    let name = browser.i18n.getMessage("regularSaveSessionName");
    if (getSettings("useTabTitleforAutoSave")) name = await getCurrentTabName();
    const tag = ["regular"];
    const property = "default";
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

export class AutoSaveWhenClose {
  constructor() {
    this.LastUpdateTime = 0;
  }

  //タブが1500ms以内に再度更新された場合は無視
  handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status != "complete") return;

    const currentUpdateTime = Date.now();
    if (currentUpdateTime - this.LastUpdateTime < 1500) {
      this.LastUpdateTime = currentUpdateTime;
      return;
    }
    this.LastUpdateTime = currentUpdateTime;
    this.updateTemp();
  }

  //ウィンドウが閉じられた時に発生するTabs.onRemovedを無視
  handleTabRemoved(tabId, removeInfo) {
    if (!removeInfo.isWindowClosing) this.updateTemp();
  }

  async updateTemp() {
    if (
      IsOpeningSession ||
      (!getSettings("ifAutoSaveWhenClose") && !getSettings("ifOpenLastSessionWhenStartUp"))
    )
      return;

    let name = browser.i18n.getMessage("winCloseSessionName");
    if (getSettings("useTabTitleforAutoSave")) name = await getCurrentTabName();

    let session = await loadCurrentSession(name, ["temp"], "default");
    let tempSessions = await getSessionsByTag("temp");

    //現在のセッションをtempとして保存
    if (tempSessions[0]) session.id = tempSessions[0].id;
    await saveSession(session, false);
  }

  async saveWinClose() {
    if (
      IsOpeningSession ||
      (!getSettings("ifAutoSaveWhenClose") && !getSettings("ifOpenLastSessionWhenStartUp"))
    )
      return;

    let tempSessions = await getSessionsByTag("temp");
    if (!tempSessions[0]) return;

    //tempをwinCloseとして保存
    tempSessions[0].tag = ["winClose"];
    tempSessions[0].id = uuidv4();
    await saveSession(tempSessions[0]);

    removeOverLimit("winClose");

    this.updateTemp();
  }

  async openLastSession() {
    if (!getSettings("ifOpenLastSessionWhenStartUp")) return;

    const currentWindows = await browser.windows.getAll();
    const winCloseSessions = await getSessionsByTag("winClose");
    await openSession(winCloseSessions[0], "openInNewWindow");

    for (const window of currentWindows) {
      await browser.windows.remove(window.id);
    }
  }

  async removeDuplicateTemp() {
    const tempSessions = await getSessionsByTag("temp");

    let isFirst = true;
    for (let tempSession of tempSessions) {
      if (isFirst) {
        isFirst = false;
        continue;
      }
      removeSession(tempSession.id, false);
    }
  }
}

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
