import browser from "webextension-polyfill";
import _ from "lodash";
import clone from "clone";
import log from "loglevel";

const logDir = "common/editSessions";

export const deleteWindow = (session, winId) => {
  log.info(logDir, "deleteWindow()", session, winId);
  session = clone(session);
  session.windowsNumber--;
  session.tabsNumber -= Object.keys(session.windows[winId]).length;
  if (session.tabsNumber <= 0) return Promise.reject();

  delete session.windows[winId];
  if (session.windowsInfo !== undefined) delete session.windowsInfo[winId];

  return session;
};

export const deleteTab = (session, winId, tabId) => {
  log.info(logDir, "deleteTab()", session, winId, tabId);
  session = clone(session);
  session.tabsNumber--;
  if (session.tabsNumber <= 0) return Promise.reject();
  const deletedTabIndex = session.windows[winId][tabId].index;

  delete session.windows[winId][tabId];
  if (session.windowsInfo !== undefined) delete session.windowsInfo[winId][tabId];

  if (Object.keys(session.windows[winId]).length === 0) {
    return deleteWindow(session, winId);
  }

  const window = session.windows[winId];
  for (const tab in window) {
    //openerTabIdを削除
    if (window[tab].openerTabId != undefined) {
      if (window[tab].openerTabId == tabId) delete window[tab].openerTabId;
    }
    //indexを変更
    if (window[tab].index > deletedTabIndex) window[tab].index--;
  }

  return session;
};
