import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import log from "loglevel";
import { returnReplaceParameter } from "src/background/replace.js";
import { queryTabGroups, isEnabledTabGroups } from "../../common/tabGroups";
import { getSettings } from "src/settings/settings";
import { compressDataUrl } from "../../common/compressDataUrl";

const logDir = "popup/actions/controlSessions";

export const getSessions = async (id = null, needKeys = null) => {
  log.log(logDir, "getSessions()", id, needKeys);
  const sessions = await browser.runtime.sendMessage({
    message: "getSessions",
    id: id,
    needKeys: needKeys
  });
  return sessions;
};

export const sendOpenMessage = async (id, property, windowId = null) => {
  log.info(logDir, "sendOpenMessage()", id, property, windowId);
  let openSession = await getSessions(id);
  if (openSession === undefined) return;

  if (windowId !== null) {
    for (const win in openSession.windows) {
      if (win !== windowId) delete openSession.windows[win];
    }
  }

  browser.runtime.sendMessage({
    message: "open",
    session: openSession,
    property: property
  });
};

export const sendSessionRemoveMessage = async id => {
  log.info(logDir, "sendSessionRemoveMessage()", id);
  return await browser.runtime.sendMessage({
    message: "remove",
    id: id,
    isSendResponce: true
  });
};

export const sendSessionSaveMessage = async (name, property = "saveAllWindows") => {
  log.info(logDir, "sendSessionSaveMessage()", name, property);
  return await browser.runtime.sendMessage({
    message: "saveCurrentSession",
    name: name,
    property: property
  });
};

export const sendSessionUpdateMessage = async session => {
  log.log(logDir, "sendSessionUpdateMessage()", session);
  return await browser.runtime.sendMessage({
    message: "update",
    session: session,
    isSendResponce: true
  });
};

export const sendSesssionRenameMessage = (sessionId, sessionName) => {
  log.info(logDir, "sendSessionRenameMessage()", sessionId, sessionName);
  browser.runtime.sendMessage({
    message: "rename",
    id: sessionId,
    name: sessionName
  });
};

export const sendTagRemoveMessage = (sessionId, tagName) => {
  log.info(logDir, "sendTagRemoveMessage()", sessionId, tagName);
  browser.runtime.sendMessage({
    message: "removeTag",
    id: sessionId,
    tag: tagName
  });
};

export const sendTagAddMessage = (sessionId, tagName) => {
  log.info(logDir, "sendTagAddMessage()", sessionId, tagName);
  browser.runtime.sendMessage({
    message: "addTag",
    id: sessionId,
    tag: tagName
  });
};

export const sendStartTrackingMessage = (sessionId, originalWindowId, openedWindowId) => {
  log.info(logDir, "sendStartTrackingMessage()", sessionId, originalWindowId, openedWindowId);
  browser.runtime.sendMessage({
    message: "startTracking",
    sessionId,
    originalWindowId,
    openedWindowId
  });
};

export const sendEndTrackingByWindowDeleteMessage = (sessionId, originalWindowId) => {
  log.info(logDir, "sendendTrackingByWindowDeleteMessage()", sessionId, originalWindowId);
  browser.runtime.sendMessage({
    message: "endTrackingByWindowDelete",
    sessionId,
    originalWindowId
  });
};

export const replaceCurrentSession = async (id, property = "default") => {
  log.info(logDir, "replaceCurrentSession()", id, property);
  let currentSession = await browser.runtime.sendMessage({
    message: "getCurrentSession",
    property: property
  });
  if (currentSession == undefined) return;

  const session = await getSessions(id);
  currentSession.id = session.id;
  currentSession.name = session.name;
  currentSession.tag = session.tag;
  sendSessionUpdateMessage(currentSession);
};

const generateUniqueId = (originalId, isIdDuplicate) => {
  let id = originalId;
  while (isIdDuplicate(id)) {
    id = _.random(0, 65536);
  }
  return id;
};

export const addCurrentWindow = async (id, isTracking = false) => {
  log.info(logDir, "AddCurrentWindow()", id);
  const session = await getSessions(id);
  const currentWindow = await browser.windows.getCurrent({ populate: true });

  //tabIdをユニークなIDに更新してマップに格納
  let tabIdList = Object.values(session.windows).flatMap(window =>
    Object.values(window).map(tab => tab.id)
  );
  let updatedTabIdMap = {};
  for (const tab of currentWindow.tabs) {
    const isTabIdDuplicate = id => tabIdList.some(tabId => tabId == id);
    const newTabId = generateUniqueId(tab.id, isTabIdDuplicate);
    updatedTabIdMap[tab.id] = newTabId;
    tabIdList.push(newTabId);
  }

  const isWindowIdDuplicate = id => session.windows.hasOwnProperty(id);
  const windowId = generateUniqueId(currentWindow.id, isWindowIdDuplicate);

  //sessionを更新
  session.windows[windowId] = {};
  for (const tab of currentWindow.tabs) {
    tab.windowId = windowId;
    tab.id = updatedTabIdMap[tab.id];
    if (tab.openerTabId) tab.openerTabId = updatedTabIdMap[tab.openerTabId];

    //replasedページならURLを更新
    const replacedParams = returnReplaceParameter(tab.url);
    if (replacedParams.isReplaced) {
      tab.url = replacedParams.url;
    }

    // Compress favicon url
    if (tab?.favIconUrl?.startsWith("data:image")) {
      const compressedDataUrl = await compressDataUrl(tab.favIconUrl);
      tab.favIconUrl = compressedDataUrl;
    }

    session.windows[windowId][tab.id] = tab;
  }
  session.tabsNumber += Object.keys(session.windows[windowId]).length;
  session.windowsNumber += 1;

  delete currentWindow.tabs;
  if (session.windowsInfo) session.windowsInfo[windowId] = currentWindow;

  if (isEnabledTabGroups && getSettings("saveTabGroupsV2")) {
    const tabGroups = await queryTabGroups({ windowId: currentWindow.id });
    if (tabGroups.length > 0) {
      session.tabGroups = (session.tabGroups || []).concat(tabGroups);
    }
  }

  if (isTracking) sendStartTrackingMessage(id, windowId, currentWindow.id);
  sendSessionUpdateMessage(session);
};

export const addCurrentTab = async (sessionId, windowId) => {
  windowId = parseInt(windowId);
  log.info(logDir, "AddCurrentTab()", sessionId, windowId);
  let session = await getSessions(sessionId);
  let currentTab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
  if (!currentTab) return;

  // Set unique tabId
  const tabIdList = Object.values(session.windows).flatMap(window =>
    Object.values(window).map(tab => tab.id)
  );
  const maxTabId = Math.max(...tabIdList);
  currentTab.id = maxTabId + 1;

  // Set tab index
  currentTab.index = Object.keys(session.windows[windowId]).length;

  // Deactivate current tab
  currentTab.active = false;

  // Set windowId
  currentTab.windowId = windowId;

  // Remove openerTabId
  if (currentTab.openerTabId) delete currentTab.openerTabId;

  // Compress favicon url
  if (currentTab?.favIconUrl?.startsWith("data:image")) {
    const compressedDataUrl = await compressDataUrl(currentTab.favIconUrl);
    currentTab.favIconUrl = compressedDataUrl;
  }

  // Set tabGroup
  if (currentTab?.groupId > 0 && isEnabledTabGroups && getSettings("saveTabGroupsV2")) {
    const tabGroups = await queryTabGroups({ windowId: windowId });
    const currentTabGroup = tabGroups.find(group => group.id === currentTab.groupId);
    const hasTabGroup = session?.tabGroups.some(group => group.id === currentTab.groupId);
    if (currentTabGroup && !hasTabGroup) {
      session.tabGroups = (session.tabGroups || []).concat([currentTabGroup]);
    }
  }

  session.windows[windowId][currentTab.id] = currentTab;
  session.tabsNumber += 1;

  sendSessionUpdateMessage(session);
};

export const makeCopySession = async id => {
  log.info(logDir, "makeCopySession()", id);
  let session = await getSessions(id);

  session.id = uuidv4();
  session.date = moment(session.date).add(1, "ms").valueOf();
  session.lastEditedTime = Date.now();
  browser.runtime.sendMessage({
    message: "save",
    session: session
  });
};

export const sendExportSessionMessage = (id = null) => {
  log.info(logDir, "sendExportSessionMessage()", id);
  browser.runtime.sendMessage({
    message: "exportSessions",
    id: id
  });
};

export const sendUndoMessage = async () => {
  log.log(logDir, "sendUndoMessage()");
  browser.runtime.sendMessage({ message: "undo" });
};

export const sendRedoMessage = async () => {
  log.log(logDir, "sendRedoMessage()");
  browser.runtime.sendMessage({ message: "redo" });
};
