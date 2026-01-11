import browser from "webextension-polyfill";
import log from "loglevel";
import Sessions from "./sessions.js";
import { getSettings, setSettings } from "src/settings/settings";
import exportSessions from "./export.js";

const logDir = "background/backup";

export const backupSessions = async () => {
  if (!getSettings("ifBackup")) return;

  if (getSettings("individualBackup")) backupIndividualSessions();
  else backupAllSessions();
};

const backupIndividualSessions = async () => {
  log.log(logDir, "backupIndividualSessions");

  const currentTime = Date.now();
  const lastBackupTime = getSettings("lastBackupTime") || 0;
  const backupFolder = getSettings("backupFolder");
  const labels = {
    regular: browser.i18n.getMessage("regularSaveSessionName"),
    browserExit: browser.i18n.getMessage("browserExitSessionName"),
    winClose: browser.i18n.getMessage("winCloseSessionName"),
    userSave: browser.i18n.getMessage("displayUserLabel")
  };
  const sessions = await Sessions.getAll(["id", "lastEditedTime", "tag"]).catch(() => {});

  for (let session of sessions) {
    if (session.lastEditedTime < lastBackupTime) continue;
    if (session.tag.includes("temp")) continue;

    let folderName = backupFolder;
    if (session.tag.includes("regular")) folderName += `\/${labels.regular}`;
    else if (session.tag.includes("winClose")) folderName += `\/${labels.winClose}`;
    else if (session.tag.includes("browserExit")) folderName += `\/${labels.browserExit}`;
    else folderName += `\/${labels.userSave}`;

    await exportSessions(session.id, folderName, true);
  }

  setSettings("lastBackupTime", currentTime);
};

const backupAllSessions = async () => {
  log.log(logDir, "backupAllSessions");
  const folder = getSettings("backupFolder");
  await exportSessions(null, folder, true);
};

export const resetLastBackupTime = changes => {
  const isChangedBackupSettings =
    (!changes?.Settings?.oldValue?.ifBackup && changes?.Settings?.newValue?.ifBackup) ||
    changes?.Settings?.oldValue?.backupFolder !== changes?.Settings?.newValue?.backupFolder;
  if (isChangedBackupSettings) setSettings("lastBackupTime", 0);
};
