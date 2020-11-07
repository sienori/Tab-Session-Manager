import browser from "webextension-polyfill";

export default async function openUrl(url, title = "", active = true) {
  const blankPage = /about:newtab|about:home/;
  if (blankPage.test(url)) url = null;
  try {
    await browser.tabs.create({ url: url, active: active });
  } catch (e) {
    url = `../../replaced/index.html?state=open_faild&title=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(url)}`;
    openUrl(url, title, active);
  }
}
