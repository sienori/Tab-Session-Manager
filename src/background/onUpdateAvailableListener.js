import browser from "webextension-polyfill";
import log from "loglevel";

const logDir = "background/onUpdateAvailableListener";

export default async () => {
  const replacedPageUrl = browser.runtime.getURL("replaced");
  const tabs = await browser.tabs.query({ url: `${replacedPageUrl}*` });
  log.log(logDir, "onUpdateAvailableListener()", tabs);
  if (tabs.length === 0) browser.runtime.reload();
};