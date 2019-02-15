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
      <li>
        <button onClick={handleOpenInNewWindow}>
          {browser.i18n.getMessage("openInNewWindowLabel")}
        </button>
      </li>
      <li>
        <button onClick={handleOpenInCurrentWindow}>
          {browser.i18n.getMessage("openInCurrentWindowLabel")}
        </button>
      </li>
      <li>
        <button onClick={handleAddToCurrentWindow}>
          {browser.i18n.getMessage("addToCurrentWindowLabel")}
        </button>
      </li>
      <hr />
      <li className="section" onClick={handleClickSection}>
        {browser.i18n.getMessage("editSessionLabel")}
      </li>
      <li>
        <button onClick={handleReplaceCurrentSession}>
          {browser.i18n.getMessage("replaceCurrentSessionLabel")}
        </button>
      </li>
      <li>
        <button onClick={handleReplaceCurrentWindow}>
          {browser.i18n.getMessage("replaceCurrentWindowLabel")}
        </button>
      </li>
      <li>
        <button onClick={handleAddCurrentWindow}>
          {browser.i18n.getMessage("addCurrentWindowLabel")}
        </button>
      </li>
      <li>
        <button onClick={handleMakeCopySession}>
          {browser.i18n.getMessage("makeCopySessionLabel")}
        </button>
      </li>
      <hr />
      <li>
        <button onClick={handleExportSession}>
          {browser.i18n.getMessage("exportButtonLabel")}
        </button>
      </li>
    </ul>
  );
};
