import React from "react";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings, setSettings } from "src/settings/settings";
import openUrl from "../actions/openUrl";
import HeartIcon from "../icons/heart.svg";
import SettingsIcon from "../icons/settings.svg";
import "../styles/Header.scss";

const logDir = "popup/components/Header";

const openPayPal = () => {
  log.info(logDir, "openPayPal()");
  const isChrome = browserInfo().name === "Chrome";
  const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&no_shipping=1&business=sienori.firefox@gmail.com&item_name=Tab Session Manager ${
    isChrome ? "for Chrome " : ""
  }- Donation`;
  openUrl(url);
};
const openSettings = () => {
  log.info(logDir, "openSettings()");
  const url = "../options/index.html#settings";
  openUrl(url);
};

export default () => (
  <div id="header">
    <div className="title">Tab Session Manager</div>
    <div className="rightButtons">
      <button
        className="heartButton"
        onClick={openPayPal}
        title={browser.i18n.getMessage("donateWithPaypalLabel")}
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
