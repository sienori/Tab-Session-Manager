//TODO:
var sessions = [];
var settings = {}
var autoSaveTimerArray = new Array();

InitialNameValue = browser.i18n.getMessage("initialNameValue");

//起動時に設定の初期化
browser.storage.local.get(["settings"], function (value) {
    initSettings(value);
    setSettings();
});

function initSettings(value) {
        let settings={};
        let settingItems = ["ifAutoSave", "autoSaveInterval", "autoSaveLimit", "ifAutoSaveWhenClose", "autoSaveWhenCloseLimit", "dateFormat", "ifOpenNewWindow", "ifSupportTst"];
        let settingValue = [true, 15, 10, true, 10, "YYYY.MM.DD HH:mm:ss", true, true];

        for (let i = 0; i < settingItems.length; i++) {
            if (value.settings[settingItems[i]] == undefined) {
                settings[settingItems[i]] = settingValue[i];
            } else {
                settings[settingItems[i]] = value.settings[settingItems[i]];
            }
        }
    return settings;
}

getSettings();
browser.storage.onChanged.addListener(getSettings);

function getSettings() {
    browser.storage.local.get(["sessions", "settings"], function (value) {
        if (value.sessions != undefined) sessions = value.sessions;
        else sessions = [];
        settings = initSettings(value);

        //定期的に保存
        if (settings.ifAutoSave) {
            clearInterval(autoSaveTimerArray.shift());
            autoSaveTimerArray.push(setInterval(function () {
                saveSession("Auto Saved - Regularly", "auto regular");
                removeOverLimit("regular");
            }, settings.autoSaveInterval * 60 * 1000));
        } else {
            clearInterval(autoSaveTimerArray.shift());
        }

        //ウィンドウを閉じたときに保存
        if (settings.ifAutoSaveWhenClose) {
            browser.tabs.onCreated.addListener(saveSessionWhenClose);
            browser.tabs.onRemoved.addListener(saveSessionWhenClose);
            browser.windows.onCreated.addListener(saveSessionWhenClose);
        } else if (browser.tabs.onCreated.hasListener) {
            browser.tabs.onCreated.removeListener(saveSessionWhenClose);
            browser.tabs.onRemoved.removeListener(saveSessionWhenClose);
            browser.windows.onCreated.removeListener(saveSessionWhenClose);
        }

    });
}

saveSessionWhenClose();

function saveSessionWhenClose() {
    saveSession("Auto Saved - Window was closed", "auto winClose temp");
    removeOverLimit("winClose");
};


function setSettings() {
    browser.storage.local.set({
        'sessions': sessions
    });
}

function saveSession(name, tag) {
    return new Promise(function (resolve, reject) {

        loadCurrentSesssion(name, tag).then(function (session) {
            if (tag.indexOf("winClose") != -1) {
                autoSaveWhenWindowClose(session);
                sessions.push(session);
            } else if (tag.indexOf("regular") != -1) {
                if (ifChangeAutoSave(session)) sessions.push(session);
                resolve();
            } else {
                sessions.push(session);
            }
            setSettings();
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

            //windouwsとtabのセット
            for (let tab of tabs) {
                if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};
                session.windows[tab.windowId][tab.id] = tab;
                session.tabsNumber++;
            }
            resolve(session);
        })
    })
}

//前回の自動保存からタブが変わっているか判定
//自動保存する必要があればtrue
function ifChangeAutoSave(session) {
    let lastAutoNumber = -1;
    for (let i in sessions) {
        //if (sessions[i].tag == "auto") lastAutoNumber = i;
        if (sessions[i].tag.indexOf("regular") != -1) lastAutoNumber = i;
    }

    //自動保存が無ければtrue
    if (lastAutoNumber == -1) return true;

    let lastItems = [];
    for (let win in sessions[lastAutoNumber].windows) {
        lastItems.push(win);
        for (let tab in sessions[lastAutoNumber].windows[win]) {
            id = sessions[lastAutoNumber].windows[win][tab].id;
            url = sessions[lastAutoNumber].windows[win][tab].url;
            lastItems.push(id, url);
        }
    }

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

function autoSaveWhenWindowClose(session) {
    //sessionsを新しいものから走査
    for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].tag.indexOf('temp') != -1) {

            let saveFlag = false;
            let currentSession = Object.keys(session.windows);
            let oldSession = Object.keys(sessions[i].windows);

            //oldSessionに現在存在しないウィンドウがあれば(保存が必要なら)saveFlag=true
            for (let os of oldSession) {
                for (let cs of currentSession) {
                    if (os == cs) break;
                    if (cs == currentSession[currentSession.length - 1]) saveFlag = true;
                }
            }

            //HACK:Firefoxを再起動するとdateが文字列型になることを利用 仕様変更で使えなくなる可能性大
            //セッションごとに独自のIDを付与すればいいかも
            if (typeof (sessions[i].date) == "string") saveFlag = true;

            //保存が必要ならクラスからtempを削除し表示する
            if (saveFlag) {
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

function removeSession(number) {
    sessions.splice(number, 1);
    setSettings();
}

function openSession(session) {
    let countFlag = 0;
    let p = Promise.resolve();
    for (let win in session.windows) { //ウィンドウごと
        p = p.then(function () {
            //console.log("open Window", win);
            if (countFlag == 0 && !settings.ifOpenNewWindow) { //一つ目のウィンドウは現在のウィンドウに上書き
                countFlag = 1;
                return removeTab().then(function (currentWindow) {
                    //console.log("remove");
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
function removeTab() {
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


function createTabs(session, win, currentWindow) {
    return new Promise(function (resolve, reject) {
        firstTabId = currentWindow.tabs[0].id;
        tabNumber = 0;
        let p = Promise.resolve();
        for (let tab in session.windows[win]) { //タブごと
            p = p.then(function () {
                tabNumber++;
                return openTab(session, win, currentWindow, tab);
            }).then(function () {
                if (tabNumber == 1) {
                    browser.tabs.remove(firstTabId);
                } else if (tabNumber == Object.keys(session.windows[win]).length) {
                    moveTabsInIndex(currentWindow).then(function () {
                        resolve();
                    });
                }
            });
        }
    })
}

tabList = {};

function openTab(session, win, currentWindow, tab) {
    return new Promise(function (resolve, reject) {
        property = session.windows[win][tab];

        //特殊ページは新しいタブに置き換える
        if (property.url == "about:newtab" || property.url == "about:config" || property.url == "about:addons" || property.url == "about:debugging") {
            property.url = null;
        }

        let createOption = {
            active: property.active,
            index: property.index,
            pinned: property.pinned,
            //openerTabId: tabList[property.openerTabId],
            url: property.url,
            windowId: currentWindow.id
        }
        //supported FF57++
        if (settings.ifSupportTst){
            createOption.openerTabId = tabList[property.openerTabId];
            openDelay=150;
        }else{
            openDelay=0;
        }

        setTimeout(function () {
            browser.tabs.create(createOption).then(function (newTab) {
                tabList[property.id] = newTab.id;
                //console.log("open complate", newTab.id);
                resolve();
            });
        }, openDelay) //ツリー型タブの処理を待つ
    })
}

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

function removeOverLimit(tagState) {
    let limit;
    if (tagState == "regular") limit = settings.autoSaveLimit;
    else if (tagState == "winClose") limit = parseInt(settings.autoSaveWhenCloseLimit) + 1; //temp分
    setTimeout(function () {
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
    }, 500)
}

//過去のバージョンのautosaveのタグを更新(起動時に一回だけ実行)
setTimeout(updateAutoTag, 1000);

function updateAutoTag() {
    for (let i in sessions) {
        if (sessions[i].tag == "auto") {
            sessions[i].tag = "auto regular";
            sessions[i].name = "Auto Saved - Regularly";
        }
    }
    setSettings();
}

browser.runtime.onMessage.addListener(function (request) {
    switch (request.message) {
        case "save":
            if (request.name == InitialNameValue) name = "";
            else name = request.name;
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
