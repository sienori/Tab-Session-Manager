import React from "react";
import browser from "webextension-polyfill";
import {
  sendOpenMessage,
  replaceCurrentSession,
  addCurrentWindow,
  makeCopySession,
  sendExportSessionMessage
} from "../actions/controlSessions";

export default props => {
  const handleOpenInNewWindow = () => {
    sendOpenMessage(props.session.id, "openInNewWindow");
  };
  const handleOpenInCurrentWindow = () => {
    sendOpenMessage(props.session.id, "openInCurrentWindow");
  };
  const handleAddToCurrentWindow = () => {
    sendOpenMessage(props.session.id, "addToCurrentWindow");
  };
  const handleReplaceCurrentSession = () => {
    replaceCurrentSession(props.session.id);
  };
  const handleReplaceCurrentWindow = () => {
    replaceCurrentSession(props.session.id, "saveOnlyCurrentWindow");
  };
  const handleAddCurrentWindow = () => {
    addCurrentWindow(props.session.id);
  };
  const handleMakeCopySession = () => {
    makeCopySession(props.session.id);
  };
  const handleExportSession = () => {
    sendExportSessionMessage(props.session.id);
  };
  const handleClickSection = e => {
    e.stopPropagation();
  };

  return (
    <ul>
      <li className="section" onClick={handleClickSection}>
        {browser.i18n.getMessage("openSessionLabel")}
      </li>
      <li onClick={handleOpenInNewWindow}>{browser.i18n.getMessage("openInNewWindowLabel")}</li>
      <li onClick={handleOpenInCurrentWindow}>
        {browser.i18n.getMessage("openInCurrentWindowLabel")}
      </li>
      <li onClick={handleAddToCurrentWindow}>
        {browser.i18n.getMessage("addToCurrentWindowLabel")}
      </li>
      <hr />
      <li className="section" onClick={handleClickSection}>
        {browser.i18n.getMessage("editSessionLabel")}
      </li>
      <li onClick={handleReplaceCurrentSession}>
        {browser.i18n.getMessage("replaceCurrentSessionLabel")}
      </li>
      <li onClick={handleReplaceCurrentWindow}>
        {browser.i18n.getMessage("replaceCurrentWindowLabel")}
      </li>
      <li onClick={handleAddCurrentWindow}>{browser.i18n.getMessage("addCurrentWindowLabel")}</li>
      <li onClick={handleMakeCopySession}>{browser.i18n.getMessage("makeCopySessionLabel")}</li>
      <hr />
      <li onClick={handleExportSession}>{browser.i18n.getMessage("exportButtonLabel")}</li>
    </ul>
  );
};
