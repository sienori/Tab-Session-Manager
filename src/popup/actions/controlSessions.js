import browser from "webextension-polyfill";
import clone from "clone";
import uuidv4 from "uuid/v4";
import moment from "moment";
import log from "loglevel";

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

export const sendSessionSaveMessage = (name, property = "saveAllWindows") => {
  log.info(logDir, "sendSessionSaveMessage()", name, property);
  browser.runtime.sendMessage({
    message: "saveCurrentSession",
    name: name,
    property: property
  });
};

export const sendSessionUpdateMessage = session => {
  log.log(logDir, "sendSessionUpdateMessage()", session);
  browser.runtime.sendMessage({
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

export const deleteWindow = (session, winId) => {
  log.info(logDir, "deleteWindow()", session, winId);
  session = clone(session);
  session.windowsNumber--;
  session.tabsNumber -= Object.keys(session.windows[winId]).length;
  if (session.tabsNumber <= 0) return;

  delete session.windows[winId];
  if (session.windowsInfo !== undefined) delete session.windowsInfo[winId];

  sendSessionUpdateMessage(session);
};

export const deleteTab = (session, winId, tabId) => {
  log.info(logDir, "deleteTab()", session, winId, tabId);
  session = clone(session);
  session.tabsNumber--;
  if (session.tabsNumber <= 0) return;

  delete session.windows[winId][tabId];
  if (session.windowsInfo !== undefined) delete session.windowsInfo[winId][tabId];

  if (Object.keys(session.windows[winId]).length === 0) {
    deleteWindow(session, winId);
    return;
  }

  const window = session.windows[winId];
  for (const tab in window) {
    //openerTabIdを削除
    if (window[tab].openerTabId != undefined) {
      if (window[tab].openerTabId == tabId) delete window[tab].openerTabId;
    }
    //indexを変更
    if (window[tab].index > tabId) window[tab].index--;
  }

  sendSessionUpdateMessage(session);
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

export const makeCopySession = async id => {
  log.info(logDir, "makeCopySession()", id);
  let session = await getSessions(id);

  session.id = uuidv4();
  session.date = moment(session.date)
    .add(1, "ms")
    .valueOf();
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
