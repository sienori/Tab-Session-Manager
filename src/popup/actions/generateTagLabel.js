import React from "react";
import browser from "webextension-polyfill";
import TagIcon from "../icons/tag.svg";
import AutoSaveIcon from "../icons/update.svg";
import StartupIcon from "../icons/star.svg";
import TrackingIcon from "../icons/circle.svg";

export const generateTagLabel = tag => {
  switch (tag) {
    case "regular":
      return browser.i18n.getMessage("regularSaveSessionNameShort");
    case "winClose":
      return browser.i18n.getMessage("winCloseSessionNameShort");
    case "browserExit":
      return browser.i18n.getMessage("browserExitSessionNameShort");
    case "_startup":
      return browser.i18n.getMessage("startupLabel");
    case "_tracking":
      return browser.i18n.getMessage("trackingLabel");
    default:
      return tag;
  }
};

export const generateTagIcon = tag => {
  switch (tag) {
    case "regular":
    case "winClose":
    case "browserExit":
      return <AutoSaveIcon className="autoSaveIcon" />;
    case "_startup":
      return <StartupIcon className="startupIcon" />;
    case "_tracking":
      return <TrackingIcon className="trackingIcon" />;
    default:
      return <TagIcon className="tagIcon" />;
  }
};
