import React from "react";
import browser from "webextension-polyfill";
import { addCurrentTab } from "../actions/controlSessions";
import EditIcon from "../icons/edit.svg";

export default props => {
  const handleAddCurrentTab = () => {
    addCurrentTab(props.sessionId, props.windowId);
  };

  const handleClickSection = e => {
    e.stopPropagation();
  };

  return (
    <ul>
      <li className="section" onClick={handleClickSection}>
        <EditIcon />
        {browser.i18n.getMessage("editWindowLabel")}
      </li>
      <li>
        <button onClick={handleAddCurrentTab}>
          {browser.i18n.getMessage("addCurrentTabLabel")}
        </button>
      </li>
    </ul>
  );
};
