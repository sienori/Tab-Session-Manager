import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import { returnReplaceURL, replacePage } from "./replace.js";
import { updateTabGroups, isEnabledTabGroups } from "../common/tabGroups";
import { isTrackingSession, setLastFocusedWindowId, startTracking } from "./track.js";

const logDir = "background/open";

export async function openSession(session, property = "openInNewWindow") {
  log.log(logDir, "openSession()", session, property);
  let isFirstWindowFlag = true;
  tabList = {};
  for (let win in session.windows) {
    const openInCurrentWindow = async () => {
      log.log(logDir, "openSession() openInCurrentWindow()");
      const currentWindow = await removeNowOpenTabs();
      createTabs(session, win, currentWindow);
    };
    const openInNewWindow = async () => {
      log.log(logDir, "openSession() openInNewWindow()");
      let createData = {};

      const firstTab = session.windows[win][Object.keys(session.windows[win])[0]];
      createData.incognito = firstTab.incognito;

      const isSetPosition =
        getSettings("isRestoreWindowPosition") && session.windowsInfo != undefined;

      if (isSetPosition) {
        const info = session.windowsInfo[win];
        switch (info.state) {
          case "minimized":
            createData.state = info.state;
            break;
          case "normal":
            createData.height = info.height;
            createData.width = info.width;
          case "maximized": //最大化前のサイズを維持するためheightとwidthを含めない
            createData.left = info.left;
            createData.top = info.top;
            break;
        }
      }
      let currentWindow;
      // 開いたウィンドウがトラッキングセッションに追加されるのを防ぐ
      await setLastFocusedWindowId(browser.windows.WINDOW_ID_NONE);
      try {
        currentWindow = await browser.windows.create(createData);
      } catch (e) {
        /**
         * @see https://source.chromium.org/chromium/chromium/src/+/d51682b36adc22496f45a8111358a8bb30914534
         * @see https://github.com/sienori/Tab-Session-Manager/issues/1057
         * try to open a window in "safe" mode
         */
        currentWindow = await browser.windows.create({
          ...createData,
          width: 800,
          height: 600,
          top: 0,
          left: 0
        });
      }

      if (isSetPosition && session.windowsInfo[win].state == "maximized") {
        browser.windows.update(currentWindow.id, { state: "maximized" });
      }

      createTabs(session, win, currentWindow);
    };
    const addToCurrentWindow = async () => {
      log.log(logDir, "openSession() addToCurrentWindow()");
      const currentTabs = await browser.tabs.query({ currentWindow: true });
      const currentWinId = currentTabs[0].windowId;
      const currentWindow = await browser.windows.get(currentWinId, { populate: true });
      createTabs(session, win, currentWindow, true);
    };

    if (isFirstWindowFlag) {
      isFirstWindowFlag = false;
      switch (property) {
        case "openInCurrentWindow":
          await openInCurrentWindow();
          break;
        case "openInNewWindow":
          await openInNewWindow();
          break;
        case "addToCurrentWindow":
          await addToCurrentWindow();
          break;
      }
    } else {
      openInNewWindow();
    }
  }
}

const isEnabledOpenerTabId =
  (browserInfo().name == "Firefox" && browserInfo().version >= 57) ||
  (browserInfo().name == "Chrome" && browserInfo().version >= 18);
const isEnabledDiscarded = browserInfo().name == "Firefox" && browserInfo().version >= 63;
const isEnabledOpenInReaderMode = browserInfo().name == "Firefox" && browserInfo().version >= 58;
const isEnabledWindowTitle = browserInfo().name == "Firefox";

//ウィンドウとタブを閉じてcurrentWindowを返す
async function removeNowOpenTabs() {
  log.log(logDir, "removeNowOpenTabs()");
  const currentTabs = await browser.tabs.query({ currentWindow: true });
  const currentWinId = currentTabs[0].windowId;
  const allWindows = await browser.windows.getAll({ populate: true });
  for (const window of allWindows) {
    if (window.id === currentWinId) {
      //アクティブウィンドウのタブを閉じる
      for (const tab of window.tabs) {
        if (tab.index != 0) browser.tabs.remove(tab.id);
      }
    } else {
      //非アクティブウィンドウを閉じる
      await browser.windows.remove(window.id);
    }
  }
  return await browser.windows.get(currentWinId, { populate: true });
}

const createTabGroups = async (windowId, tabs, tabGroupsInfo) => {
  let groups = {};
  for (let tab of tabs) {
    if (!(tab.groupId > 0)) continue;

    if (!groups[tab.groupId])
      groups[tab.groupId] = {
        originalGroupId: tab.groupId,
        tabIds: []
      };
    groups[tab.groupId].tabIds.push(tabList[tab.id]);
  }

  for (let group of Object.values(groups)) {
    browser.tabs.group(
      {
        createProperties: { windowId: windowId },
        tabIds: group.tabIds
      },
      groupId => {
        const groupInfo = tabGroupsInfo.find(info => info.id === group.originalGroupId);
        if (!groupInfo) return;
        if (getSettings("saveTabGroupsV2")) updateTabGroups(groupId, groupInfo);
      }
    );
  }
};

const setWindowTitle = (session, windowId, currentWindow) => {
  const windowTitle = session?.windowsInfo?.[windowId]?.title || "";
  const activeTabTitle = Object.values(session.windows[windowId]).find(
    window => window.active
  )?.title;
  const reg = new RegExp("(?<title>.+)" + activeTabTitle, "u");
  const title = windowTitle.match(reg)?.groups?.title;

  if (title) {
    let count = 0;
    // タブがloading中だとtitlePrefaceのセットに失敗するため読み込めるまで繰り返す
    const interval = setInterval(async () => {
      browser.windows.update(currentWindow.id, { titlePreface: title });
      const tabInfo = await browser.tabs.query({ windowId: currentWindow.id, active: true });
      count++;
      if (tabInfo[0].status == "complete" || count > 20) clearInterval(interval);
    }, 1000);
  }
};

//現在のウィンドウにタブを生成
async function createTabs(session, win, currentWindow, isAddtoCurrentWindow = false) {
  log.log(logDir, "createTabs()", session, win, currentWindow, isAddtoCurrentWindow);
  let sortedTabs = [];

  for (let tab in session.windows[win]) {
    sortedTabs.push(session.windows[win][tab]);
  }

  sortedTabs.sort((a, b) => {
    return a.index - b.index;
  });

  const firstTabId = currentWindow.tabs[0].id;
  if (currentWindow.tabs[0].pinned) {
    sortedTabs.forEach(tab => tab.index++);
  }
  let openedTabs = [];
  let tabNumber = 0;
  for (let tab of sortedTabs) {
    const openedTab = openTab(tab, currentWindow, isAddtoCurrentWindow)
      .then(() => {
        tabNumber++;
        if (tabNumber == 1 && !isAddtoCurrentWindow) browser.tabs.remove(firstTabId);
        if (tabNumber == sortedTabs.length) replacePage(currentWindow.id);
      })
      .catch(() => {});
    openedTabs.push(openedTab);
    if (getSettings("ifSupportTst")) await openedTab;
  }

  if (isEnabledTabGroups) {
    await Promise.all(openedTabs);
    createTabGroups(currentWindow.id, sortedTabs, session.tabGroups || []);
  }

  if (isEnabledWindowTitle) {
    await Promise.all(openedTabs);
    setWindowTitle(session, win, currentWindow);
  }

  if (isTrackingSession(session.tag)) {
    await Promise.all(openedTabs);
    startTracking(session.id, win, currentWindow.id);
  }
}

let tabList = {};
//実際にタブを開く
function openTab(tab, currentWindow, isOpenToLastIndex = false) {
  log.log(logDir, "openTab()", tab, currentWindow, isOpenToLastIndex);
  return new Promise(async function (resolve, reject) {
    let createOption = {
      active: tab.active,
      index: tab.index,
      pinned: tab.pinned,
      url: tab.url,
      windowId: currentWindow.id
    };

    //cookieStoreId
    if (browserInfo().name == "Firefox") {
      createOption.cookieStoreId = tab.cookieStoreId;

      //現在のウィンドウと開かれるタブのプライベート情報に不整合があるときはウィンドウに従う
      if (currentWindow.incognito) delete createOption.cookieStoreId;
      if (!currentWindow.incognito && tab.cookieStoreId == "firefox-private")
        delete createOption.cookieStoreId;
    }

    //タブをindexの最後に開く
    if (isOpenToLastIndex) {
      createOption.index += currentWindow.tabs.length;
    }

    //Tree Style Tab
    let openDelay = 0;
    if (getSettings("ifSupportTst") && isEnabledOpenerTabId) {
      createOption.openerTabId = tabList[tab.openerTabId];
      openDelay = getSettings("tstDelay");
    }

    //Lazy loading
    if (getSettings("ifLazyLoading")) {
      if (getSettings("isUseDiscarded") && isEnabledDiscarded) {
        if (!createOption.active && !createOption.pinned) {
          createOption.discarded = true;
          createOption.title = tab.title;
        }
      } else {
        // Chromeのincognitoウィンドウでは拡張機能ページを開けないため
        if (!(browserInfo().name === "Chrome" && currentWindow.incognito)) {
          createOption.url = returnReplaceURL("redirect", tab.title, tab.url, tab.favIconUrl);
        }
      }
    }

    //Reader mode
    if (tab.url.startsWith("about:reader?url=")) {
      if (getSettings("ifLazyLoading")) {
        createOption.url = returnReplaceURL("redirect", tab.title, tab.url, tab.favIconUrl);
      } else {
        if (isEnabledOpenInReaderMode) createOption.openInReaderMode = true;
        createOption.url = decodeURIComponent(tab.url.slice(17));
      }
    }

    //about:newtabを置き換え
    if (tab.url == "about:newtab") {
      createOption.url = null;
    }

    const tryOpen = async () => {
      log.log(logDir, "openTab() tryOpen()");
      try {
        const newTab = await browser.tabs.create(createOption);
        tabList[tab.id] = newTab.id;
        resolve();
      } catch (e) {
        log.warn(logDir, "openTab() tryOpen() replace", e);
        const isRemovedContainer = e.message.startsWith("No cookie store exists with ID");
        if (isRemovedContainer) delete createOption.cookieStoreId;
        else createOption.url = returnReplaceURL("open_faild", tab.title, tab.url, tab.favIconUrl);
        const newTab = await browser.tabs.create(createOption).catch(e => {
          log.error(logDir, "openTab() tryOpen() create", e);
          reject();
        }); //タブを開けなかった場合はreject
        tabList[tab.id] = newTab.id;
        resolve();
      }
    };

    //Tree Style Tabに対応ならdelay
    if (getSettings("ifSupportTst") && isEnabledOpenerTabId) setTimeout(tryOpen, openDelay);
    else tryOpen();
  });
}
