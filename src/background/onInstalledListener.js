import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings, setSettings } from "src/settings/settings";
import { initShortcuts } from "./keyboardShortcuts";
import { init } from "./background";
import updateOldSessions from "./updateOldSessions";
import { setSessionStartTime } from "./save";
import { setAutoSave } from "./autoSave";

const logDir = "background/onInstalledListener";

const openOptionsPage = async (active, target = "information?action=updated") => {
  const url = browser.runtime.getURL(`options/index.html#${target}`);
  const sectionMatch = target.startsWith("settings?section=")
    ? target.replace("settings?section=", "")
    : "";

  if (sectionMatch) {
    await setSettings("pendingOptionsSection", sectionMatch);
  }

  const shouldUseRuntimeApi = sectionMatch && typeof browser.runtime.openOptionsPage === "function";

  if (shouldUseRuntimeApi) {
    try {
      await browser.runtime.openOptionsPage();
      return;
    } catch (error) {
      log.warn(logDir, "openOptionsPage()", error);
    }
  }

  try {
    await browser.tabs.create({
      url,
      active
    });
  } catch (error) {
    log.error(logDir, "openOptionsPage tabs.create()", error);
  }
};

export default async details => {
  if (details.reason != "install" && details.reason != "update") return;
  await init();
  await setSessionStartTime();
  log.info(logDir, "onInstalledListener()", details);
  initShortcuts();
  const isShowOptionsPage = getSettings("isShowOptionsPageWhenUpdated");

  if (details.reason === "install") {
    await openOptionsPage(true, "settings?section=backup");
  } else if (isShowOptionsPage) {
    await openOptionsPage(false);
  }
  await setSettings("isShowUpdated", details.reason === "update");
  await updateOldSessions();
  setAutoSave();
};
