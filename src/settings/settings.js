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

  if (!Array.isArray(currentSettings.removedQueue)) {
    currentSettings.removedQueue = [];
    shouldSave = true;
  }

  if (typeof currentSettings.lastSyncTime !== "number") {
    currentSettings.lastSyncTime = 0;
    shouldSave = true;
  }

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

export const exportSettings = async () => {
  const settingsIds = getSettingsIds();

  let settingsObj = {};
  for (const id of settingsIds) {
    settingsObj[id] = getSettings(id);
  }

  const downloadUrl = URL.createObjectURL(
    new Blob([JSON.stringify(settingsObj, null, "  ")], {
      type: "application/json"
    })
  );

  await browser.downloads.download({
    url: downloadUrl,
    filename: `TabSessionManager_Settings.json`,
    saveAs: true
  });
};

export const importSettings = async e => {
  const reader = new FileReader();

  reader.onload = async () => {
    const importedSettings = JSON.parse(reader.result);
    const settingsIds = getSettingsIds();

    for (const id of settingsIds) {
      if (importedSettings[id] !== undefined) await setSettings(id, importedSettings[id]);
    }

    location.reload(true);
  };

  const file = e.target.files[0];
  reader.readAsText(file);
};

const getSettingsIds = () => {
  let settingsIds = [];
  defaultSettings.forEach(category => {
    category.elements.forEach(optionElement => {
      if (optionElement.id && optionElement.default !== undefined) settingsIds.push(optionElement.id);
      if (optionElement.childElements) {
        optionElement.childElements.forEach(childElement => {
          if (childElement.id && childElement.default !== undefined) settingsIds.push(childElement.id);
        });
      }
    });
  });
  return settingsIds;
};

// Enqueue a session-ID for later remote-delete propagation
export const enqueueRemovedId = async (sessionId) => {
  const queue = new Set(currentSettings.removedQueue);
  queue.add(sessionId);
  currentSettings.removedQueue = Array.from(queue).slice(-1000);
  await browser.storage.local.set({ Settings: currentSettings });
  log.info(logDir, "enqueueRemovedId()", sessionId);
};

// Atomically grab—and clear—the list of IDs that have been removed locally since the last sync
export const dequeueAllRemovedIds = () => {
  const queue = currentSettings.removedQueue || [];
  currentSettings.removedQueue = [];
  browser.storage.local.set({ Settings: currentSettings });
  return queue;
};

// Read the timestamp (ms) of the last successful sync
export const getLastSyncTime = () => currentSettings.lastSyncTime || 0;

// Persist a new “last sync” timestamp (defaults to now)
export const setLastSyncTime = async (ts = Date.now()) => {
  currentSettings.lastSyncTime = ts;
  await browser.storage.local.set({ Settings: currentSettings });
};