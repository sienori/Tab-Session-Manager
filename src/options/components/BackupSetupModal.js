import React, { useState } from "react";
import browser from "webextension-polyfill";
import { getSettings, setSettings, DEFAULT_BACKUP_FOLDER } from "src/settings/settings";
import "../styles/BackupSetupModal.scss";

export default function BackupSetupModal({ onClose }) {
  const [folderName, setFolderName] = useState(getSettings("backupFolder") || DEFAULT_BACKUP_FOLDER);
  const [enableBackup, setEnableBackup] = useState(
    getSettings("shouldPromptBackupFolder") !== false ? true : getSettings("ifBackup") === true
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const sanitized = folderName.trim() || DEFAULT_BACKUP_FOLDER;
    await setSettings("backupFolder", sanitized);
    await setSettings("ifBackup", enableBackup);
    await setSettings("shouldPromptBackupFolder", false);
    try {
      await browser.runtime.sendMessage({ message: "runBackupNow" });
    } catch (error) {
      console.warn("Failed to trigger immediate backup", error);
    }
    setIsSaving(false);
    if (typeof onClose === "function") onClose();
  };

  const handleSkip = async () => {
    await setSettings("shouldPromptBackupFolder", false);
    if (typeof onClose === "function") onClose();
  };

  const handleOpenImport = () => {
    window.location.hash = "#sessions";
    if (typeof onClose === "function") onClose();
  };

  return (
    <div className="backupSetupModalOverlay">
      <form className="backupSetupModal" onSubmit={handleSubmit}>
        <div className="modalHeader">
          <h2>{browser.i18n.getMessage("backupLabel")}</h2>
          <button type="button" className="closeButton" onClick={handleSkip}>×</button>
        </div>
        <p>{browser.i18n.getMessage("ifBackupCaptionLabel")}</p>
        <p className="folderHint">{browser.i18n.getMessage("backupFolderHintLabel")}</p>
        <label className="field">
          <span>{browser.i18n.getMessage("backupFolderLabel")}</span>
          <input
            type="text"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder={DEFAULT_BACKUP_FOLDER}
          />
        </label>
        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={enableBackup}
            onChange={(event) => setEnableBackup(event.target.checked)}
          />
          <span>{browser.i18n.getMessage("ifBackupLabel")}</span>
        </label>
        <div className="importHint">
          <span>{browser.i18n.getMessage("importLabel")}</span>
          <button type="button" className="linkButton" onClick={handleOpenImport}>
            {browser.i18n.getMessage("open")} →
          </button>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={handleSkip}>
            {browser.i18n.getMessage("cancelLabel")}
          </button>
          <button type="submit" disabled={isSaving}>
            {browser.i18n.getMessage("saveLabel")}
          </button>
        </div>
      </form>
    </div>
  );
}
