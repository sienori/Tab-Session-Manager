import log from "loglevel";
import { openSession } from "./open.js";
import { getSessionsByTag } from "./tag.js";

const logDir = "background/startup";

export const openStartupSessions = async () => {
  log.info(logDir, "openStartupSessions()");
  const startupSessions = await getSessionsByTag("_startup");
  if (startupSessions.length == 0) return;

  for (const i in startupSessions) {
    await openSession(startupSessions[i], i == 0 ? "openInCurrentWindow" : "openInNewWindow");
  }
};
