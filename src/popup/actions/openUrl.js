import browser from "webextension-polyfill";
import { getSettings } from "../../settings/settings";

export default async function openUrl(url, title = "", active = true) {
  const blankPage = /about:newtab|about:home/;
  if (blankPage.test(url)) url = null;
  try {
    await browser.tabs.create({ url: url, active: active });
  } catch (e) {
    const theme = getSettings("theme");
    url = `../../replaced/index.html?state=open_faild&title=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(url)}&theme=${theme}`;
    openUrl(url, title, active);
  }
}
