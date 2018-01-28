/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

IsSavingSession = false;

function saveSession(name, tag, property) {
    IsSavingSession = true;
    return new Promise(function (resolve, reject) {
        loadCurrentSesssion(name, tag, property).then(function (session) {
            if (tag.indexOf("winClose") != -1) {
                showSessionWhenWindowClose(session);
                sessions.push(session);
            } else if (tag.indexOf("regular") != -1) {
                if (ifChangedAutoSaveSession(session)) sessions.push(session);
            } else {
                sessions.push(session);
            }
            setStorage();
            IsSavingSession = false;
            resolve();
        })

    })
}

function loadCurrentSesssion(name, tag, property) {
    return new Promise(function (resolve, reject) {
        let session = {};
        const queryInfo = {};
        switch (property) {
            case "default":
                break;
            case "saveOnlyCurrentWindow":
                queryInfo.currentWindow = true;
        }
        browser.tabs.query(queryInfo).then(function (tabs) {
            session.windows = {};
            session.tabsNumber = 0;
            session.name = name;
            session.date = new Date();
            session.tag = tag;
            session.sessionStartTime = sessionStartTime;

            //windouwsとtabのセット
            for (let tab of tabs) {
                //プライベートタブを無視

                if (!S.get().ifSavePrivateWindow) {
                    if (tab.incognito) continue;
                }

                if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};

                //replacedPageなら元のページを保存
                let paramater = returnReplaceParamater(tab.url)
                if (paramater.isReplaced) {
                    tab.url = paramater.url;
                }
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
            if (sessions[i].sessionStartTime != session.sessionStartTime) showFlag = true;

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

function removeSession(number) {
    sessions.splice(number, 1);
    setStorage();
}

function renameSession(sessionNo, name) {
    sessions[sessionNo].name = name;
    setStorage();
}

//セッションを保存
function setStorage() {
    browser.storage.local.set({
        'sessions': sessions
    });
}
