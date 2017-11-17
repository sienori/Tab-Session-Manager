/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//初回起動時にオプションページを表示して設定を初期化
browser.runtime.onInstalled.addListener(function(){
    browser.runtime.openOptionsPage();
});

let S = new settingsObj()

var sessions = [];
var sessionStartTime=Date.now();

//起動時の設定
initSettings().then(function () {
    updateAutoTag();
    setStorage();
    setAutoSaveListener();
    autoSaveWhenCloseListener();
    browser.storage.onChanged.addListener(loadSessions);
});

//設定の初期化
function initSettings(value) {
    return new Promise(function (resolve, reject) {
        browser.storage.local.get(["sessions"], function (value) {
            //sessions初期化
            if (value.sessions != undefined) sessions = value.sessions;
            else sessions = [];
            
            S.init();
            resolve();
        });
    })
}

//過去のバージョンのautosaveのタグを更新
function updateAutoTag() {
    for (let i in sessions) {
        if (sessions[i].tag == "auto") {
            sessions[i].tag = "auto regular";
            sessions[i].name = "Auto Saved - Regularly";
        }
    }
}


//セッションを読み出す
function loadSessions() {
    browser.storage.local.get(["sessions"], function (value) {
        sessions = value.sessions;
        setAutoSaveListener();
    });
}

//設定とセッションを保存
function setStorage() {
    browser.storage.local.set({
        'sessions': sessions
    });
}

var autoSaveTimerArray = new Array();

//自動保存のリスナーを登録
//TODO:clearIntervalにより動作しない
function setAutoSaveListener() {
    //定期的に保存
    if (S.get().ifAutoSave) {
        clearInterval(autoSaveTimerArray.shift());
        autoSaveTimerArray.push(setInterval(function () {
            saveSession("Auto Saved - Regularly", "auto regular").then(function () {
                removeOverLimit("regular");
            });
        }, S.get().autoSaveInterval * 60 * 1000));
    } else {
        clearInterval(autoSaveTimerArray.shift());
    }

    //ウィンドウを閉じたときに保存
    if (S.get().ifAutoSaveWhenClose) {
        browser.tabs.onCreated.addListener(autoSaveWhenCloseListener);
        browser.tabs.onRemoved.addListener(autoSaveWhenCloseListener);
        browser.windows.onCreated.addListener(autoSaveWhenCloseListener);
    } else if (browser.tabs.onCreated.hasListener) {
        browser.tabs.onCreated.removeListener(autoSaveWhenCloseListener);
        browser.tabs.onRemoved.removeListener(autoSaveWhenCloseListener);
        browser.windows.onCreated.removeListener(autoSaveWhenCloseListener);
    }
}

function autoSaveWhenCloseListener() {
    saveSession("Auto Saved - Window was closed", "auto winClose temp").then(function () {
        removeOverLimit("winClose");
    });
};

function removeOverLimit(tagState) {
    let limit;
    if (tagState == "regular") limit = S.get().autoSaveLimit;
    else if (tagState == "winClose") limit = parseInt(S.get().autoSaveWhenCloseLimit) + 1; //temp分

    //定期保存を列挙
    let autoSavedArray = [];
    for (let i in sessions) {
        if (sessions[i].tag.indexOf(tagState) != -1) {
            autoSavedArray.push(i);
        }
    }

    //上限を超えている場合は削除
    if (autoSavedArray.length > limit) {
        let removeNum = autoSavedArray.length - limit;
        let removeSessions = autoSavedArray.slice(0, removeNum);
        for (let i of removeSessions) {
            removeSession(i);
        }
    }
}

function saveSession(name, tag) {
    return new Promise(function (resolve, reject) {
        loadCurrentSesssion(name, tag).then(function (session) {
            if (tag.indexOf("winClose") != -1) {
                showSessionWhenWindowClose(session);
                sessions.push(session);
            } else if (tag.indexOf("regular") != -1) {
                if (ifChangedAutoSaveSession(session)) sessions.push(session);
            } else {
                sessions.push(session);
            }
            setStorage();
            resolve();
        })

    })
}

function loadCurrentSesssion(name, tag) {
    return new Promise(function (resolve, reject) {
        let session = {};
        browser.tabs.query({}).then(function (tabs) {
            session.windows = {};
            session.tabsNumber = 0;
            session.name = name;
            session.date = new Date();
            session.tag = tag;
            session.sessionStartTime=sessionStartTime;

            //windouwsとtabのセット
            for (let tab of tabs) {
                if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};
                session.windows[tab.windowId][tab.id] = tab;
                session.tabsNumber++;
            }

            if (tabs.length > 0) resolve(session);
            else reject();

        })
    })
}

//前回の自動保存からタブが変わっているか判定
//自動保存する必要があればtrue
function ifChangedAutoSaveSession(session) {
    let lastAutoNumber = -1;
    for (let i in sessions) {
        if (sessions[i].tag.indexOf("regular") != -1) lastAutoNumber = i;
    }
    //自動保存が無ければtrue
    if (lastAutoNumber == -1) return true;
    
    //前回保存時のセッション
    let lastItems = [];
    for (let win in sessions[lastAutoNumber].windows) {
        lastItems.push(win);
        for (let tab in sessions[lastAutoNumber].windows[win]) {
            id = sessions[lastAutoNumber].windows[win][tab].id;
            url = sessions[lastAutoNumber].windows[win][tab].url;
            lastItems.push(id, url);
        }
    }
    //現在のセッション
    let newItems = []
    for (let win in session.windows) {
        newItems.push(win);
        for (let tab in session.windows[win]) {
            id = session.windows[win][tab].id;
            url = session.windows[win][tab].url;
            newItems.push(id, url);
        }
    }

    //前回保存時とタブが異なればtrue
    return lastItems.toString() != newItems.toString();
}

//ウィンドウを閉じたときの自動保存が有効になっている時，セッションは常に非表示の状態で一時保存される
//一時保存されたセッションを現在のセッションと比較してウィンドウの削除かFirefoxの再起動を確認したら表示する
function showSessionWhenWindowClose(session) {
    //sessionsを新しいものから走査
    for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].tag.indexOf('temp') != -1) {

            let showFlag = false;
            let currentSession = Object.keys(session.windows);
            let oldSession = Object.keys(sessions[i].windows);

            //oldSessionに現在存在しないウィンドウがあれば(保存が必要なら)showFlag=true
            for (let os of oldSession) {
                for (let cs of currentSession) {
                    if (os == cs) break;
                    if (cs == currentSession[currentSession.length - 1]) showFlag = true;
                }
            }

            //sessionStartTimeが異なればFirefoxの再起動されたと見なしshowFlag=true
            if(sessions[i].sessionStartTime!=session.sessionStartTime) showFlag=true;

            //保存が必要ならクラスからtempを削除し表示する
            if (showFlag) {
                sessions[i].tag = "auto winClose";
                break;
            }
            //不要ならtempの項目を更新
            else {
                sessions.splice(i, 1);
            }
        }
    }
}

function openSession(session) {
    let countFlag = 0;
    let p = Promise.resolve();
    for (let win in session.windows) { //ウィンドウごと
        //console.log(session.windows[win]);
        p = p.then(function () {
            if (countFlag == 0 && !S.get().ifOpenNewWindow) { //一つ目のウィンドウは現在のウィンドウに上書き
                countFlag = 1;
                return removeNowOpenTabs().then(function (currentWindow) {
                    return createTabs(session, win, currentWindow);
                });
            } else {
                return browser.windows.create().then(function (currentWindow) {
                    return createTabs(session, win, currentWindow);
                });
            }

        })
    }
}

//ウィンドウとタブを閉じてcurrentWindowを返す
function removeNowOpenTabs() {
    return new Promise(function (resolve, reject) {
        browser.windows.getAll({}).then(function (windows) {
            for (let win in windows) {
                if (windows[win].focused == false) { //非アクティブのウィンドウを閉じる
                    browser.windows.remove(windows[win].id);
                } else {
                    browser.tabs.query({
                        currentWindow: true
                    }).then(function (tabs) {
                        for (let tab of tabs) {
                            if (tab.index != 0) browser.tabs.remove(tab.id); //アクティブウィンドウのタブを閉じる
                        }
                    })
                }
            }
            browser.windows.getAll({
                populate: true
            }).then(function (currentWindow) {
                resolve(currentWindow[0]);
            });
        });
    })
}

//現在のウィンドウにタブを生成
function createTabs(session, win, currentWindow) {
    return new Promise(function (resolve, reject) {
        let sortedTabs=[];
        
        for(let tab in session.windows[win]){
            sortedTabs[session.windows[win][tab].index]=session.windows[win][tab];
        }
        //console.log(sortedTabs);
        
        let firstTabId = currentWindow.tabs[0].id;
        let tabNumber = 0;
        let p = Promise.resolve();
        for (let tab of sortedTabs) { //タブごと
            
            p = p.then(function () {
                tabNumber++;
                return openTab(session, win, currentWindow, tab.id);
            }).then(function () {
                if (tabNumber == 1) {
                    browser.tabs.remove(firstTabId);
                }
                if (tabNumber == Object.keys(session.windows[win]).length) {
                    resolve();
                    /*sortTabsを導入したため不要
                    moveTabsInIndex(currentWindow).then(function () {
                        resolve();
                    });*/
                }
            });
        }
    })
}

tabList = {};
//実際にタブを開く
function openTab(session, win, currentWindow, tab) {
    //console.log("open", session.windows[win][tab]);
    return new Promise(function (resolve, reject) {
        property = session.windows[win][tab];

        //特殊ページは新しいタブに置き換える
        if (property.url == "about:newtab" || property.url == "about:config" || property.url == "about:addons" || property.url == "about:debugging") {
            property.url = null;
        }

        let createOption = {
            active: property.active,
            cookieStoreId: property.cookieStoreId,
            index: property.index,
            pinned: property.pinned,
            url: property.url,
            windowId: currentWindow.id
        }
        //supported FF57++
        if (S.get().ifSupportTst) {
            createOption.openerTabId = tabList[property.openerTabId];
            openDelay = 150;
        } else {
            openDelay = 0;
        }

        setTimeout(function () {
            browser.tabs.create(createOption).then(function (newTab) {
                tabList[property.id] = newTab.id;
                resolve();
            });
        }, openDelay) //ツリー型タブの処理を待つ
    })
}

//indexに従ってタブを移動
function moveTabsInIndex(currentWindow) {
    return new Promise(function (resolve, reject) {
        browser.tabs.query({
            windowId: currentWindow.id
        }).then(function (openTabs) {
            for (let tab in openTabs) {
                browser.tabs.move(openTabs[tab].id, {
                    index: openTabs[tab].index
                });
            }
        }).then(function () {
            resolve();
        });
    })
}


function removeSession(number) {
    sessions.splice(number, 1);
    setStorage();
}


//popupからのリクエスト
browser.runtime.onMessage.addListener(function (request) {
    switch (request.message) {
        case "save":
            name = request.name;
            saveSession(name, "user");
            break;
        case "open":
            openSession(sessions[request.number]);
            break;
        case "remove":
            removeSession(request.number);
            break;
    }
});
