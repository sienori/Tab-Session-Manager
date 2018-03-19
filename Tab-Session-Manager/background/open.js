/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

async function openSession(session, property = "default") {
    let isFirstWindowFlag = true;
    tabList = {};
    for (let win in session.windows) {

        const openInCurrentWindow = () => {
            return removeNowOpenTabs().then((currentWindow) => {
                return createTabs(session, win, currentWindow);
            });
        };
        const openInNewWindow = () => {
            const firstTab = session.windows[win][Object.keys(session.windows[win])[0]];
            const createData = {
                incognito: firstTab.incognito
            };

            return browser.windows.create(createData).then((currentWindow) => {
                return createTabs(session, win, currentWindow);
            });
        };
        const addToCurrentWindow = () => {
            return browser.windows.getCurrent({
                populate: true
            }).then((currentWindow) => {
                return createTabs(session, win, currentWindow, true);
            });

        };

        const open = () => {
            if (isFirstWindowFlag) {
                isFirstWindowFlag = false;
                switch (property) {
                    case "default":
                        if (S.get().ifOpenNewWindow) return openInNewWindow();
                        else return openInCurrentWindow();
                        break;
                    case "openInCurrentWindow":
                        return openInCurrentWindow();
                        break;
                    case "openInNewWindow":
                        return openInNewWindow();
                        break;
                    case "addToCurrentWindow":
                        return addToCurrentWindow();
                        break;
                }
            } else {
                return openInNewWindow();
            }
        };

        await open();
    }
}

let IsOpeningSession = false;
//ウィンドウとタブを閉じてcurrentWindowを返す
function removeNowOpenTabs() {
    return new Promise(async function (resolve, reject) {
        const windows = await browser.windows.getAll({
            populate: true
        });
        for (let win in windows) {
            if (windows[win].focused == false) { //非アクティブのウィンドウを閉じる
                browser.windows.remove(windows[win].id);
            } else {
                for (let tab of windows[win].tabs) {
                    if (tab.index != 0) browser.tabs.remove(tab.id); //アクティブウィンドウのタブを閉じる
                }
                resolve(windows[win]);
            }
        }
    });
}

//現在のウィンドウにタブを生成
function createTabs(session, win, currentWindow, isAddtoCurrentWindow = false) {
    return new Promise(async function (resolve, reject) {
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
            await openTab(session, win, currentWindow, tab.id, isAddtoCurrentWindow);

            tabNumber++;
            if (tabNumber == 1 && !isAddtoCurrentWindow) {
                browser.tabs.remove(firstTabId);
            }
            if (tabNumber == sortedTabs.length) {
                IsOpeningSession = false;
                replacePage();
                resolve();
            }
        }
    })
}

tabList = {};
//実際にタブを開く
function openTab(session, win, currentWindow, tab, isOpenToLastIndex = false) {
    return new Promise(async function (resolve, reject) {
        const property = session.windows[win][tab];
        let createOption = {
            active: property.active,
            cookieStoreId: property.cookieStoreId,
            index: property.index,
            pinned: property.pinned,
            url: property.url,
            windowId: currentWindow.id
        }

        //現在のウィンドウと開かれるタブのプライベート情報に不整合があるときはウィンドウに従う
        if (currentWindow.incognito) delete createOption.cookieStoreId;
        if (!currentWindow.incognito && property.cookieStoreId == "firefox-private") delete createOption.cookieStoreId;

        //タブをindexの最後に開く
        if (isOpenToLastIndex) {
            const getLastIndex = new Promise((resolve, reject) => {
                browser.tabs.query({
                    currentWindow: true
                }).then((tabs) => {
                    resolve(tabs.length);
                });
            });
            createOption.index = await getLastIndex;
        }

        //Tree Style Tab
        let openDelay = 0;
        if (S.get().ifSupportTst) {
            createOption.openerTabId = tabList[property.openerTabId];
            openDelay = S.get().tstDelay;
        }

        //Lazy loading
        if (S.get().ifLazyLoading) {
            createOption.url = returnReplaceURL('redirect', property.title, property.url, property.favIconUrl);
        }

        //Reader mode
        if (!S.get().ifLazyLoading && (property.url.substr(0, 17) == 'about:reader?url=')) {
            createOption.openInReaderMode = true;
            createOption.url = decodeURIComponent(property.url.substr(17));
        }

        //about:newtabを置き換え
        if (property.url == 'about:newtab') {
            createOption.url = null;
        }

        setTimeout(function () {
            browser.tabs.create(createOption)
                .then((newTab) => {
                    tabList[property.id] = newTab.id;
                    resolve();
                }).catch(() => {
                    createOption.url = returnReplaceURL('open_faild', property.title, property.url, property.favIconUrl);
                    browser.tabs.create(createOption)
                        .then((newTab) => {
                            tabList[property.id] = newTab.id;
                            resolve();
                        }).catch(() => {
                            resolve();
                        })
                });
        }, openDelay) //ツリー型タブの処理を待つ
    })
}
