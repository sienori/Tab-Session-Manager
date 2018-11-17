import uuidv4 from "uuid/v4";
import log from "loglevel";
import Sessions from "./sessions.js";
import { saveSession } from "./save.js";

const logDir = "background/import";

export default async function importSessions(importedSessions) {
  log.log(logDir, "import()", importedSessions);
  //idを無視して文字列に変換
  const toString = session => {
    let retSession = {};
    Object.assign(retSession, session);
    delete retSession.id;
    return JSON.stringify(retSession);
  };

  //同一のセッションが存在するか判定
  const isExistSameSession = (session, currentSessions) => {
    for (let currentSession of currentSessions) {
      if (toString(session) === toString(currentSession)) return true;
    }
    return false;
  };

  //同一セッションが存在しなければインポートする
  for (let importedSession of importedSessions) {
    const currentSessions = await Sessions.search("date", importedSession.date);

    if (isExistSameSession(importedSession, currentSessions)) continue;

    importedSession.id = uuidv4();
    saveSession(importedSession);
  }
}
