/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let autoSaveTimer;

function startAutoSave() {
    autoSaveTimer = setInterval(async function () {
        let name = browser.i18n.getMessage("regularSaveSessionName");
        if (S.get().useTabTitleforAutoSave) name = await getCurrentTabName();
        const tag = ['regular'];
        const property = "default";
        saveCurrentSession(name, tag, property)
            .then(() => {
                removeOverLimit("regular");
            })
            .catch(() => {});
    }, S.get().autoSaveInterval * 60 * 1000);
}

function stopAutoSave() {
    clearInterval(autoSaveTimer);
}

//定期保存の設定が変更されたときにセット
function setAutoSave(changes, areaName) {
    if (isChangeAutoSaveSettings(changes, areaName)) {
        stopAutoSave();
        if (S.get().ifAutoSave) {
            startAutoSave();
        }
    }
}

function isChangeAutoSaveSettings(changes, areaName) {
    if (changes == undefined) return true; //最初の一回
    if (changes.Settings == undefined) return false;

    const oldValue = changes.Settings.oldValue;
    const newValue = changes.Settings.newValue;
    return (oldValue.ifAutoSave != newValue.ifAutoSave) || (oldValue.autoSaveInterval != newValue.autoSaveInterval)
}


let LastUpdateTime = 0;

function onUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status != "complete") return;

    const currentUpdateTime = Date.now();
    if (currentUpdateTime - LastUpdateTime < 1500) {
        LastUpdateTime = currentUpdateTime;
        return;
    }
    LastUpdateTime = currentUpdateTime;

    autoSaveWhenClose();
}

function autoSaveWhenClose() {
    return new Promise(async(resolve, reject) => {
        if (!IsOpeningSession && !IsSavingSession && (S.get().ifAutoSaveWhenClose || S.get().ifOpenLastSessionWhenStartUp)) {
            let name = browser.i18n.getMessage("winCloseSessionName");
            if (S.get().useTabTitleforAutoSave) name = await getCurrentTabName();
            const tag = ['winClose', 'temp'];
            const property = "default";
            saveCurrentSession(name, tag, property).then(function () {
                removeOverLimit("winClose");
                resolve();
            }, () => {
                //失敗時
                resolve();
            });
        }
    })
};

async function openLastSession() {
    if (!S.get().ifOpenLastSessionWhenStartUp) return;

    const winCloseSessions = await getSessionsByTag('temp');
    openSession(winCloseSessions[winCloseSessions.length - 1], 'openInCurrentWindow');
}

async function removeOverLimit(tagState) {
    let limit;
    if (tagState == "regular") limit = S.get().autoSaveLimit;
    else if (tagState == "winClose") limit = parseInt(S.get().autoSaveWhenCloseLimit) + 1; //temp分

    const autoSavedArray = await getSessionsByTag(tagState, ['id', 'tag', 'date']);

    //上限を超えている場合は削除
    if (autoSavedArray.length > limit) {
        const removeSessions = autoSavedArray.slice(limit);
        for (let session of removeSessions) {
            removeSession(session.id);
        }
    }
}

async function getCurrentTabName() {
    let tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!S.get().ifSavePrivateWindow && tabs[0].incognito) {
        tabs = await browser.tabs.query({
            active: true,
        });
        tabs = tabs.filter((element) => {
            return !element.incognito;
        });

        const tabTitle = (tabs[0] != undefined) ? tabs[0].title : '';
        return await tabTitle;

    } else {
        return await tabs[0].title;
    }
}
