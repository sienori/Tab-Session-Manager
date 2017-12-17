/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let S = new settingsObj;
S.initOptionsPage();

let MargedSessions = {};

document.addEventListener('click', function (e) {
    switch (e.target.id) {
        case "export":
            exportSessions();
            break;
        case "removeSessions":
            removeSessions();
            break;
        case "importSave":
            importSave();
            break;
        case "importClear":
            clearImportFile();
            break;
    }
});

let saveByChangeItems = document.getElementsByClassName("saveByChange");
for (let item of saveByChangeItems) {
    item.addEventListener("change", save);
}

function save() {
    S.saveOptionsPage();
}

function removeSessions() {
    let res = confirm(browser.i18n.getMessage("warningRemoveAllMessage"));
    if (res == true) {
        saveSessions([]);
    }
}

document.getElementById("import").addEventListener("change", importSessions, false);

async function importSessions() {
    let sessions = [];
    for (let file of this.files) {
        session = await fileOpen(file);
        showImportFile(file.name, session);
        Array.prototype.push.apply(sessions, session);
    }
    margeSessions(sessions);
}

function fileOpen(file) {
    return new Promise(function (resolve, reject) {
        let reader = new FileReader();
        reader.onload = function (event) {
            if (file.name.toLowerCase().endsWith('.json')) {

                if (!isJSON(reader.result)) { //jsonの構文を判定
                    resolve(); //失敗
                } else {
                    let jsonFile = JSON.parse(reader.result);
                    if (checkImportFile(jsonFile)) { //データの構造を判定
                        resolve(jsonFile);
                    } else {
                        resolve(); //失敗
                    }
                }

            } else if (file.name.toLowerCase().endsWith('.session')) {
                resolve(parseOldSession(reader.result));
            }
        }
        reader.readAsText(file);
    })
}

function isJSON(arg) {
    arg = (typeof arg === "function") ? arg() : arg;
    if (typeof arg !== "string") {
        return false;
    }
    try {
        arg = (!JSON) ? eval("(" + arg + ")") : JSON.parse(arg);
        return true;
    } catch (e) {
        return false;
    }
};

function checkImportFile(file) {
    let correctSession = ["windows", "tabsNumber", "name", "date", "tag", "sessionStartTime"];
    for (let session of file) {
        if (Object.keys(session).toString() != correctSession.toString()) {
            return false;
        }
    }
    return true;
}

function parseOldSession(file) {
    let session = {};
    line = file.split(/\r\n|\r|\n/);

    session.windows = {};
    session.tabsNumber = 0;
    session.name = line[1].substr(5);
    session.date = moment(parseInt(line[2].substr(10))).toISOString();
    session.tag = 'user';
    session.sessionStartTime = parseInt(line[2].substr(10));

    let sessionData = JSON.parse(line[4]);

    for (let win in sessionData.windows) {
        session.windows[win] = {};
        let index = 0;
        for (let tab of sessionData.windows[win].tabs) {
            session.windows[win][tab.entries[0].ID] = {
                id: tab.entries[0].ID,
                index: index,
                windowId: parseInt(win),
                lastAccessed: tab.lastAccessed,
                url: tab.entries[0].url,
                title: tab.entries[0].title,
                favIconUrl: tab.image
            };

            index++;
        }
        session.tabsNumber += index;
    }
    return [session];
}

async function margeSessions(newSessions) {
    let sessions = await getSessions();
    Array.prototype.push.apply(sessions, MargedSessions);

    Array.prototype.push.apply(sessions, newSessions);
    sessions.sort(function (a, b) {
        a = moment(a.date).valueOf();
        b = moment(b.date).valueOf();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });

    //重複を削除
    for (let i = 0; i < sessions.length; i++) {
        if (JSON.stringify(sessions[i]) === JSON.stringify(sessions[i + 1])) {
            sessions.splice(i + 1, 1);
            i--;
        }
    }
    MargedSessions = sessions;
}

function importSave() {
    if (MargedSessions.length != undefined) {
        saveSessions(MargedSessions);
        alert(browser.i18n.getMessage("importMessage"));
        clearImportFile();
    }
    MargedSessions = {};
}

async function exportSessions() {
    let sessions = await getSessions();
    let downloadUrl = URL.createObjectURL(
        new Blob([JSON.stringify(sessions, null, '    ')], {
            type: 'aplication/json'
        })
    );

    let downloading = browser.downloads.download({
        url: downloadUrl,
        filename: 'sessions.json',
        conflictAction: 'uniquify',
        saveAs: true
    });
    downloading;
}

function getSessions() {
    return new Promise(function (resolve, reject) {
        browser.storage.local.get(["sessions"], function (value) {
            if (value.sessions != undefined) sessions = value.sessions;
            else sessions = [];
            resolve(sessions);
        });
    })
}

function saveSessions(sessions) {
    browser.storage.local.set({
        'sessions': sessions
    }).then(() => {
        browser.runtime.sendMessage({
            message: "import"
        });
    })
}
