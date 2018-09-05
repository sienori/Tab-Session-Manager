/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

async function importSessions(importedSessions) {
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

    importedSession.id = UUID.generate();
    saveSession(importedSession);
  }
}

async function backupSessions() {
  const sessions = await Sessions.getAll().catch([]);

  if (!S.get().ifBackup) return;
  if (sessions.length == 0) return;

  const downloadUrl = URL.createObjectURL(
    new Blob([JSON.stringify(sessions, null, "    ")], {
      type: "aplication/json"
    })
  );

  const backupFolder = S.get().backupFolder;
  const fileName = returnFileName(sessions);

  await browser.downloads.download({
    url: downloadUrl,
    filename: `${backupFolder}${backupFolder == "" ? "" : "/"}${fileName}.json`,
    conflictAction: "uniquify",
    saveAs: false
  });

  removeBackupFile();
}

function returnFileName(sessions) {
  const sessionLabel = browser.i18n.getMessage("sessionLabel").toLowerCase();
  const sessionsLabel = browser.i18n.getMessage("sessionsLabel").toLowerCase();

  let fileName = `${moment().format(S.get().dateFormat)} (${sessions.length} ${
    sessions.length == 1 ? sessionLabel : sessionsLabel
  })`;

  const pattern = /\\|\/|\:|\?|\.|"|<|>|\|/g;
  fileName = fileName.replace(pattern, "-");
  return fileName;
}

async function removeBackupFile() {
  const backupItems = await browser.downloads.search({
    filenameRegex: `^.*${S.get().backupFolder}.*$`,
    urlRegex: `^blob\.${browser.runtime.getURL("")}.*$`,
    orderBy: ["-startTime"],
    exists: true
  });

  const limit = S.get().backupFilesLimit;
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
