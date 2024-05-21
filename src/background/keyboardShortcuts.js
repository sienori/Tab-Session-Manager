import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings, setSettings } from "src/settings/settings";
import { saveCurrentSession } from "./save";
import exportSessions from "./export";
import getShortcut from "src/common/getShortcut";
import { showDoneBadge } from "./setBadge";
import manifest from "src/manifest.json";

const logDir = "background/keyboardShortcuts";

export const initShortcuts = async () => {
  const isValidShortcuts = browserInfo().name == "Firefox" && browserInfo().version >= 60;
  if (!isValidShortcuts) return;
  log.info(logDir, "initShortcuts()");

  let initedShortcuts = getSettings("initedShortcuts") || [];

  const commands = manifest.commands;
  for (const commandId of Object.keys(commands)) {
    if (initedShortcuts.includes(commandId)) continue;

    try {
      await browser.commands.update({ name: commandId, shortcut: getShortcut(commandId) });
      initedShortcuts.push(commandId);
    } catch (e) {
      log.error(logDir, "initShortcuts()", e);
    }
  }
  setSettings("initedShortcuts", initedShortcuts);
};

const getCurrentTabName = async () => {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!getSettings("ifSavePrivateWindow") && tabs[0].incognito) {
    tabs = await browser.tabs.query({ active: true });
    tabs = tabs.filter(element => !element.incognito);
    const tabTitle = tabs[0] != undefined ? tabs[0].title : "";
    return tabTitle;
  } else {
    return tabs[0].title;
  }
};

export const onCommandListener = async command => {
  await init();
  log.log(logDir, "onCommandListener()", command);
  switch (command) {
    case "saveAllWindow": {
      const name = await getCurrentTabName();
      saveCurrentSession(name, [], "saveAllWindows");
      showDoneBadge();
      break;
    }
    case "saveCurrentWindow": {
      const name = await getCurrentTabName();
      saveCurrentSession(name, [], "saveOnlyCurrentWindow");
      showDoneBadge();
      break;
    }
    case "exportSessions": {
      exportSessions();
      break;
    }
  }
};
