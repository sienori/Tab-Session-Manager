import browser from "webextension-polyfill";
import log from "loglevel";
import Sessions from "./sessions.js";
import { getSettings, setSettings } from "src/settings/settings";
import exportSessions from "./export.js";

const logDir = "background/backup";

// Track manual saves for scheduled backup trigger
let manualSaveCount = 0;

export const backupSessions = async () => {
  if (!getSettings("ifBackup")) return;

  if (getSettings("individualBackup")) await backupIndividualSessions();
  else await backupAllSessions();

  await setSettings("shouldPromptBackupFolder", false);
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
  const sessions = await Sessions.getAll(["id", "lastEditedTime", "tag"]).catch(() => { });

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

export const resetLastBackupTime = async (changes) => {
  const oldSettings = changes?.Settings?.oldValue;
  const newSettings = changes?.Settings?.newValue;
  const enabledBackup = !oldSettings?.ifBackup && newSettings?.ifBackup;
  const changedFolder = oldSettings?.backupFolder !== newSettings?.backupFolder;

  if (enabledBackup) await setSettings("shouldPromptBackupFolder", false);
  if (enabledBackup || changedFolder) await setSettings("lastBackupTime", 0);
};

// ============================================
// Scheduled Backup - daily at 3:00 AM + after 3 manual saves
// ============================================

export const trackManualSave = async () => {
  if (!getSettings("ifBackup") || !getSettings("ifScheduledBackup")) return;

  manualSaveCount++;
  log.log(logDir, "trackManualSave()", manualSaveCount);

  if (manualSaveCount >= 3) {
    manualSaveCount = 0;
    await backupSessions();
  }
};

export const setupScheduledBackup = async () => {
  // Clear existing alarm
  await browser.alarms.clear("scheduledBackup");

  if (!getSettings("ifBackup") || !getSettings("ifScheduledBackup")) return;

  // Schedule for 3:00 AM - will run on next wakeup if missed
  const now = new Date();
  const target = new Date();
  target.setHours(3, 0, 0, 0);

  // If it's already past 3 AM, schedule for tomorrow
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  const delayInMinutes = (target.getTime() - now.getTime()) / (1000 * 60);

  browser.alarms.create("scheduledBackup", {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 24 * 60 // Repeat every 24 hours
  });

  log.log(logDir, "setupScheduledBackup()", `Next backup at ${target.toLocaleString()}`);
};

export const runScheduledBackup = async () => {
  if (!getSettings("ifBackup") || !getSettings("ifScheduledBackup")) return;

  log.log(logDir, "runScheduledBackup()");
  await backupSessions();
};
