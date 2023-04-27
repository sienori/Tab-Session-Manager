import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import { updateSession } from "./save";
import getSessions from "./getSessions";

const logDir = "background/track";

export let IsTracking = false;

let trackingWindows = [];
let lastWindowId = browser.windows.WINDOW_ID_NONE;

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

    await updateSession(trackedSession);
  }
};

export const startTracking = (sessionId, originalWindowId, openedWindowId) => {
  // 同一のトラッキングセッションが複数開かれた際に、最後に開かれたもののみ追跡する
  trackingWindows = trackingWindows.filter(x => x.openedWindowId != originalWindowId && x.originalWindowId != originalWindowId);
  trackingWindows.push({ sessionId, originalWindowId, openedWindowId });
  setFocusedId(openedWindowId);

  if (!IsTracking) {
    browser.windows.onFocusChanged.addListener(setFocusedId);
    browser.windows.onRemoved.addListener(endTrackingByWindowClose);
    browser.windows.onCreated.addListener(handleCreateWindow);
    IsTracking = true;
  }

  updateTrackingStatus();
  log.info(logDir, "startTracking()", sessionId, originalWindowId, openedWindowId, trackingWindows);
};

export const setFocusedId = (windowId) => {
  lastWindowId = windowId;
  log.info(logDir, "setFocusedId()", windowId);
}

const handleCreateWindow = (window) => {
  const trackedWindowId = lastWindowId;
  if (!getSettings("shouldTrackNewWindow")) return;

  // If the last window wasn't a valid window, skip
  if (trackedWindowId < 0) return;

  const focusedWindow = trackingWindows.find(x => x.openedWindowId === trackedWindowId || x.originalWindowId === trackedWindowId);
  // If the last window that we were in isn't being tracked, don't track the new window
  if (!focusedWindow) return;

  startTracking(focusedWindow.sessionId, window.id, window.id);
};

export const endTrackingByWindowClose = (removedWindowId) => {
  const { sessionId, originalWindowId, openedWindowId } = trackingWindows.find(x => x.openedWindowId == removedWindowId || x.originalWindowId == removedWindowId);
  trackingWindows = trackingWindows.filter(x => x.openedWindowId != removedWindowId);
  finalizeEndTracking();
  deleteWindowFromSession(sessionId, originalWindowId, openedWindowId);
};

const deleteWindowFromSession = async (sessionId, originalWindowId, openedWindowId) => {
  if (!getSettings("shouldTrackDeletedWindows")) return;

  // If this was the last window for this session, we don't want to remove it
  if (trackingWindows.filter(x => x.sessionId === sessionId).length === 0) return;

  let trackedSession = await getSessions(sessionId);
  if (!trackedSession) return;

  log.info(logDir, "deleteWindowFromSession()", sessionId, originalWindowId, openedWindowId);

  // Remove the window from the session
  delete trackedSession.windows[originalWindowId];
  delete trackedSession.windowsInfo[originalWindowId];
  delete trackedSession.windows[openedWindowId];
  delete trackedSession.windowsInfo[openedWindowId];

  // Update windows / tabs number
  trackedSession.windowsNumber = Object.keys(trackedSession.windows).length;
  trackedSession.tabsNumber = 0;
  for (const win of Object.values(trackedSession.windows)) {
    trackedSession.tabsNumber += Object.keys(win).length;
  }

  await updateSession(trackedSession);
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
    browser.windows.onFocusChanged.removeListener(setFocusedId);
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
