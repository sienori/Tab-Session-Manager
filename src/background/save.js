import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import uuidv4 from "uuid/v4";
import log from "loglevel";
import { SessionStartTime } from "./background.js";
import Sessions from "./sessions.js";
import { getSettings, setSettings } from "src/settings/settings";
import { returnReplaceParameter } from "./replace.js";
import ignoreUrls from "./ignoreUrls";
import { pushRemovedQueue, syncCloudAuto } from "./cloudSync.js";
import { getValidatedTag } from "./tag.js";
import { queryTabGroups } from "../common/tabGroups";
import { compressDataUrl } from "../common/compressDataUrl";
import getSessions from "./getSessions";
import { recordChange } from "./undo";

const logDir = "background/save";

const isEnabledTabGroups = browserInfo().name == "Chrome" && browserInfo().version >= 89;

export async function saveCurrentSession(name, tag, property) {
  log.log(logDir, "saveCurrentSession()", name, tag, property);
  const session = await loadCurrentSession(name, tag, property).catch(() => {
    return Promise.reject();
  });

  // When the user saves the current session, s/he's implicitly setting the active
  // session to the new session
  await setActiveSession(session.id, session.name, session);

  return await saveSession(session);
}

export async function loadCurrentSession(name, tag, property) {
  log.log(logDir, "loadCurrentSession()", name, tag, property);
  let session = {
    windows: {},
    windowsNumber: 0,
    windowsInfo: {},
    tabsNumber: 0,
    name: name,
    date: Date.now(),
    lastEditedTime: Date.now(),
    tag: tag,
    sessionStartTime: SessionStartTime,
    id: uuidv4()
  };

  let queryInfo = {};
  switch (property) {
    case "saveAllWindows":
      break;
    case "saveOnlyCurrentWindow":
      queryInfo.currentWindow = true;
  }

  const tabs = await browser.tabs.query(queryInfo);
  for (let tab of tabs) {
    //プライベートタブを無視
    if (!getSettings("ifSavePrivateWindow")) {
      if (tab.incognito) {
        continue;
      }
    }

    if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};

    //replacedPageなら元のページを保存
    const parameter = returnReplaceParameter(tab.url);
    if (parameter.isReplaced) {
      tab.url = parameter.url;
    }

    // Compress favicon url
    if (getSettings("compressFaviconUrl") && tab?.favIconUrl?.startsWith("data:image")) {
      const compressedDataUrl = await compressDataUrl(tab.favIconUrl);
      tab.favIconUrl = compressedDataUrl;
    }

    session.windows[tab.windowId][tab.id] = tab;
    session.tabsNumber++;
  }

  session.windowsNumber = Object.keys(session.windows).length;

  for (let i in session.windows) {
    const window = await browser.windows.get(parseInt(i));
    session.windowsInfo[i] = window;
  }

  if (isEnabledTabGroups && getSettings("saveTabGroups")) {
    const tabGroups = await queryTabGroups();
    const filteredTabGroups = tabGroups.filter(tabGroup =>
      Object.keys(session.windows).includes(String(tabGroup.windowId)));
    if (filteredTabGroups.length > 0) session.tabGroups = filteredTabGroups;
  }

  const ignoredUrlSession = ignoreUrls(session);

  return new Promise((resolve, reject) => {
    if (session.tabsNumber > 0) resolve(ignoredUrlSession);
    else reject();
  });
}

async function sendMessage(message, options = {}) {
  await browser.runtime
    .sendMessage({
      message: message,
      ...options
    })
    .catch(() => { });
}

export async function saveSession(session, isSendResponce = true, saveBySync = false) {
  log.log(logDir, "saveSession()", session, isSendResponce);
  try {
    const shouldSaveDeviceName = getSettings("shouldSaveDeviceName");
    if (shouldSaveDeviceName && !saveBySync) {
      const deviceName = getSettings("deviceName");
      const validatedTag = getValidatedTag(deviceName, session);
      if (validatedTag !== "") session.tag.push(deviceName);
    }
    await Sessions.put(session);
    if (isSendResponce) {
      sendMessage("saveSession", { session: session, saveBySync: saveBySync });
      if (!saveBySync) syncCloudAuto();
    }
    return session;
  } catch (e) {
    log.error(logDir, "saveSession()", e);
    return Promise.reject(e);
  }
}

export async function removeSession(id, isSendResponce = true) {
  log.log(logDir, "removeSession()", id, isSendResponce);
  try {
    // Remove the active session setting if the id matches, regardless of whether
    // we are tracking the active session or not.
    const activeSession = getSettings("activeSession");
    if (activeSession && activeSession.id === id) {
      setSettings('activeSession', null);
    }

    await Sessions.delete(id);
    pushRemovedQueue(id);
    if (isSendResponce) sendMessage("deleteSession", { id: id });
  } catch (e) {
    log.error(logDir, "removeSession()", e);
    return Promise.reject(e);
  }
}

export async function updateSession(
  session,
  isSendResponce = true,
  shouldUpdateEditedTime = true,
  saveBySync = false
) {
  log.log(logDir, "updateSession()", session, isSendResponce, shouldUpdateEditedTime);
  try {
    if (shouldUpdateEditedTime) session.lastEditedTime = Date.now();
    await Sessions.put(session);
    if (isSendResponce) sendMessage("updateSession", { session: session, saveBySync: saveBySync });
    return session;
  } catch (e) {
    log.error(logDir, "updateSession()", e);
    return Promise.reject(e);
  }
}

export async function renameSession(id, name) {
  log.log(logDir, "renameSession()", id, name);
  let session = await Sessions.get(id).catch(() => { });
  if (session == undefined) return;
  session.name = name.trim();
  return await updateSession(session);
}

export async function deleteAllSessions() {
  log.log(logDir, "deleteAllSessions()");
  try {
    await Sessions.deleteAll();
    sendMessage("deleteAll");
  } catch (e) {
    log.error(logDir, "deleteAllSessions()", e);
  }
}

// Persists the session corresponding to the currently active session (if any),
// with the session passed as argument in "withSession" (needs to be a valid
// session). If no argument is passed, it will fetch the current session
export async function updateActiveSession(withSession) {
  if (withSession === undefined) {
    withSession = await loadCurrentSession('', [], "saveAllWindows");
  }

  const activeSession = getSettings('activeSession');
  if (activeSession && typeof withSession === 'object') {
    const beforeSession = await getSessions(activeSession.id);
    if (beforeSession) {
      const newSession = {
        ...withSession,
        id: beforeSession.id,
        name: beforeSession.name,
        tag: beforeSession.tag,
        sessionStartTime: activeSession.sessionStartTime,
        date: beforeSession.date,
        lastEditedTime: beforeSession.lastEditedTime, // This will get replaced upon update
      };

      await updateSession(newSession);
      recordChange(beforeSession, newSession);
    }
  }
}

// Sets an internal, non-exportable setting for the currently active session
// It's non exportable because it's value is associated to the user sessions,
// which are not exported together with the settings.
// Calling the function without id and name will clear the active session
export async function setActiveSession(id, name, sessionToSave) {
  // Auto-save the active session before switching to a different one (if the
  // relevant setting is enabled)
  // If no sessionToSave is passed, updateActiveSession will fetch the current session
  if (getSettings("keepTrackOfActiveSession") && getSettings('autoSaveBeforeActiveSessionChange')) {
    await updateActiveSession(sessionToSave);
  }

  // Session start time for active sessions begins when the user either sets the active session
  setSettings('activeSession', getSettings("keepTrackOfActiveSession") && id && name
    ? {id, name, sessionStartTime: Date.now()}
    : null);
}
