import browser from "webextension-polyfill";
import uuidv4 from "uuid/v4";
import moment from "moment";
import Sessions from "./sessions.js";
import { getSettings } from "src/settings/settings";
import { saveSession } from "./save.js";

export async function importSessions(importedSessions) {
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

export async function backupSessions() {
  const sessions = await Sessions.getAll().catch([]);

  if (!getSettings("ifBackup")) return;
  if (sessions.length == 0) return;

  const downloadUrl = URL.createObjectURL(
    new Blob([JSON.stringify(sessions, null, "    ")], {
      type: "aplication/json"
    })
  );

  const backupFolder = replaceBackupFolderName(getSettings("backupFolder"));
  const fileName = returnFileName(sessions);

  await browser.downloads.download({
    url: downloadUrl,
    filename: `${backupFolder}${backupFolder == "" ? "" : "/"}${fileName}.json`,
    conflictAction: "uniquify",
    saveAs: false
  });

  removeBackupFile();
}

function replaceBackupFolderName(folderName) {
  const specialChars = /\:|\?|\.|"|<|>|\|/g; //使用できない特殊文字
  const slash = /\//g; //単一のスラッシュ
  const spaces = /\s\s+/g; //連続したスペース
  const backSlashs = /\\\\+/g; //連続したバックスラッシュ
  const sandwich = /(\s\\|\\\s)+(\s|\\)?/g; //バックスラッシュとスペースが交互に出てくるパターン
  const beginningEnd = /^(\s|\\)+|(\s|\\)+$/g; //先頭と末尾のスペース,バックスラッシュ

  folderName = folderName
    .replace(specialChars, "-")
    .replace(slash, "\\")
    .replace(spaces, " ")
    .replace(backSlashs, "\\")
    .replace(sandwich, "\\")
    .replace(beginningEnd, "");

  return folderName;
}

function returnFileName(sessions) {
  const sessionLabel = browser.i18n.getMessage("sessionLabel").toLowerCase();
  const sessionsLabel = browser.i18n.getMessage("sessionsLabel").toLowerCase();

  let fileName = `${moment().format(getSettings("dateFormat"))} (${sessions.length} ${
    sessions.length == 1 ? sessionLabel : sessionsLabel
  })`;

  const pattern = /\\|\/|\:|\?|\.|"|<|>|\|/g;
  fileName = fileName.replace(pattern, "-");
  return fileName;
}

async function removeBackupFile() {
  const backupItems = await browser.downloads.search({
    filenameRegex: `^.*${getSettings("backupFolder")}.*$`,
    urlRegex: `^blob\.${browser.runtime.getURL("")}.*$`,
    orderBy: ["-startTime"],
    exists: true
  });

  const limit = getSettings("backupFilesLimit");
  let count = 0;

  for (let i of backupItems) {
    count++;
    if (count < limit) continue;
    await browser.downloads.removeFile(i.id).catch(() => {});
    await browser.downloads
      .erase({
        id: i.id
      })
      .catch(() => {});
  }
}
