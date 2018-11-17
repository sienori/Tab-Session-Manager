import browser from "webextension-polyfill";
import log from "loglevel";
import defaultSettings from "./defaultSettings";

const logDir = "settings/settings";
let currentSettings = {};

export const initSettings = async () => {
  const response = await browser.storage.local.get("Settings");
  currentSettings = response.Settings || {};
  let shouldSave = false;

  const pushSettings = element => {
    if (element.id == undefined || element.default == undefined) return;
    if (currentSettings[element.id] == undefined) {
      currentSettings[element.id] = element.default;
      shouldSave = true;
    }
  };

  const fetchDefaultSettings = () => {
    defaultSettings.forEach(category => {
      category.elements.forEach(optionElement => {
        pushSettings(optionElement);
        if (optionElement.childElements) {
          optionElement.childElements.forEach(childElement => {
            pushSettings(childElement);
          });
        }
      });
    });
  };

  fetchDefaultSettings();
  if (shouldSave) await browser.storage.local.set({ Settings: currentSettings });
};

export const setSettings = async (id, value) => {
  log.info(logDir, "setSettings()", id, value);
  currentSettings[id] = value;
  await browser.storage.local.set({ Settings: currentSettings });
};

export const getSettings = id => {
  return currentSettings[id];
};

export const resetAllSettings = async () => {
  log.info(logDir, "resetAllSettings()");
  currentSettings = {};
  await browser.storage.local.set({ Settings: currentSettings });
  await initSettings();
};

export const handleSettingsChange = (changes, area) => {
  if (Object.keys(changes).includes("Settings")) {
    currentSettings = changes.Settings.newValue;
  }
};
