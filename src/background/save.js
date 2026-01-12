import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import { v4 as uuidv4 } from "uuid";
import log from "loglevel";
import Sessions from "./sessions.js";
import { getSettings } from "src/settings/settings";
import { returnReplaceParameter } from "./replace.js";
import ignoreUrls from "./ignoreUrls";
import { pushRemovedQueue, syncCloudAuto } from "./cloudSync.js";
import { getValidatedTag } from "./tag.js";
import { queryTabGroups } from "../common/tabGroups";
import { compressDataUrl } from "../common/compressDataUrl";
import {
  putThumbnail,
  putOfflinePage,
  deleteBySession as deleteAssetsBySession,
  deleteThumbnails,
  deleteOfflinePages
} from "./tabAssets";

const logDir = "background/save";
const DEFAULT_THUMBNAIL_SOURCE = "screenshot";

const ensureOffscreenDocument = async () => {
  if (!browser?.offscreen) return;
  const existing = await browser.runtime.getContexts?.({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [browser.runtime.getURL("offscreen/index.html")]
  }).catch(() => []);

  if (existing && existing.length > 0) return;

  try {
    await browser.offscreen.createDocument({
      url: "offscreen/index.html",
      reasons: ["BLOBS"],
      justification: "Generate session thumbnails"
    });
  } catch (error) {
    log.warn(logDir, "ensureOffscreenDocument()", error);
  }
};

const isEnabledTabGroups = browserInfo().name == "Chrome" && browserInfo().version >= 89;

const SUPPORTED_CAPTURE_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_OFFLINE_HTML_LENGTH = 1024 * 1024 * 2; // 2MB cap per page snapshot
const SCREENSHOT_ACTIVATION_DELAY = 180;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const isSupportedForCapture = url => {
  try {
    const { protocol } = new URL(url);
    return SUPPORTED_CAPTURE_PROTOCOLS.has(protocol);
  } catch (e) {
    return false;
  }
};

const dataUrlToBlob = async dataUrl => {
  try {
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch (e) {
    log.warn(logDir, "dataUrlToBlob()", e);
    return null;
  }
};

const fetchOfflineHtml = async url => {
  if (!isSupportedForCapture(url)) return null;
  try {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > MAX_OFFLINE_HTML_LENGTH) return text.slice(0, MAX_OFFLINE_HTML_LENGTH);
    return text;
  } catch (e) {
    log.warn(logDir, "fetchOfflineHtml()", url, e);
    return null;
  }
};

const extractAttributeValue = (tag, attribute) => {
  const regex = new RegExp(`${attribute}\\s*=\\s*("([^"]+)"|'([^']+)'|([^\\s>]+))`, "i");
  const match = tag.match(regex);
  if (!match) return null;
  return match[2] || match[3] || match[4] || null;
};

const resolveUrl = (value, base) => {
  if (!value) return null;
  try {
    return new URL(value, base).href;
  } catch (e) {
    return null;
  }
};

const findRepresentativeImageUrl = (html, baseUrl) => {
  if (!html) return null;
  const META_SELECTORS = [
    { attribute: "property", value: "og:image" },
    { attribute: "name", value: "og:image" },
    { attribute: "name", value: "twitter:image" },
    { attribute: "itemprop", value: "image" }
  ];

  for (const selector of META_SELECTORS) {
    const regex = new RegExp(`<meta[^>]+${selector.attribute}\\s*=\\s*(["'])${selector.value}\\1[^>]*>`, "i");
    const match = html.match(regex);
    if (match) {
      const content = extractAttributeValue(match[0], "content");
      const resolved = resolveUrl(content, baseUrl);
      if (resolved) return resolved;
    }
  }

  const imgRegex = /<img[^>]+>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const tag = imgMatch[0];
    const src = extractAttributeValue(tag, "src");
    const resolved = resolveUrl(src, baseUrl);
    if (resolved && !resolved.startsWith("data:")) {
      return resolved;
    }
  }

  return null;
};

const getRepresentativeImageBlob = async (html, baseUrl) => {
  const imageUrl = findRepresentativeImageUrl(html, baseUrl);
  if (!imageUrl) return null;
  try {
    const response = await fetch(imageUrl, { credentials: "omit" });
    if (!response.ok) return null;
    return await response.blob();
  } catch (e) {
    log.warn(logDir, "getRepresentativeImageBlob()", imageUrl, e);
    return null;
  }
};

const ensureWindowState = async (tab, windowStateMap) => {
  if (windowStateMap.has(tab.windowId)) return windowStateMap.get(tab.windowId);
  try {
    const win = await browser.windows.get(tab.windowId, { populate: true });
    const activeTab = win.tabs.find(t => t.active);
    const state = {
      originalActiveTabId: activeTab?.id,
      lastActiveTabId: activeTab?.id,
      wasFocused: win.focused
    };
    windowStateMap.set(tab.windowId, state);
    return state;
  } catch (e) {
    log.warn(logDir, "ensureWindowState()", tab.windowId, e);
    const fallback = { originalActiveTabId: null, lastActiveTabId: null, wasFocused: false };
    windowStateMap.set(tab.windowId, fallback);
    return fallback;
  }
};

const restoreWindows = async (windowStateMap, originalFocusedWindowId) => {
  for (const [windowId, state] of windowStateMap.entries()) {
    if (state.originalActiveTabId && state.originalActiveTabId !== state.lastActiveTabId) {
      try {
        await browser.tabs.update(state.originalActiveTabId, { active: true });
      } catch (e) {
        log.warn(logDir, "restoreWindows() tabs.update", windowId, e);
      }
    }
  }
  if (originalFocusedWindowId) {
    try {
      await browser.windows.update(originalFocusedWindowId, { focused: true });
    } catch (e) {
      log.warn(logDir, "restoreWindows() windows.update", originalFocusedWindowId, e);
    }
  }
};

const captureScreenshotBlob = async (tab, windowStateMap) => {
  try {
    const manifestVersion = browser.runtime.getManifest?.().manifest_version || 3;
    const canUseDirectCapture = manifestVersion < 3;

    const state = windowStateMap ? await ensureWindowState(tab, windowStateMap) : null;
    await browser.windows.update(tab.windowId, { focused: true }).catch(() => { });
    if (state && state.lastActiveTabId !== tab.id) {
      await browser.tabs.update(tab.id, { active: true });
      state.lastActiveTabId = tab.id;
      await wait(SCREENSHOT_ACTIVATION_DELAY);
    }

    const captureDirectly = async () => {
      let dataUrl = null;
      try {
        dataUrl = await browser.tabs.captureTab(tab.id, { format: "png" });
      } catch (error) {
        log.debug(logDir, "captureScreenshotBlob() captureTab failed", error);
      }

      if (!dataUrl) {
        try {
          dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        } catch (error) {
          log.debug(logDir, "captureScreenshotBlob() captureVisibleTab failed", error);
        }
      }

      if (!dataUrl) {
        const chromeTabs = globalThis.chrome?.tabs;
        if (chromeTabs?.captureVisibleTab) {
          dataUrl = await new Promise(resolve => {
            try {
              chromeTabs.captureVisibleTab(tab.windowId, { format: "png" }, result => {
                if (chrome.runtime?.lastError) {
                  log.debug(logDir, "captureScreenshotBlob() chrome.captureVisibleTab error", chrome.runtime.lastError.message);
                  resolve(null);
                } else {
                  resolve(result);
                }
              });
            } catch (chromeError) {
              log.warn(logDir, "captureScreenshotBlob() chrome.captureVisibleTab threw", chromeError);
              resolve(null);
            }
          });
        }
      }

      return dataUrl;
    };

    if (canUseDirectCapture) {
      const dataUrl = await captureDirectly();
      return dataUrl ? await dataUrlToBlob(dataUrl) : null;
    }

    await ensureOffscreenDocument();
    const response = await browser.runtime.sendMessage({
      message: "offscreen_captureTab",
      tabId: tab.id,
      windowId: tab.windowId,
      format: "png"
    }).catch(error => {
      log.warn(logDir, "captureScreenshotBlob() message failed", error);
      return null;
    });

    if (!response?.success || !response?.dataUrl) {
      if (response?.error) log.debug(logDir, "captureScreenshotBlob() offscreen error", response.error);

      // Fallback to direct capture if offscreen isn’t available yet (e.g., Firefox MV2)
      const fallbackDataUrl = await captureDirectly();
      return fallbackDataUrl ? await dataUrlToBlob(fallbackDataUrl) : null;
    }

    return await dataUrlToBlob(response.dataUrl);
  } catch (e) {
    log.warn(logDir, "captureScreenshotBlob()", tab.id, e);
    return null;
  }
};

const generateAssetsForTab = async (
  sessionId,
  tab,
  windowStateMap,
  imagePreference,
  originalFocusedWindowIdRef,
  sessionTabIdOverride = null,
  options = {}
) => {
  const assets = {
    offlineBackupId: null,
    thumbnailId: null,
    thumbnailType: null
  };

  const { captureAssets: shouldCaptureAssets = true, thumbnailSource = imagePreference } = options || {};
  const isCaptureSupported = isSupportedForCapture(tab.url);

  if (tab.incognito) {
    return assets;
  }

  const sessionTabId = sessionTabIdOverride ?? tab.id;

  let offlineHtml = null;
  const manifestVersion = browser.runtime.getManifest?.().manifest_version || 3;
  const canFetchOffline =
    manifestVersion >= 3 &&
    shouldCaptureAssets &&
    thumbnailSource !== "representative" &&
    isCaptureSupported;
  if (canFetchOffline) {
    offlineHtml = await fetchOfflineHtml(tab.url);
  }
  if (offlineHtml) {
    const offlineId = uuidv4();
    await putOfflinePage({
      id: offlineId,
      sessionId,
      tabId: sessionTabId,
      html: offlineHtml,
      createdAt: Date.now(),
      url: tab.url,
      title: tab.title
    });
    assets.offlineBackupId = offlineId;
  }

  let thumbnailBlob = null;
  let thumbnailType = null;

  if (imagePreference === "screenshot") {
    if (!originalFocusedWindowIdRef.current) {
      originalFocusedWindowIdRef.current = await browser.windows
        .getLastFocused()
        .then(window => window?.id)
        .catch(() => null);
    }
    thumbnailBlob = await captureScreenshotBlob(tab, windowStateMap);
    if (thumbnailBlob) thumbnailType = "screenshot";
  }

  if (!thumbnailBlob) {
    const representativeBlob = await getRepresentativeImageBlob(offlineHtml, tab.url);
    if (representativeBlob) {
      thumbnailBlob = representativeBlob;
      thumbnailType = "representative";
    }
  }

  if (thumbnailBlob) {
    const thumbnailId = uuidv4();
    await putThumbnail({
      id: thumbnailId,
      sessionId,
      tabId: sessionTabId,
      blob: thumbnailBlob,
      type: thumbnailType,
      createdAt: Date.now()
    });
    assets.thumbnailId = thumbnailId;
    assets.thumbnailType = thumbnailType;
    log.info(logDir, "generateAssetsForTab() saved thumbnail", { sessionId, tabId: sessionTabId, type: thumbnailType });
  } else {
    log.debug(logDir, "generateAssetsForTab() no thumbnail", { sessionId, tabId: sessionTabId, preference: thumbnailSource, captureAssets: shouldCaptureAssets });
  }

  return assets;
};

export async function saveCurrentSession(name, tag, property, options = {}) {
  log.log(logDir, "saveCurrentSession()", name, tag, property, options);
  const session = await loadCurrentSession(name, tag, property, {
    captureAssets: options.captureAssets !== undefined ? options.captureAssets : true,
    thumbnailSource: options.thumbnailSource
  }).catch(() => {
    return Promise.reject();
  });
  return await saveSession(session);
}

export async function loadCurrentSession(name, tag, property, options = {}) {
  log.log(logDir, "loadCurrentSession()", name, tag, property, options);
  let session = {
    windows: {},
    windowsNumber: 0,
    windowsInfo: {},
    tabsNumber: 0,
    name: name,
    date: Date.now(),
    lastEditedTime: Date.now(),
    tag: tag,
    sessionStartTime: await getSessionStartTime(),
    id: uuidv4()
  };

  let queryInfo = {};
  switch (property) {
    case "saveAllWindows":
      break;
    case "saveOnlyCurrentWindow":
      queryInfo.currentWindow = true;
  }

  const tabs = await browser.tabs.query(queryInfo);
  const imagePreference = options.thumbnailSource || DEFAULT_THUMBNAIL_SOURCE;
  const captureAssets = options.captureAssets !== undefined ? options.captureAssets : true;
  const shouldCaptureScreenshots = captureAssets && imagePreference === "screenshot";
  const windowStateMap = shouldCaptureScreenshots ? new Map() : null;
  const originalFocusedWindowRef = { current: null };

  for (const tab of tabs) {
    if (!getSettings("ifSavePrivateWindow") && tab.incognito) continue;

    if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};

    const parameter = returnReplaceParameter(tab.url);
    if (parameter.isReplaced) {
      tab.url = parameter.url;
    }

    if (getSettings("compressFaviconUrl") && tab?.favIconUrl?.startsWith("data:image")) {
      const compressedDataUrl = await compressDataUrl(tab.favIconUrl);
      tab.favIconUrl = compressedDataUrl;
    }

    let assets = {};
    if (captureAssets) {
      assets = await generateAssetsForTab(
        session.id,
        tab,
        windowStateMap,
        imagePreference,
        originalFocusedWindowRef,
        null,
        { captureAssets, thumbnailSource: imagePreference }
      );
    }

    if (assets.thumbnailId) {
      tab.thumbnailId = assets.thumbnailId;
      tab.thumbnailType = assets.thumbnailType;
    }
    if (assets.offlineBackupId) {
      tab.offlineBackupId = assets.offlineBackupId;
      tab.hasOfflineBackup = true;
    }

    session.windows[tab.windowId][tab.id] = tab;
    session.tabsNumber++;
  }

  if (shouldCaptureScreenshots && windowStateMap && windowStateMap.size > 0) {
    await restoreWindows(windowStateMap, originalFocusedWindowRef.current);
  }

  session.windowsNumber = Object.keys(session.windows).length;

  for (let i in session.windows) {
    const window = await browser.windows.get(parseInt(i));
    session.windowsInfo[i] = window;
  }

  if (isEnabledTabGroups && getSettings("saveTabGroups")) {
    // ポップアップやPWAにはタブ自体が存在しないので、normalタイプのウィンドウのみクエリする
    const filteredWindows = Object.values(session.windowsInfo).filter(window => window.type === "normal");
    const tabGroups = await Promise.all(filteredWindows.map(window => queryTabGroups({
      windowId: window.id,
    })));
    const filteredTabGroups = tabGroups.flat().filter(tabGroup =>
      Object.keys(session.windows).includes(String(tabGroup.windowId)));
    if (filteredTabGroups.length > 0) session.tabGroups = filteredTabGroups;
  }

  const filteredSession = ignoreUrls(session);
  const { removedThumbnails, removedOfflineIds } = getRemovedAssetIds(session, filteredSession);
  await Promise.all([
    deleteThumbnails(removedThumbnails),
    deleteOfflinePages(removedOfflineIds)
  ]);

  filteredSession.windowsNumber = Object.keys(filteredSession.windows).length;
  filteredSession.tabsNumber = Object.values(filteredSession.windows).reduce((count, windowTabs) => {
    return count + Object.keys(windowTabs).length;
  }, 0);

  return new Promise((resolve, reject) => {
    if (filteredSession.tabsNumber > 0) resolve(filteredSession);
    else reject();
  });
}

async function sendMessage(message, options = {}) {
  await browser.runtime
    .sendMessage({
      message: message,
      ...options
    })
    .catch(() => { });
}

export async function saveSession(session, isSendResponce = true, saveBySync = false) {
  log.log(logDir, "saveSession()", session, isSendResponce);
  try {
    const shouldSaveDeviceName = getSettings("shouldSaveDeviceName");
    if (shouldSaveDeviceName && !saveBySync) {
      const deviceName = getSettings("deviceName");
      const validatedTag = getValidatedTag(deviceName, session);
      if (validatedTag !== "") session.tag.push(deviceName);
    }
    await Sessions.put(session);
    if (isSendResponce) {
      sendMessage("saveSession", { session: session, saveBySync: saveBySync });
      if (!saveBySync) syncCloudAuto();
    }
    return session;
  } catch (e) {
    log.error(logDir, "saveSession()", e);
    return Promise.reject(e);
  }
}

export async function removeSession(id, isSendResponce = true) {
  log.log(logDir, "removeSession()", id, isSendResponce);
  try {
    await deleteAssetsBySession(id).catch(e => {
      log.warn(logDir, "removeSession() deleteAssets", e);
    });
    await Sessions.delete(id);
    pushRemovedQueue(id);
    if (isSendResponce) sendMessage("deleteSession", { id: id });
  } catch (e) {
    log.error(logDir, "removeSession()", e);
    return Promise.reject(e);
  }
}

export async function updateSession(
  session,
  isSendResponce = true,
  shouldUpdateEditedTime = true,
  saveBySync = false
) {
  log.log(logDir, "updateSession()", session, isSendResponce, shouldUpdateEditedTime);
  try {
    const previousSession = await Sessions.get(session.id).catch(() => null);
    if (shouldUpdateEditedTime) session.lastEditedTime = Date.now();
    await Sessions.put(session);
    if (previousSession) {
      const { removedThumbnails, removedOfflineIds } = getRemovedAssetIds(previousSession, session);
      await Promise.all([
        deleteThumbnails(removedThumbnails),
        deleteOfflinePages(removedOfflineIds)
      ]);
    }
    if (isSendResponce) sendMessage("updateSession", { session: session, saveBySync: saveBySync });
    return session;
  } catch (e) {
    log.error(logDir, "updateSession()", e);
    return Promise.reject(e);
  }
}

export async function renameSession(id, name) {
  log.log(logDir, "renameSession()", id, name);
  let session = await Sessions.get(id).catch(() => { });
  if (session == undefined) return;
  session.name = name.trim();
  return await updateSession(session);
}

export async function deleteAllSessions() {
  log.log(logDir, "deleteAllSessions()");
  try {
    await Sessions.deleteAll();
    sendMessage("deleteAll");
  } catch (e) {
    log.error(logDir, "deleteAllSessions()", e);
  }
}

export const captureAssetsForLiveTab = async (sessionId, tabId, overrideTabId = null, options = {}) => {
  log.log(logDir, "captureAssetsForLiveTab()", sessionId, tabId, overrideTabId, options);
  try {
    const tab = await browser.tabs.get(tabId);
    const imagePreference = options.thumbnailSource || DEFAULT_THUMBNAIL_SOURCE;
    const shouldCaptureScreenshots = options.captureAssets !== false && imagePreference === "screenshot";
    const windowStateMap = shouldCaptureScreenshots ? new Map() : null;
    const originalFocusedWindowRef = { current: null };
    const assets = await generateAssetsForTab(
      sessionId,
      tab,
      windowStateMap,
      imagePreference,
      originalFocusedWindowRef,
      overrideTabId ?? tabId,
      {
        captureAssets: options.captureAssets !== false,
        thumbnailSource: imagePreference
      }
    );

    if (shouldCaptureScreenshots && windowStateMap && windowStateMap.size > 0) {
      await restoreWindows(windowStateMap, originalFocusedWindowRef.current);
    }

    return assets;
  } catch (e) {
    log.error(logDir, "captureAssetsForLiveTab()", e);
    return {
      offlineBackupId: null,
      thumbnailId: null,
      thumbnailType: null
    };
  }
};

const getSessionStorage = () => browser.storage?.session;
const getLocalStorage = () => browser.storage?.local;

export const setSessionStartTime = async () => {
  const sessionStorage = getSessionStorage();
  if (sessionStorage) {
    await sessionStorage.set({ sessionStartTime: Date.now() });
    return;
  }

  const localStorage = getLocalStorage();
  if (localStorage) {
    await localStorage.set({ sessionStartTimeFallback: Date.now() });
  }
};

export const getSessionStartTime = async () => {
  const sessionStorage = getSessionStorage();
  if (sessionStorage) {
    return (await sessionStorage.get("sessionStartTime")).sessionStartTime || Date.now();
  }

  const localStorage = getLocalStorage();
  if (localStorage) {
    return (await localStorage.get("sessionStartTimeFallback")).sessionStartTimeFallback || Date.now();
  }

  return Date.now();
};

function getRemovedAssetIds(beforeSession, afterSession) {
  const removedThumbnails = new Set();
  const removedOfflineIds = new Set();

  if (!beforeSession?.windows) {
    return { removedThumbnails: [], removedOfflineIds: [] };
  }

  const afterTabsMap = new Map();
  if (afterSession?.windows) {
    for (const [windowId, tabs] of Object.entries(afterSession.windows)) {
      for (const [tabId, tab] of Object.entries(tabs)) {
        afterTabsMap.set(`${windowId}:${tabId}`, tab);
      }
    }
  }

  for (const [windowId, tabs] of Object.entries(beforeSession.windows)) {
    for (const [tabId, tab] of Object.entries(tabs)) {
      const key = `${windowId}:${tabId}`;
      const nextTab = afterTabsMap.get(key);
      if (!nextTab) {
        if (tab?.thumbnailId) removedThumbnails.add(tab.thumbnailId);
        if (tab?.offlineBackupId) removedOfflineIds.add(tab.offlineBackupId);
      } else {
        if (tab?.thumbnailId && tab.thumbnailId !== nextTab.thumbnailId) {
          removedThumbnails.add(tab.thumbnailId);
        }
        if (tab?.offlineBackupId && tab.offlineBackupId !== nextTab.offlineBackupId) {
          removedOfflineIds.add(tab.offlineBackupId);
        }
      }
    }
  }

  return {
    removedThumbnails: Array.from(removedThumbnails),
    removedOfflineIds: Array.from(removedOfflineIds)
  };
}
