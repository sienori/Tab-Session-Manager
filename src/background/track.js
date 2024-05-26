import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import { updateSession } from "./save";
import getSessions from "./getSessions";

const logDir = "background/track";

const setTrackingInfo = async (trackingWindows, isTracking) => {
  await browser.storage.session.set({ trackingInfo: { trackingWindows, isTracking } });
}

export const getTrackingInfo = async () => {
  return (await browser.storage.session.get("trackingInfo")).trackingInfo || { trackingWindows: [], isTracking: false };
}

export const setLastFocusedWindowId = async (lastFocusedWindowId) => {
  log.log(logDir, 'setLastFocusedWindowId()', lastFocusedWindowId);
  await browser.storage.session.set({ lastFocusedWindowId });
}

const getLastFocusedWindowId = async () => {
  return (await browser.storage.session.get("lastFocusedWindowId")).lastFocusedWindowId || browser.windows.WINDOW_ID_NONE;
}

export const updateTrackingSession = async (tempSession) => {
  const { trackingWindows, isTracking } = await getTrackingInfo();
  if (!isTracking) return;

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

export const startTracking = async (sessionId, originalWindowId, openedWindowId) => {
  let { trackingWindows, isTracking } = await getTrackingInfo();
  // 同一のトラッキングセッションが複数開かれた際に、最後に開かれたもののみ追跡する
  trackingWindows = trackingWindows.filter(x => x.openedWindowId != originalWindowId && x.originalWindowId != originalWindowId);
  trackingWindows.push({ sessionId, originalWindowId, openedWindowId });

  if (!isTracking) {
    browser.windows.onFocusChanged.addListener(setLastFocusedWindowId);
    browser.windows.onRemoved.addListener(endTrackingByWindowClose);
    browser.windows.onCreated.addListener(handleCreateWindow);
    isTracking = true;
    setLastFocusedWindowId(openedWindowId);
  }

  await setTrackingInfo(trackingWindows, isTracking);
  await updateTrackingStatus();
  log.log(logDir, "startTracking()", { sessionId, originalWindowId, openedWindowId, trackingWindows });
};

const handleCreateWindow = async (window) => {
  if (!getSettings("shouldTrackNewWindow")) return;

  // trackingWindowsから開かれたウィンドウのみをトラッキングセッションに追加する
  const lastFocusedWindowId = await getLastFocusedWindowId();
  const { trackingWindows } = await getTrackingInfo();
  const focusedWindow = trackingWindows.find(x => x.openedWindowId == lastFocusedWindowId || x.originalWindowId == lastFocusedWindowId);

  log.log(logDir, "handleCreateWindow()", { window, lastFocusedWindowId, trackingWindows, focusedWindow });
  if (!focusedWindow || lastFocusedWindowId == browser.windows.WINDOW_ID_NONE) return;

  await startTracking(focusedWindow.sessionId, window.id, window.id);
};

const endTrackingByWindowClose = async (removedWindowId) => {
  let { trackingWindows, isTracking } = await getTrackingInfo();
  trackingWindows = trackingWindows.filter(x => x.openedWindowId != removedWindowId);
  await setTrackingInfo(trackingWindows, isTracking);
  await finalizeEndTracking();
};

export const endTrackingBySessionId = async sessionId => {
  let { trackingWindows, isTracking } = await getTrackingInfo();
  trackingWindows = trackingWindows.filter(x => x.sessionId != sessionId);
  await setTrackingInfo(trackingWindows, isTracking);
  await finalizeEndTracking();
};

export const endTrackingByWindowDelete = async (sessionId, windowId) => {
  let { trackingWindows, isTracking } = await getTrackingInfo();
  trackingWindows = trackingWindows.filter(x => !(x.sessionId == sessionId && (x.originalWindowId == windowId || x.openedWindowId == windowId)));
  await setTrackingInfo(trackingWindows, isTracking);
  await finalizeEndTracking();
};

const finalizeEndTracking = async () => {
  let { trackingWindows, isTracking } = await getTrackingInfo();
  if (trackingWindows.length == 0) {
    isTracking = false;
    browser.windows.onFocusChanged.removeListener(setLastFocusedWindowId);
    browser.windows.onRemoved.removeListener(endTrackingByWindowClose);
    browser.windows.onCreated.removeListener(handleCreateWindow);
    await setTrackingInfo(trackingWindows, isTracking);
  }
  await updateTrackingStatus();
  log.info(logDir, "endTracking()", trackingWindows);
};

export const updateTrackingStatus = async () => {
  const { trackingWindows } = await getTrackingInfo();
  browser.runtime
    .sendMessage({ message: "updateTrackingStatus", trackingSessions: trackingWindows.map(x => x.sessionId) })
    .catch(() => { });
};

export const isTrackingSession = (tags) => {
  return tags.includes("_tracking");
};
