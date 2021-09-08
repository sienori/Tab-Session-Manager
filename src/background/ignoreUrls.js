import browser from "webextension-polyfill";
import clone from "clone";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import { deleteTab } from "src/common/editSessions";

const logDir = "background/ignoreUrls";

const matchesPageUrl = (pageUrl, urlPattern) => {
  const pattern = urlPattern
    .trim()
    .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, match => (match === "*" ? ".*" : "\\" + match));
  if (pattern === "") return false;
  return RegExp("^" + pattern + "$").test(pageUrl);
};

export default session => {
  const ignoreUrlList = getSettings("ignoreUrlList").split("\n");
  ignoreUrlList.push(`${browser.runtime.getURL("popup/index.html")}*`);
  log.log(logDir, "ignoreUrls()", session, ignoreUrlList);

  let editedSession = clone(session);

  for (let winId in session.windows) {
    for (let tabId in session.windows[winId]) {
      const isMatched = ignoreUrlList.some(urlPattern =>
        matchesPageUrl(session.windows[winId][tabId].url, urlPattern)
      );
      if (isMatched) editedSession = deleteTab(editedSession, winId, tabId);
    }
  }

  log.log(logDir, "=> ignoreUrls()", editedSession);
  return editedSession;
};
