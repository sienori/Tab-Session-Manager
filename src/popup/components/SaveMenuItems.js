import React from "react";
import browser from "webextension-polyfill";
import { sendSessionSaveMessage } from "../actions/controlSessions";

export default props => {
  const handlesaveAllWindows = () => {
    sendSessionSaveMessage(props.name, "saveAllWindows");
  };
  const handlesaveOnlyCurrentWindow = () => {
    sendSessionSaveMessage(props.name, "saveOnlyCurrentWindow");
  };

  return (
    <ul>
      <li onClick={handlesaveAllWindows}>{browser.i18n.getMessage("saveAllWindowsLabel")}</li>
      <li onClick={handlesaveOnlyCurrentWindow}>
        {browser.i18n.getMessage("saveOnlyCurrentWindowLabel")}
      </li>
    </ul>
  );
};
