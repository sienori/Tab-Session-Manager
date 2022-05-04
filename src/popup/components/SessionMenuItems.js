import React from "react";
import browser from "webextension-polyfill";
import {
  sendOpenMessage,
  sendTagAddMessage,
  sendTagRemoveMessage,
  replaceCurrentSession,
  addCurrentWindow,
  makeCopySession,
  sendExportSessionMessage
} from "../actions/controlSessions";
import NewWindowIcon from "../icons/newWindow.svg";
import EditIcon from "../icons/edit.svg";

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
    addCurrentWindow(props.session.id, props.isTracking);
  };
  const handleMakeCopySession = () => {
    makeCopySession(props.session.id);
  };
  const handleRegisterTracking = () => {
    sendTagAddMessage(props.session.id, "_tracking");
  };
  const handleRemoveTracking = () => {
    sendTagRemoveMessage(props.session.id, "_tracking");
  };
  const handleRegisterStartup = () => {
    sendTagAddMessage(props.session.id, "_startup");
  };
  const handleRemoveStartup = () => {
    sendTagRemoveMessage(props.session.id, "_startup");
  };
  const handleExportSession = () => {
    sendExportSessionMessage(props.session.id);
  };
  const handleClickSection = e => {
    e.stopPropagation();
  };

  const isTracking = () => props.session.tag.includes("_tracking");

  const isStartup = () => props.session.tag.includes("_startup");

  return (
    <ul>
      <li className="section" onClick={handleClickSection}>
        <NewWindowIcon />
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
        <EditIcon />
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
        <button onClick={isTracking() ? handleRemoveTracking : handleRegisterTracking}>
          {browser.i18n.getMessage(isTracking() ? "removeTrackingLabel" : "registerTrackingLabel")}
        </button>
      </li>
      <li>
        <button onClick={isStartup() ? handleRemoveStartup : handleRegisterStartup}>
          {browser.i18n.getMessage(isStartup() ? "removeStartupLabel" : "registerStartupLabel")}
        </button>
      </li>
      <li>
        <button onClick={handleExportSession}>
          {browser.i18n.getMessage("exportButtonLabel")}
        </button>
      </li>
    </ul>
  );
};
