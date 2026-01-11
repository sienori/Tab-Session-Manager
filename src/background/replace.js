import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings } from "../settings/settings";

const logDir = "background/replace";

export function returnReplaceParameter(url) {
  let parameter = {};
  parameter.isReplaced =
    url.includes(browser.runtime.getURL("replaced/index.html")) ||
    url.includes(browser.runtime.getURL("replaced/replaced.html"));

  if (parameter.isReplaced) {
    let paras = url.split("?")[1].split("&");
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

export async function replacePage(windowId = browser.windows.WINDOW_ID_CURRENT) {
  const info = await browser.tabs
    .query({
      active: true,
      windowId: windowId
    })
    .catch(e => {});
  if (info && !info[0]) return;

  if (!info || info[0].status != "complete") {
    setTimeout(() => replacePage(windowId), 100);
    return;
  }

  const parameter = returnReplaceParameter(info[0].url);

  if (parameter.isReplaced && parameter.state == "redirect") {
    log.info(logDir, "replacePage()", windowId);
    let updateProperties = {};
    updateProperties.url = parameter.url;

    const bInfo = browserInfo();
    const isEnabledLoadReplace = bInfo.name == "Firefox" && bInfo.version >= "57";
    if (isEnabledLoadReplace) updateProperties.loadReplace = true;

    browser.tabs
      .update(info[0].id, updateProperties)
      .then(() => {
        if (parameter.openInReaderMode == "true") {
          toggleReaderMode(info[0].id);
        }
      })
      .catch(() => {
        updateProperties.url = returnReplaceURL(
          "open_faild",
          parameter.title,
          parameter.url,
          parameter.favIconUrl
        );
        browser.tabs.update(info[0].id, updateProperties);
      });
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
