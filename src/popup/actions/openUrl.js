import browser from "webextension-polyfill";
import { getSettings } from "../../settings/settings";

export default async function openUrl(url, title = "", active = true, offlineBackupId = null) {
  const blankPage = /about:newtab|about:home/;
  if (blankPage.test(url)) url = null;
  try {
    await browser.tabs.create({ url: url, active: active });
    return;
  } catch (e) {
    if (offlineBackupId) {
      try {
        const backup = await browser.runtime.sendMessage({
          message: "getOfflineBackup",
          id: offlineBackupId
        });
        if (backup?.html) {
          const blob = new Blob([backup.html], { type: "text/html" });
          const objectUrl = URL.createObjectURL(blob);
          await browser.tabs.create({ url: objectUrl, active: active });
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
          return;
        }
      } catch (offlineError) {
        console.warn("Failed to open offline backup", offlineError);
      }
    }

    const theme = getSettings("theme");
    const fallbackUrl = `../../replaced/index.html?state=open_faild&title=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(url || "")}&theme=${theme}`;
    await openUrl(fallbackUrl, title, active, null);
  }
}
