import React from "react";
import browser from "webextension-polyfill";

export default props => {
  const handlesaveAllWindows = () => {
    props.saveSession(props.name, "saveAllWindows");
  };
  const handlesaveOnlyCurrentWindow = () => {
    props.saveSession(props.name, "saveOnlyCurrentWindow");
  };
  const handlesaveOnlyCurrentTab = () => {
    props.saveSession(props.name, "saveOnlyCurrentTab");
  };
  const handleClickSection = e => {
    e.stopPropagation();
  };

  return (
    <ul>
      <li className="section" onClick={handleClickSection}>
        {browser.i18n.getMessage("saveSessionLabel")}
      </li>
      <li>
        <button onClick={handlesaveAllWindows}>
          {browser.i18n.getMessage("saveAllWindowsLabel")}
        </button>
      </li>
      <li>
        <button onClick={handlesaveOnlyCurrentWindow}>
          {browser.i18n.getMessage("saveOnlyCurrentWindowLabel")}
        </button>
      </li>
      <li>
        <button onClick={handlesaveOnlyCurrentTab}>
          {browser.i18n.getMessage("saveOnlyCurrentTabLabel")}
        </button>
      </li>
    </ul>
  );
};
