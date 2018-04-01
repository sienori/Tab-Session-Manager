/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const S = new settingsObj()
let BrowserVersion;
const SessionStartTime = Date.now();

let IsInit = false;
async function init() {
    await S.init();
    await Sessions.init();
    IsInit = true;
    await updateOldSessions();

    browser.tabs.onActivated.addListener(replacePage);
    browser.windows.onFocusChanged.addListener(replacePage);

    const gettingInfo = await browser.runtime.getBrowserInfo();
    BrowserVersion = gettingInfo.version.split('.')[0];

    setAutoSave();
    autoSaveWhenClose().then(openLastSession);

    browser.storage.onChanged.addListener(setAutoSave);
    browser.tabs.onUpdated.addListener(onUpdate);
    browser.tabs.onCreated.addListener(autoSaveWhenClose);
    browser.tabs.onRemoved.addListener(autoSaveWhenClose);
    browser.windows.onCreated.addListener(autoSaveWhenClose);

    backupSessions();
}
init();
browser.runtime.onInstalled.addListener(onInstalledListener);
browser.runtime.onMessage.addListener(onMessageListener);

async function onInstalledListener(details) {
    if (details.reason != 'install' && details.reason != 'update') return;

    //初回起動時にオプションページを表示して設定を初期化
    browser.tabs.create({
        url: "options/options.html#information?action=updated",
        active: false
    });
}

async function updateOldSessions() {
    await migrateSessionsFromStorage();

    //DBの更新が必要な場合
    //await Sessions.DBUpdate();

    addNewValues();
}

async function addNewValues() {
    const sessions = await Sessions.getAll().catch(() => {});
    for (let session of sessions) {
        if (session.windowsNumber === undefined) {
            session.windowsNumber = Object.keys(session.windows).length;

            updateSession(session);
        }
    }
}

async function migrateSessionsFromStorage() {
    const getSessionsByStorage = () => {
        return new Promise(resolve => {
            browser.storage.local.get('sessions', value => {
                resolve(value.sessions || []);
            });
        })
    }
    let sessions = await getSessionsByStorage();
    if (sessions.length == 0) return;

    //タグを配列に変更
    const updateTags = () => {
        for (let i of sessions) {
            if (!Array.isArray(i.tag)) {
                i.tag = i.tag.split(' ');
            }
        }
    }
    //UUIDを追加 タグからauto,userを削除
    const updateSessionId = () => {
        for (let i of sessions) {
            if (!i['id']) {
                i['id'] = UUID.generate();

                i.tag = i.tag.filter((element) => {
                    return !(element == 'user' || element == 'auto');
                });
            }
        }
    }
    //autosaveのセッション名を変更
    const updateAutoName = () => {
        for (let i in sessions) {
            if (sessions[i].tag.includes('winClose')) {
                if (sessions[i].name === 'Auto Saved - Window was closed')
                    sessions[i].name = browser.i18n.getMessage('winCloseSessionName');
            } else if (sessions[i].tag.includes('regular')) {
                if (sessions[i].name === 'Auto Saved - Regularly')
                    sessions[i].name = browser.i18n.getMessage('regularSaveSessionName');
            }
        }
    }
    updateTags();
    updateSessionId();
    updateAutoName();


    for (let session of sessions) {
        await saveSession(session);
    }

    browser.storage.local.remove('sessions');
    return Promise.resolve;
}


async function onMessageListener(request, sender, sendResponse) {
    switch (request.message) {
        case "save":
            const name = request.name;
            const property = request.property;
            saveCurrentSession(name, [], property).catch(() => {});
            break;
        case "open":
            openSession(request.session, request.property);
            break;
        case "remove":
            removeSession(request.id);
            break;
        case "rename":
            renameSession(request.id, request.name);
            break;
        case "update":
            updateSession(request.session, request.isSendResponce);
            break;
        case "import":
            importSessions(request.importSessions);
            break;
        case "deleteAllSessions":
            deleteAllSessions();
            break;
        case "getSessions":
            return getSessions(request, sender, sendResponse);
            break;
        case "addTag":
            addTag(request.id, request.tag);
            break;
        case "removeTag":
            removeTag(request.id, request.tag);
            break;
        case "getInitState":
            return IsInit;
            break;
        case "getCurrentSession":
            const currentSession = await loadCurrentSesssion('', [], request.property).catch(() => {});
            return currentSession;
    }
}

async function getSessions(request, sender, sendResponse) {
    let sessions;
    if (request.id == null) {
        sessions = await Sessions.getAll(request.needKeys).catch([]);
    } else {
        sessions = await Sessions.get(request.id).catch(() => {});
    }

    return sessions;
    //該当するセッションが存在しない時
    //idを指定:undefined, 非指定:[] を返す
}
