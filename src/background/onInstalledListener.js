import browser from "webextension-polyfill";
import log from "loglevel";
import { initSettings, getSettings, setSettings } from "src/settings/settings";

const logDir = "background/onInstalledListener";

const openOptionsPage = active => {
  browser.tabs.create({
    url: "options/index.html#information?action=updated",
    active: active
  });
};

export let isUpdated = false;

export default async details => {
  if (details.reason != "install" && details.reason != "update") return;
  log.info(logDir, "onInstalledListener()", details);
  isUpdated = true;
  await initSettings();
  const isShowOptionsPage = getSettings("isShowOptionsPageWhenUpdated");

  if (isShowOptionsPage) {
    openOptionsPage(false);
  }
  setSettings("isShowUpdated", true);
};
