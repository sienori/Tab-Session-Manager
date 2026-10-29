import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings } from "../settings/settings";

const logDir = "background/replace";
const pendingTabs = new Set();

export function returnReplaceParameter(url = "") {
  let parameter = {};
  const pageUrl = url.split("?")[0];
  parameter.isReplaced =
    pageUrl === browser.runtime.getURL("replaced/index.html") ||
    pageUrl === browser.runtime.getURL("replaced/replaced.html");

  if (parameter.isReplaced) {
    let paras = (url.split("?")[1] || "").split("&");
    for (let p of paras) {
      parameter[p.split("=")[0]] = decodeURIComponent(p.split("=")[1]);
    }
  }
  return parameter;
}

export function returnReplaceURL(state, title, url, favIconUrl) {
  const theme = getSettings("theme");

  let retUrl =
    "replaced/index.html" +
    "?state=" +
    encodeURIComponent(state) +
    "&title=" +
    encodeURIComponent(title) +
    "&url=" +
    encodeURIComponent(url) +
    "&favIconUrl=" +
    encodeURIComponent(favIconUrl) +
    "&theme=" +
    theme;

  //Reader mode
  if (url.startsWith("about:reader?url=")) {
    retUrl =
      "replaced/index.html" +
      "?state=" +
      encodeURIComponent(state) +
      "&title=" +
      encodeURIComponent(title) +
      "&url=" +
      url.slice(17) +
      "&favIconUrl=" +
      encodeURIComponent(favIconUrl) +
      "&openInReaderMode=true" +
      "&theme=" +
      theme;
  }

  return retUrl;
}

export async function replacePage(windowId = browser.windows.WINDOW_ID_CURRENT, tabId) {
  let tab;
  try {
    tab =
      tabId === undefined
        ? (await browser.tabs.query({ active: true, windowId }))[0]
        : await browser.tabs.get(tabId);
    if (!tab || pendingTabs.has(tab.id)) return;
    tabId = tab.id;
    pendingTabs.add(tabId);
  } catch (error) {
    log.warn(logDir, "replacePage()", error);
    return;
  }

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) tab = await browser.tabs.get(tabId);
      if (!tab.active || tab.status !== "complete") return;
      const parameter = returnReplaceParameter(tab.url);
      if (!parameter.isReplaced || !parameter.url) return;

      log.info(logDir, "replacePage()", tabId);
      const updateProperties = { url: parameter.url };
      const bInfo = browserInfo();
      if (bInfo.name == "Firefox" && parseInt(bInfo.version, 10) >= 57) {
        updateProperties.loadReplace = true;
      }

      try {
        await browser.tabs.update(tabId, updateProperties);
        if (parameter.openInReaderMode == "true") toggleReaderMode(tabId);
        return;
      } catch (error) {
        log.warn(logDir, "replacePage()", tabId, error);
        if (
          String(error.message || error).includes("Tabs cannot be edited right now") &&
          attempt < 2
        ) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        if (parameter.state != "open_faild") {
          await browser.tabs.update(tabId, {
            ...updateProperties,
            url: returnReplaceURL(
              "open_faild",
              parameter.title,
              parameter.url,
              parameter.favIconUrl
            )
          });
        }
        return;
      }
    }
  } catch (error) {
    log.warn(logDir, "replacePage()", tabId, error);
  } finally {
    pendingTabs.delete(tabId);
  }
}

function toggleReaderMode(id) {
  if (browserInfo().name === "Chrome") return;
  log.log(logDir, "toggleReaderMode()", id);
  browser.tabs.toggleReaderMode(id);
  browser.tabs.get(id).then(info => {
    if (info.status != "complete") {
      setTimeout(() => {
        toggleReaderMode(id);
      }, 500);
      return;
    }
    if (info.isArticle) browser.tabs.toggleReaderMode(id);
  });
}
