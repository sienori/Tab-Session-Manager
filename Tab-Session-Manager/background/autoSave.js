/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let BeforeSettings = {};
//ifAutoSaveとautoSaveIntervalに変更があったらtrue
function isChangeAutoSaveSettings() {
    return new Promise(function (resolve, reject) {
        browser.storage.local.get(["Settings"], function (value) {
            if (JSON.stringify(BeforeSettings) != JSON.stringify(value.Settings)) {
                if (BeforeSettings.ifAutoSave != value.Settings.ifAutoSave || BeforeSettings.autoSaveInterval != value.Settings.autoSaveInterval) {

                    resolve(true);
                }
            }
            BeforeSettings = value.Settings;
            resolve(false);
        });
    })
}

let autoSaveTimer;

function startAutoSave() {
    autoSaveTimer = setInterval(async function () {
        let name = browser.i18n.getMessage("regularSaveSessionName");
        if (S.get().useTabTitleforAutoSave) name = await getCurrentTabName();
        const tag = ['regular'];
        const property = "default";
        saveSession(name, tag, property).then(() => {
            removeOverLimit("regular");
        }, () => {
            //失敗時

        });
    }, S.get().autoSaveInterval * 60 * 1000);
}

function stopAutoSave() {
    clearInterval(autoSaveTimer);
}

async function setAutoSave() {
    if (await isChangeAutoSaveSettings()) {
        stopAutoSave();
        if (S.get().ifAutoSave) {
            startAutoSave();
        }
    }
}

function onUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status == "complete") {
        autoSaveWhenClose();
    }
}

function autoSaveWhenClose() {
    return new Promise(async(resolve, reject) => {
        if (!IsOpeningSession && !IsSavingSession && (S.get().ifAutoSaveWhenClose || S.get().ifOpenLastSessionWhenStartUp)) {
            let name = browser.i18n.getMessage("winCloseSessionName");
            if (S.get().useTabTitleforAutoSave) name = await getCurrentTabName();
            const tag = ['winClose', 'temp'];
            const property = "default";
            saveSession(name, tag, property).then(function () {
                removeOverLimit("winClose");
                resolve();
            }, () => {
                //失敗時
                resolve();
            });
        }
    })
};

function openLastSession() {
    if (S.get().ifOpenLastSessionWhenStartUp) {
        const winCloseSessions = (sessions.filter((element, index, array) => {
            return (element.tag.includes("winClose") && !element.tag.includes("temp"));
        }));
        openSession(winCloseSessions[winCloseSessions.length - 1], "openInCurrentWindow");
    }
}

function removeOverLimit(tagState) {
    let limit;
    if (tagState == "regular") limit = S.get().autoSaveLimit;
    else if (tagState == "winClose") limit = parseInt(S.get().autoSaveWhenCloseLimit) + 1; //temp分

    //定期保存を列挙
    let autoSavedArray = [];
    for (let i in sessions) {
        if (sessions[i].tag.includes(tagState)) {
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

function getCurrentTabName() {
    return new Promise((resolve, reject) => {
        browser.tabs.query({
            active: true,
            currentWindow: true
        }).then((tabs) => {
            resolve(tabs[0].title);
        })
    });
}
