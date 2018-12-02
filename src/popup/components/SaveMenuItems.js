import React from "react";
import browser from "webextension-polyfill";

export default props => {
  const handlesaveAllWindows = () => {
    props.saveSession(props.name, "saveAllWindows");
  };
  const handlesaveOnlyCurrentWindow = () => {
    props.saveSession(props.name, "saveOnlyCurrentWindow");
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
