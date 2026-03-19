import browser from "webextension-polyfill";
import log from "loglevel";
import Sessions from "./sessions.js";
import { pushRemovedQueue } from "./cloudSync.js";
import { endTrackingBySessionId } from "./track.js";

const logDir = "background/removeSession";

export default async function removeSession(id, isSendResponse = true) {
  log.log(logDir, "removeSession()", id, isSendResponse);
  endTrackingBySessionId(id).catch(() => {});
  try {
    await Sessions.delete(id);
    pushRemovedQueue(id);
    if (isSendResponse) {
      browser.runtime.sendMessage({ message: "deleteSession", id: id }).catch(() => {});
    }
  } catch (e) {
    log.error(logDir, "removeSession()", e);
    return Promise.reject(e);
  }
}
