import React from "react";
import browser from "webextension-polyfill";
import { sendOpenMessage } from "../actions/controlSessions";
import NewWindowIcon from "../icons/newWindow.svg";

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
  const handleClickSection = e => {
    e.stopPropagation();
  };

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
    </ul>
  );
};
