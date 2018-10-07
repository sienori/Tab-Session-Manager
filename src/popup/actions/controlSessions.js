import browser from "webextension-polyfill";
import clone from "clone";
import uuidv4 from "uuid/v4";
import moment from "moment";

export const getSessions = async (id = null, needKeys = null) => {
  const sessions = await browser.runtime.sendMessage({
    message: "getSessions",
    id: id,
    needKeys: needKeys
  });
  return sessions;
};

export const sendOpenMessage = async (id, property, windowId = null) => {
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

export const sendSessionRemoveMessage = id => {
  browser.runtime.sendMessage({
    message: "remove",
    id: id,
    isSendResponce: true
  });
};

export const sendSessionSaveMessage = (name, property = "saveAllWindows") => {
  browser.runtime.sendMessage({
    message: "saveCurrentSession",
    name: name,
    property: property
  });
};

export const sendSessionUpdateMessage = session => {
  browser.runtime.sendMessage({
    message: "update",
    session: session,
    isSendResponce: true
  });
};

export const sendSesssionRenameMessage = (sessionId, sessionName) => {
  browser.runtime.sendMessage({
    message: "rename",
    id: sessionId,
    name: sessionName
  });
};

export const sendTagRemoveMessage = (sessionId, tagName) => {
  browser.runtime.sendMessage({
    message: "removeTag",
    id: sessionId,
    tag: tagName
  });
};

export const sendTagAddMessage = (sessionId, tagName) => {
  browser.runtime.sendMessage({
    message: "addTag",
    id: sessionId,
    tag: tagName
  });
};

export const deleteWindow = (session, winId) => {
  session = clone(session);
  session.windowsNumber--;
  session.tabsNumber -= Object.keys(session.windows[winId]).length;
  if (session.tabsNumber <= 0) return;

  delete session.windows[winId];
  if (session.windowsInfo !== undefined) delete session.windowsInfo[winId];

  sendSessionUpdateMessage(session);
};

export const deleteTab = (session, winId, tabId) => {
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
  browser.runtime.sendMessage({
    message: "exportSessions",
    id: id
  });
};
