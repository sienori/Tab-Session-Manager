import browser from "webextension-polyfill";
import browserInfo from "browser-info";

export const showDoneBadge = () => {
  showBadge("✓", "#36b2b2");
  setTimeout(hideBadge, 3000);
};

export const showSyncErrorBadge = () => {
  showBadge("!", "#d70022");
};

export const showBadge = (text, backgroundColor, textColor = "#fff") => {
  browser.action.setBadgeBackgroundColor({ color: backgroundColor });
  const isEnableSetTextColor = browserInfo().name == "Firefox" && browserInfo().version >= 63;
  if (isEnableSetTextColor) browser.action.setBadgeTextColor({ color: textColor });
  browser.action.setBadgeText({ text: text });
};

export const hideBadge = () => {
  browser.action.setBadgeText({ text: "" });
};
