import browser from "webextension-polyfill";
import browserInfo from "browser-info";

export const showDoneBadge = () => {
  browser.browserAction.setBadgeBackgroundColor({ color: "#36b2b2" });
  const isEnableSetTextColor = browserInfo().name == "Firefox" && browserInfo().version >= 63;
  if (isEnableSetTextColor) browser.browserAction.setBadgeTextColor({ color: "#fff" });
  browser.browserAction.setBadgeText({ text: "✓" });
  setTimeout(() => {
    browser.browserAction.setBadgeText({ text: "" });
  }, 3000);
};
