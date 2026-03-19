import log from "loglevel";
import { getSettings } from "src/settings/settings";
import { saveCurrentSession, updateSession } from "./save";
import { getTrackingInfo, startTracking } from "./track";

const logDir = "background/saveCurrentSessionWithTracking";

const isTrackedWindow = (trackingWindows, windowId) => {
  return trackingWindows.some(
    ({ originalWindowId, openedWindowId }) =>
      originalWindowId == windowId || openedWindowId == windowId
  );
};

export default async function saveCurrentSessionWithTracking(name, tag, property) {
  const session = await saveCurrentSession(name, tag, property);

  if (property !== "saveOnlyCurrentWindow") return session;
  if (!getSettings("autoTrackCurrentWindowSession")) return session;

  const currentWindowId = parseInt(Object.keys(session.windows)[0]);
  if (Number.isNaN(currentWindowId)) return session;

  const { trackingWindows } = await getTrackingInfo();
  if (isTrackedWindow(trackingWindows, currentWindowId)) {
    log.log(logDir, "saveCurrentSessionWithTracking() tracking skipped", {
      sessionId: session.id,
      currentWindowId
    });
    return session;
  }

  if (!session.tag.includes("_tracking")) {
    session.tag.push("_tracking");
    await updateSession(session);
  }

  await startTracking(session.id, currentWindowId, currentWindowId);
  return session;
}
