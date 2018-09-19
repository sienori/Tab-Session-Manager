import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import { IsOpeningSession } from "./open.js";

export function returnReplaceParameter(url) {
  let parameter = {};
  if (url.indexOf(browser.runtime.getURL("replaced/index.html")) === 0) {
    parameter.isReplaced = true;
    let paras = url.split("?")[1].split("&");
    for (let p of paras) {
      parameter[p.split("=")[0]] = decodeURIComponent(p.split("=")[1]);
    }
  } else {
    parameter.isReplaced = false;
  }

  return parameter;
}

export function returnReplaceURL(state, title, url, favIconUrl) {
  let retUrl =
    "replaced/index.html" +
    "?state=" +
    encodeURIComponent(state) +
    "&title=" +
    encodeURIComponent(title) +
    "&url=" +
    encodeURIComponent(url) +
    "&favIconUrl=" +
    encodeURIComponent(favIconUrl);

  //Reader mode
  if (url.substr(0, 17) == "about:reader?url=") {
    retUrl =
      "replaced/index.html" +
      "?state=" +
      encodeURIComponent(state) +
      "&title=" +
      encodeURIComponent(title) +
      "&url=" +
      url.substr(17) +
      "&favIconUrl=" +
      encodeURIComponent(favIconUrl) +
      "&openInReaderMode=true";
  }

  return retUrl;
}

export async function replacePage(windowId = browser.windows.WINDOW_ID_CURRENT) {
  if (IsOpeningSession) return;

  const info = await browser.tabs.query({
    active: true,
    windowId: windowId
  });
  if (info[0] == undefined) return;

  if (info[0].status != "complete") {
    setTimeout(() => replacePage(windowId), 500);
    return;
  }

  const parameter = returnReplaceParameter(info[0].url);

  if (parameter.isReplaced && parameter.state == "redirect") {
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
