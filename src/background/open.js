import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import { getSettings } from "src/settings/settings";
import { returnReplaceURL, replacePage } from "./replace.js";

export async function openSession(session, property = "default") {
  let isFirstWindowFlag = true;
  tabList = {};
  for (let win in session.windows) {
    const openInCurrentWindow = async () => {
      const currentWindow = await removeNowOpenTabs();
      createTabs(session, win, currentWindow);
    };
    const openInNewWindow = async () => {
      let createData = {};
      if (browserInfo().name === "Firefox") {
        const firstTab = session.windows[win][Object.keys(session.windows[win])[0]];
        createData.incognito = firstTab.incognito;
      }

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

      const currentWindow = await browser.windows.create(createData);

      if (isSetPosition) {
        switch (session.windowsInfo[win].state) {
          case "normal": //黒帯が表示される現象を回避する
            browser.windows.update(currentWindow.id, {
              height: createData.height + 1
            });
            browser.windows.update(currentWindow.id, {
              height: createData.height
            });
            break;
          case "maximized":
            browser.windows.update(currentWindow.id, {
              state: "maximized"
            });
            break;
        }
      }

      createTabs(session, win, currentWindow);
    };
    const addToCurrentWindow = async () => {
      const currentTabs = await browser.tabs.query({ currentWindow: true });
      const currentWinId = currentTabs[0].windowId;
      const currentWindow = await browser.windows.get(currentWinId, { populate: true });
      createTabs(session, win, currentWindow, true);
    };

    if (isFirstWindowFlag) {
      isFirstWindowFlag = false;
      switch (property) {
        case "default":
          if (getSettings("ifOpenNewWindow")) openInNewWindow();
          else await openInCurrentWindow();
          break;
        case "openInCurrentWindow":
          await openInCurrentWindow();
          break;
        case "openInNewWindow":
          openInNewWindow();
          break;
        case "addToCurrentWindow":
          addToCurrentWindow();
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

export let IsOpeningSession = false;
//ウィンドウとタブを閉じてcurrentWindowを返す
async function removeNowOpenTabs() {
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

//現在のウィンドウにタブを生成
async function createTabs(session, win, currentWindow, isAddtoCurrentWindow = false) {
  IsOpeningSession = true;
  let sortedTabs = [];

  for (let tab in session.windows[win]) {
    sortedTabs.push(session.windows[win][tab]);
  }

  sortedTabs.sort((a, b) => {
    return a.index - b.index;
  });

  const firstTabId = currentWindow.tabs[0].id;
  let tabNumber = 0;
  for (let tab of sortedTabs) {
    const openedTab = openTab(session, win, currentWindow, tab.id, isAddtoCurrentWindow);
    if (getSettings("ifSupportTst")) await openedTab;

    tabNumber++;
    if (tabNumber == 1 && !isAddtoCurrentWindow) {
      await openedTab;
      browser.tabs.remove(firstTabId);
    }
    if (tabNumber == sortedTabs.length) {
      await openedTab;
      IsOpeningSession = false;
      replacePage(currentWindow.id);
    }
  }
}

let tabList = {};
//実際にタブを開く
function openTab(session, win, currentWindow, tab, isOpenToLastIndex = false) {
  return new Promise(async function(resolve, reject) {
    const property = session.windows[win][tab];
    let createOption = {
      active: property.active,
      index: property.index,
      pinned: property.pinned,
      url: property.url,
      windowId: currentWindow.id
    };

    //cookieStoreId
    if (browserInfo().name == "Firefox") {
      createOption.cookieStoreId = property.cookieStoreId;

      //現在のウィンドウと開かれるタブのプライベート情報に不整合があるときはウィンドウに従う
      if (currentWindow.incognito) delete createOption.cookieStoreId;
      if (!currentWindow.incognito && property.cookieStoreId == "firefox-private")
        delete createOption.cookieStoreId;
    }

    //タブをindexの最後に開く
    if (isOpenToLastIndex) {
      const getLastIndex = new Promise((resolve, reject) => {
        browser.tabs
          .query({
            currentWindow: true
          })
          .then(tabs => {
            resolve(tabs.length);
          });
      });
      createOption.index = await getLastIndex;
    }

    //Tree Style Tab
    let openDelay = 0;
    if (getSettings("ifSupportTst") && isEnabledOpenerTabId) {
      createOption.openerTabId = tabList[property.openerTabId];
      openDelay = getSettings("tstDelay");
    }

    //Lazy loading
    if (getSettings("ifLazyLoading")) {
      createOption.url = returnReplaceURL(
        "redirect",
        property.title,
        property.url,
        property.favIconUrl
      );
    }

    //Reader mode
    if (!getSettings("ifLazyLoading") && property.url.substr(0, 17) == "about:reader?url=") {
      createOption.openInReaderMode = true;
      createOption.url = decodeURIComponent(property.url.substr(17));
    }

    //about:newtabを置き換え
    if (property.url == "about:newtab") {
      createOption.url = null;
    }

    const tryOpen = async () => {
      try {
        const newTab = await browser.tabs.create(createOption);
        tabList[property.id] = newTab.id;
        resolve();
      } catch (e) {
        createOption.url = returnReplaceURL(
          "open_faild",
          property.title,
          property.url,
          property.favIconUrl
        );
        await browser.tabs.create(createOption).catch(() => resolve());
        resolve();
      }
    };

    //Tree Style Tabに対応ならdelay
    if (getSettings("ifSupportTst") && isEnabledOpenerTabId) setTimeout(tryOpen, openDelay);
    else tryOpen();
  });
}
