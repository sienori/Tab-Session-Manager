import browser from "webextension-polyfill";
import { initSettings, getSettings } from "src/settings/settings";

const openOptionsPage = active => {
  browser.tabs.create({
    url: "options/index.html#information?action=updated",
    active: active
  });
};

const openNotification = () => {
  browser.notifications.create({
    type: "basic",
    iconUrl: "../icons/icon.png",
    title: browser.i18n.getMessage("NotificationOnUpdateLabel"),
    message: browser.i18n.getMessage("NotificationOnUpdateCaptionLabel")
  });
};

export default async details => {
  if (details.reason != "install" && details.reason != "update") return;
  await initSettings();
  const isShowOptionsPage = getSettings("isShowOptionsPageWhenUpdated");

  if (isShowOptionsPage) {
    openOptionsPage(false);
  } else {
    openNotification();
    const handleNotificationClick = () => {
      openOptionsPage(true);
      browser.notifications.onClicked.removeListener(handleNotificationClick);
    };
    browser.notifications.onClicked.addListener(handleNotificationClick);
  }
};
