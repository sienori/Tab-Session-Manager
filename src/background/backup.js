import browser from "webextension-polyfill";
import moment from "moment";
import log from "loglevel";
import Sessions from "./sessions.js";
import { getSettings } from "src/settings/settings";

const logDir = "background/backup";

export default async function backupSessions() {
  const sessions = await Sessions.getAll().catch(() => {});

  if (!getSettings("ifBackup")) return;
  if (sessions.length == 0) return;
  log.log(logDir, "backupSessions()");

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
}

function replaceBackupFolderName(folderName) {
  log.log(logDir, "replaceBackupFolderName()", folderName);
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
  log.log(logDir, "returnFileName()", sessions);
  const sessionLabel = browser.i18n.getMessage("sessionLabel").toLowerCase();
  const sessionsLabel = browser.i18n.getMessage("sessionsLabel").toLowerCase();

  let fileName = `${moment().format(getSettings("dateFormat"))} (${sessions.length} ${
    sessions.length == 1 ? sessionLabel : sessionsLabel
  })`;

  const pattern = /\\|\/|\:|\?|\.|"|<|>|\|/g;
  fileName = fileName.replace(pattern, "-");
  return fileName;
}
