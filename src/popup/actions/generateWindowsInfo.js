import browser from "webextension-polyfill";

export default (windowsNumber, tabsNumber) => {
  const windowLabel = browser.i18n.getMessage("windowLabel");
  const windowsLabel = browser.i18n.getMessage("windowsLabel");
  const tabLabel = browser.i18n.getMessage("tabLabel");
  const tabsLabel = browser.i18n.getMessage("tabsLabel");

  const windowsText = `${windowsNumber} ${windowsNumber == 1 ? windowLabel : windowsLabel}`;
  const tabsText = `${tabsNumber} ${tabsNumber == 1 ? tabLabel : tabsLabel}`;

  return `${windowsText} - ${tabsText}`;
};
