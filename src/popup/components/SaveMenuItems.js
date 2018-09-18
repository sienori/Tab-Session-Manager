import React from "react";
import browser from "webextension-polyfill";
import { sendSessionSaveMessage } from "../actions/controlSessions";

export default props => {
  const handlesaveOnlyCurrentWindow = () => {
    sendSessionSaveMessage(props.name, "saveOnlyCurrentWindow");
  };

  return (
    <ul>
      <li onClick={handlesaveOnlyCurrentWindow}>
        {browser.i18n.getMessage("saveOnlyCurrentWindowLabel")}
      </li>
    </ul>
  );
};
