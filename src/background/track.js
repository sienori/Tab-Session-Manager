import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import { queryTabGroups } from "../common/tabGroups";
import { updateSession } from "./save";
import getSessions from "./getSessions";

const logDir = "background/track";
const isEnabledTabGroups = browserInfo().name == "Chrome" && browserInfo().version >= 89;

export let IsTracking = false;

let trackingWindows = [];

export const updateTrackingSession = async (tempSession) => {
  if (!IsTracking) return;

  for (const { sessionId, originalWindowId, openedWindowId } of trackingWindows) {
    if (!tempSession.windows[openedWindowId]) continue;
    log.info(logDir, "updateTrackingSession()");

    let trackedSession = await getSessions(sessionId);
    if (!trackedSession) continue;

    //Replace windows / windowsInfo
    delete trackedSession.windows[originalWindowId];
    delete trackedSession.windowsInfo[originalWindowId];
    trackedSession.windows[openedWindowId] = tempSession.windows[openedWindowId];
    trackedSession.windowsInfo[openedWindowId] = tempSession.windowsInfo[openedWindowId];

    // Update windows / tabs number
    trackedSession.windowsNumber = Object.keys(trackedSession.windows).length;
    trackedSession.tabsNumber = 0;
    for (const win of Object.values(trackedSession.windows)) {
      trackedSession.tabsNumber += Object.keys(win).length;
    }

    //Update Group Information
    if (isEnabledTabGroups && getSettings("saveTabGroups")) {
      const filteredWindows = Object.values(trackedSession.windowsInfo).filter(window => window.type === "normal");
      const tabGroups = await Promise.all(filteredWindows.map(window => queryTabGroups({
        windowId: window.id,
      })));
      const filteredTabGroups = tabGroups.flat().filter(tabGroup =>
        Object.keys(trackedSession.windows).includes(String(tabGroup.windowId)));
      if (filteredTabGroups.length > 0) trackedSession.tabGroups = filteredTabGroups;
    }

    await updateSession(trackedSession);
  }
};

export const startTracking = (sessionId, originalWindowId, openedWindowId) => {
  // 同一のトラッキングセッションが複数開かれた際に、最後に開かれたもののみ追跡する
  trackingWindows = trackingWindows.filter(x => x.openedWindowId != originalWindowId && x.originalWindowId != originalWindowId);
  trackingWindows.push({ sessionId, originalWindowId, openedWindowId });

  if (!IsTracking) {
    browser.windows.onRemoved.addListener(endTrackingByWindowClose);
    browser.windows.onCreated.addListener(handleCreateWindow);
    IsTracking = true;
  }

  updateTrackingStatus();
  log.info(logDir, "startTracking()", trackingWindows);
};

const handleCreateWindow = (window) => {
  if (getSettings("shouldTrackNewWindow")) startTracking(trackingWindows[trackingWindows.length - 1].sessionId, window.id, window.id);
};

export const endTrackingByWindowClose = (removedWindowId) => {
  trackingWindows = trackingWindows.filter(x => x.openedWindowId != removedWindowId);
  finalizeEndTracking();
};

export const endTrackingBySessionId = sessionId => {
  trackingWindows = trackingWindows.filter(x => x.sessionId != sessionId);
  finalizeEndTracking();
};

export const endTrackingByWindowDelete = (sessionId, windowId) => {
  trackingWindows = trackingWindows.filter(x => !(x.sessionId == sessionId && (x.originalWindowId == windowId || x.openedWindowId == windowId)));
  finalizeEndTracking();
};

const finalizeEndTracking = () => {
  if (!trackingWindows) {
    IsTracking = false;
    browser.windows.onRemoved.removeListener(endTrackingByWindowClose);
    browser.windows.onCreated.removeListener(handleCreateWindow);
  }
  updateTrackingStatus();
  log.info(logDir, "endTracking()", trackingWindows);
};

export const updateTrackingStatus = () => {
  browser.runtime
    .sendMessage({ message: "updateTrackingStatus", trackingSessions: trackingWindows.map(x => x.sessionId) })
    .catch(() => { });
};

export const isTrackingSession = (tags) => {
  return tags.includes("_tracking");
};
