import browser from "webextension-polyfill";
import browserInfo from "browser-info";

const actionApi = browser.action || browser.browserAction;

export const showDoneBadge = () => {
  showBadge("✓", "#36b2b2");
  setTimeout(hideBadge, 3000);
};

export const showSyncErrorBadge = () => {
  showBadge("!", "#d70022");
};

export const showBadge = (text, backgroundColor, textColor = "#fff") => {
  if (!actionApi) return;
  actionApi.setBadgeBackgroundColor({ color: backgroundColor });
  const isEnableSetTextColor = browserInfo().name == "Firefox" && browserInfo().version >= 63;
  if (isEnableSetTextColor && actionApi.setBadgeTextColor) actionApi.setBadgeTextColor({ color: textColor });
  actionApi.setBadgeText({ text: text });
};

export const hideBadge = () => {
  if (!actionApi) return;
  actionApi.setBadgeText({ text: "" });
};
