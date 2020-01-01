import browser from "webextension-polyfill";

export default tag => {
  switch (tag) {
    case "regular":
      return browser.i18n.getMessage("regularSaveSessionName");
    case "winClose":
      return browser.i18n.getMessage("winCloseSessionName");
    case "browserExit":
      return browser.i18n.getMessage("browserExitSessionName");
    case "_startup":
      return browser.i18n.getMessage("startupLabel");
    default:
      return tag;
  }
};
