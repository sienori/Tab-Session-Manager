import React from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import openUrl from "../actions/openUrl";
import { getSettings } from "src/settings/settings";
import DonationMessage from "./DonationMessage";
import HeartIcon from "../icons/heart.svg";
import CloudSyncIcon from "../icons/cloudSync.svg";
import ExpandIcon from "../icons/expand.svg";
import SettingsIcon from "../icons/settings.svg";
import "../styles/Header.scss";

const logDir = "popup/components/Header";

const openSettings = () => {
  log.info(logDir, "openSettings()");
  const url = "../options/index.html#settings";
  openUrl(url);
};

const openSessionListInTab = () => {
  log.info(logDir, "openSessionListInTab()");
  const url = "../popup/index.html#inTab";
  openUrl(url);
  window.close();
};

export default props => {
  const handleHeartClick = () => {
    props.openModal(browser.i18n.getMessage("donationLabel"), <DonationMessage />);
  };

  const handleSyncClick = () => {
    browser.runtime.sendMessage({
      message: "syncCloud"
    });
  };

  const shouldShowCloudSync = getSettings("signedInEmail");

  return (
    <div id="header">
      <div className="title">Tab Session Manager</div>
      <div className="rightButtons">
        <button
          className="heartButton"
          onClick={handleHeartClick}
          title={browser.i18n.getMessage("donateLabel")}
        >
          <HeartIcon />
        </button>
        {shouldShowCloudSync && (
          <button
            className={"cloudSyncButton"}
            onClick={handleSyncClick}
            title={browser.i18n.getMessage("cloudSyncLabel")}
          >
            <CloudSyncIcon />
          </button>
        )}
        <button
          className={"openInTabButton"}
          onClick={openSessionListInTab}
          title={browser.i18n.getMessage("openSessionListInTabLabel")}
        >
          <ExpandIcon />
        </button>
        <button
          className={"settingsButton"}
          onClick={openSettings}
          title={browser.i18n.getMessage("settingsLabel")}
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  );
};
