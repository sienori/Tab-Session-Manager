/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

IsSavingSession = false;

function saveCurrentSession(name, tag, property) {
    IsSavingSession = true;

    return new Promise(async(resolve, reject) => {
        const exit = () => {
            IsSavingSession = false;
            reject();
            return;
        };

        try {
            const session = await loadCurrentSesssion(name, tag, property);

            //定期保存のセッションが変更されていなければ終了
            if (tag.includes("regular")) {
                const isChanged = await isChangedAutoSaveSession(session);
                if (!isChanged) {
                    return exit();
                }
            }

            if (tag.includes("winClose")) {
                showSessionWhenWindowClose(session);
            }

            await Sessions.put(session);
            if (!tag.includes('temp')) sendMessage('saveSession', session.id);
            IsSavingSession = false;
            resolve();
        } catch (e) {
            exit();
        }
    })
}

async function loadCurrentSesssion(name, tag, property) {
    let session = {
        windows: {},
        windowsNumber: 0,
        windowsInfo: {},
        tabsNumber: 0,
        name: name,
        date: new Date(),
        tag: tag,
        sessionStartTime: SessionStartTime,
        id: UUID.generate()
    };

    let queryInfo = {};
    switch (property) {
        case "default":
            break;
        case "saveOnlyCurrentWindow":
            queryInfo.currentWindow = true;
    }

    const tabs = await browser.tabs.query(queryInfo);
    for (let tab of tabs) {
        //プライベートタブを無視
        if (!S.get().ifSavePrivateWindow) {
            if (tab.incognito) {
                continue;
            }
        }

        if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};

        //replacedPageなら元のページを保存
        const parameter = returnReplaceParameter(tab.url);
        if (parameter.isReplaced) {
            tab.url = parameter.url;
        }

        session.windows[tab.windowId][tab.id] = tab;
        session.tabsNumber++;
    }

    session.windowsNumber = Object.keys(session.windows).length;

    for (let i in session.windows) {
        const window = await browser.windows.get(parseInt(i));
        session.windowsInfo[i] = window;
    }

    return new Promise((resolve, reject) => {
        if (session.tabsNumber > 0) resolve(session);
        else reject();
    })
}

//前回の自動保存からタブが変わっているか判定
//自動保存する必要があればtrue
async function isChangedAutoSaveSession(session) {
    const regularSessions = await getSessionsByTag('regular', ['id', 'tag', 'date', 'windows']);
    if (regularSessions.length == 0) return true;

    const tabsToString = session => {
        let retArray = [];
        for (let windowNo in session.windows) {
            retArray.push(windowNo);
            for (let tabNo in session.windows[windowNo]) {
                const tab = session.windows[windowNo][tabNo];
                retArray.push(tab.id, tab.url);
            }
        }
        return retArray.toString();
    }

    //前回保存時とタブが異なればtrue
    return tabsToString(regularSessions[0]) != tabsToString(session);
}

//ウィンドウを閉じたときの自動保存が有効になっている時，セッションは常に非表示の状態で一時保存される
//一時保存されたセッションを現在のセッションと比較してウィンドウの削除かFirefoxの再起動を確認したら表示する
async function showSessionWhenWindowClose(session) {
    const tempSessions = await getSessionsByTag('temp', ['id', 'tag', 'date', 'windows', 'sessionStartTime']);
    if (tempSessions.length == 0) return;

    let showFlag = false;
    const currentWindows = Object.keys(session.windows);
    const oldWindows = Object.keys(tempSessions[0].windows);

    //oldSessionに現在存在しないウィンドウがあれば(保存が必要なら)showFlag=true
    for (let ow of oldWindows) {
        for (let cw of currentWindows) {
            if (ow == cw) break;
            if (cw == currentWindows[currentWindows.length - 1]) showFlag = true;
        }
    }

    //sessionStartTimeが異なればFirefoxの再起動されたと見なしshowFlag=true
    if (tempSessions[0].sessionStartTime != session.sessionStartTime) showFlag = true;

    if (showFlag) {
        removeTag(tempSessions[0].id, 'temp');
    } else {
        removeSession(tempSessions[0].id, true);
    }

    //tempが複数ある場合は過去のものを削除
    let isFirst = true;
    for (let session of tempSessions) {
        if (isFirst) {
            isFirst = false;
            continue;
        }

        removeSession(session.id, true);
    }
}

async function sendMessage(message, id = null) {
    await browser.runtime.sendMessage({
        message: message,
        id: id
    }).catch(() => {});
}

async function saveSession(session) {
    try {
        await Sessions.put(session);
        sendMessage('saveSession', session.id);
    } catch (e) {}
}

async function removeSession(id, isTemp = false) {
    try {
        await Sessions.delete(id);
        if (!isTemp) sendMessage('deleteSession', id);
    } catch (e) {}
}

async function updateSession(session, isSend = true) {
    try {
        await Sessions.put(session);
        if (isSend) sendMessage('updateSession', session.id);
    } catch (e) {}
}

async function renameSession(id, name) {
    let session = await Sessions.get(id).catch(() => {});
    if (session == undefined) return;
    session.name = name;
    updateSession(session);
}

async function deleteAllSessions() {
    try {
        await Sessions.deleteAll();
        sendMessage('deleteAll');
    } catch (e) {}
}
