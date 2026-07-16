import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import log from "loglevel";
import Sessions from "./sessions";
import { updateSession, saveSession } from "./save";

const logDir = "background/updateOldSessions";

export default async () => {
  log.info(logDir, "updateOldSessions()");
  if (browserInfo().name != "Chrome") await migrateSessionsFromStorage();

  //DBの更新が必要な場合
  //await Sessions.DBUpdate();

  addNewValues();
};

const addNewValues = async () => {
  log.log(logDir, "addNewValues()");

  // Get all session keys with the necessary fields
  const needKeys = ["id", "date", "windowsNumber", "lastEditedTime"];
  const sessionKeyList = await Sessions.getAll(needKeys).catch(() => []);

  if (!sessionKeyList || sessionKeyList.length === 0) return;

  for (const sessionKey of sessionKeyList) {
    let shouldUpdate = false;

    if (sessionKey.windowsNumber === undefined) shouldUpdate = true;
    if (typeof sessionKey.date !== "number") shouldUpdate = true;
    if (!sessionKey.lastEditedTime) shouldUpdate = true;

    if (!shouldUpdate) continue;

    // Fetch the full session data only if an update is needed
    let session = await Sessions.get(sessionKey.id).catch(() => {});
    if (!session) continue;

    if (session.windowsNumber === undefined) {
      session.windowsNumber = Object.keys(session.windows).length;
    }
    if (typeof session.date !== "number") {
      session.date = moment(session.date).valueOf();
    }
    if (!session.lastEditedTime) {
      session.lastEditedTime = session.date;
    }
    await updateSession(session, true, false);
  }
};

const migrateSessionsFromStorage = async () => {
  log.log(logDir, "migrateSessionsFromStorage()");
  const getSessionsByStorage = () => {
    return new Promise(async resolve => {
      const value = await browser.storage.local.get("sessions");
      resolve(value.sessions || []);
    });
  };
  let sessions = await getSessionsByStorage();
  if (sessions.length == 0) return;
  log.log(logDir, "=>migrateSessionsFromStorage() sessions", sessions);

  //タグを配列に変更
  const updateTags = () => {
    for (let i of sessions) {
      if (!Array.isArray(i.tag)) {
        i.tag = i.tag.split(" ");
      }
    }
  };
  //UUIDを追加 タグからauto,userを削除
  const updateSessionId = () => {
    for (let i of sessions) {
      if (!i["id"]) {
        i["id"] = uuidv4();

        i.tag = i.tag.filter(element => {
          return !(element == "user" || element == "auto");
        });
      }
    }
  };
  //autosaveのセッション名を変更
  const updateAutoName = () => {
    for (let i in sessions) {
      if (sessions[i].tag.includes("winClose")) {
        if (sessions[i].name === "Auto Saved - Window was closed")
          sessions[i].name = browser.i18n.getMessage("winCloseSessionName");
      } else if (sessions[i].tag.includes("regular")) {
        if (sessions[i].name === "Auto Saved - Regularly")
          sessions[i].name = browser.i18n.getMessage("regularSaveSessionName");
      }
    }
  };
  updateTags();
  updateSessionId();
  updateAutoName();

  for (let session of sessions) {
    await saveSession(session);
  }

  browser.storage.local.remove("sessions");
  return Promise.resolve;
};
