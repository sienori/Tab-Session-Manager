import React from "react";
import browser from "webextension-polyfill";
import OptionContainer from "./OptionContainer";
import ImportSessionsComponent from "./ImportSessionsComponent";
import ImportUrlListComponent from "./ImportUrlListComponent";

const handleExportClick = () => {
  browser.runtime.sendMessage({
    message: "exportSessions",
    id: null
  });
};

const handleRemoveClick = () => {
  const res = confirm(browser.i18n.getMessage("warningRemoveAllMessage"));
  if (res === true) {
    browser.runtime.sendMessage({
      message: "deleteAllSessions"
    });
  }
};

export default () => (
  <div>
    <p className="contentTitle">{browser.i18n.getMessage("sessionsLabel")}</p>
    <hr />
    <ImportSessionsComponent />
    <hr />
    <ImportUrlListComponent />
    <hr />
    <OptionContainer
      title="exportLabel"
      captions={["exportCaptionLabel"]}
      type="button"
      value="exportButtonLabel"
      onClick={handleExportClick}
    />
    <hr />
    <OptionContainer
      title="removeSessionsLabel"
      captions={["removeSessionsCaptionLabel"]}
      type="button"
      value="removeSessionsButtonLabel"
      onClick={handleRemoveClick}
    />
  </div>
);
