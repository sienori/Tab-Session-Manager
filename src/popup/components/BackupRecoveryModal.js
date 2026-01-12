import React, { useState } from "react";
import browser from "webextension-polyfill";
import { getSettings, setSettings, DEFAULT_BACKUP_FOLDER } from "src/settings/settings";
import "../styles/BackupRecoveryModal.scss";

export default function BackupRecoveryModal({ closeModal }) {
  const [folderName, setFolderName] = useState(getSettings("backupFolder") || DEFAULT_BACKUP_FOLDER);
  const [enableBackup, setEnableBackup] = useState(
    getSettings("shouldPromptBackupFolder") !== false ? true : getSettings("ifBackup") === true
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const sanitized = folderName.trim() || DEFAULT_BACKUP_FOLDER;
    await setSettings("backupFolder", sanitized);
    await setSettings("ifBackup", enableBackup);
    await setSettings("shouldPromptBackupFolder", false);
    try {
      await browser.runtime.sendMessage({ message: "runBackupNow" });
    } catch (error) {
      console.warn("Failed to trigger backup", error);
    }
    setIsSaving(false);
    if (closeModal) closeModal();
  };

  const handleSkip = async () => {
    await setSettings("shouldPromptBackupFolder", false);
    if (closeModal) closeModal();
  };

  const handleOpenImport = async () => {
    await setSettings("shouldPromptBackupFolder", false);
    await browser.tabs.create({ url: browser.runtime.getURL("options/index.html#sessions"), active: true });
    window.close();
  };

  return (
    <form className="backupRecoveryModal" onSubmit={e => e.preventDefault()}>
      <p>{browser.i18n.getMessage("ifBackupCaptionLabel")}</p>
      <p className="folderHint">{browser.i18n.getMessage("backupFolderHintLabel")}</p>
      <label className="field">
        <span>{browser.i18n.getMessage("backupFolderLabel")}</span>
        <input
          type="text"
          value={folderName}
          onChange={event => setFolderName(event.target.value)}
          placeholder={DEFAULT_BACKUP_FOLDER}
        />
      </label>
      <label className="checkboxRow">
        <input
          type="checkbox"
          checked={enableBackup}
          onChange={event => setEnableBackup(event.target.checked)}
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
        <button type="button" className="secondary" onClick={handleSkip} disabled={isSaving}>
          {browser.i18n.getMessage("cancelLabel")}
        </button>
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {browser.i18n.getMessage("saveLabel")}
        </button>
      </div>
    </form>
  );
}
