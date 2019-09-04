import React from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import openUrl from "../actions/openUrl";
import DonationMessage from "./DonationMessage";
import HeartIcon from "../icons/heart.svg";
import SettingsIcon from "../icons/settings.svg";
import "../styles/Header.scss";

const logDir = "popup/components/Header";

const openSettings = () => {
  log.info(logDir, "openSettings()");
  const url = "../options/index.html#settings";
  openUrl(url);
};

export default props => {
  const handleHeartClick = () => {
    props.openModal(browser.i18n.getMessage("donationLabel"), <DonationMessage />);
  };

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
