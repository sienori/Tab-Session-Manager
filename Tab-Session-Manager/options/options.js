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
            ImportSessions = [];
            break;
    }
});

let saveByChangeItems = document.getElementsByClassName("saveByChange");
for (let item of saveByChangeItems) {
    item.addEventListener("change", save);
}

function save() {
    const inputs = ['tstDelay', 'autoSaveInterval', 'autoSaveLimit', 'autoSaveWhenCloseLimit', 'backupFilesLimit', 'popupWidth', 'popupHeight'];
    for (let i of inputs) replaceInvalidValue(i);

    S.saveOptionsPage();
}

function replaceInvalidValue(elementId) {
    const element = document.getElementById(elementId);

    if (element.validity.rangeOverflow) element.value = element.max;
    else if (element.validity.rangeUnderflow) element.value = element.min;

    if (element.validity.badInput || element.value == '' || !element.validity.valid) element.value = element.defaultValue;
}

function removeSessions() {
    let res = confirm(browser.i18n.getMessage("warningRemoveAllMessage"));
    if (res == true) {
        browser.runtime.sendMessage({
            message: "clearAllSessions"
        });
    }
}

document.getElementById("import").addEventListener("change", importSessions, false);

let ImportSessions = [];
async function importSessions() {
    const files = document.getElementById("import").files;
    if (files == undefined) return;

    for (let file of files) {
        session = await fileOpen(file);
        showImportFile(file.name, session);
        Array.prototype.push.apply(ImportSessions, session);
    }
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
                        jsonFile = parseSession(jsonFile);
                        resolve(jsonFile);
                    } else {
                        resolve(); //失敗
                    }
                }

            } else if (file.name.toLowerCase().endsWith('.session')) {
                resolve(parseOldSession(reader.result));
            } else {
                resolve();
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

function isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
}

function checkImportFile(file) {
    if (!isArray(file)) return false;

    const correctKeys = ["windows", "tabsNumber", "name", "date", "tag", "sessionStartTime"].toString();
    const correctKeys2 = ["windows", "tabsNumber", "name", "date", "tag", "sessionStartTime", "id"].toString();

    for (let session of file) {
        const sessionKeys = Object.keys(session).toString();
        if ((sessionKeys != correctKeys) && (sessionKeys != correctKeys2)) {
            return false;
        }
    }
    return true;
}

function parseSession(file) {
    for (let session of file) {
        //ver1.9.2以前のセッションのタグを配列に変更
        if (!Array.isArray(session.tag)) {
            session.tag = session.tag.split(' ');
        }

        //ver1.9.2以前のセッションにUUIDを追加 タグからauto, userを削除
        if (!session['id']) {
            session['id'] = UUID.generate();

            session.tag = session.tag.filter((element) => {
                return !(element == 'user' || element == 'auto');
            });
        }
    }
    return file;
}

function parseOldSession(file) {
    let session = {};
    line = file.split(/\r\n|\r|\n/);

    session.windows = {};
    session.tabsNumber = 0;
    session.name = line[1].substr(5);
    session.date = moment(parseInt(line[2].substr(10))).toISOString();
    session.tag = [];
    session.sessionStartTime = parseInt(line[2].substr(10));
    session.id = UUID.generate();

    if (!isJSON(line[4])) return;

    let sessionData = JSON.parse(line[4]);

    for (let win in sessionData.windows) {
        session.windows[win] = {};
        let index = 0;
        for (let tab of sessionData.windows[win].tabs) {
            const entryIndex = tab.index - 1;
            session.windows[win][index] = {
                id: index,
                index: index,
                windowId: parseInt(win),
                lastAccessed: tab.lastAccessed,
                url: tab.entries[entryIndex].url,
                title: tab.entries[entryIndex].title,
                favIconUrl: tab.image
            };

            index++;
        }
        session.tabsNumber += index;
    }
    return [session];
}

function importSave() {
    if (ImportSessions.length != undefined) {
        browser.runtime.sendMessage({
            message: "import",
            importSessions: ImportSessions
        });
        alert(browser.i18n.getMessage("importMessage"));
    }
    ImportSessions = [];
    clearImportFile();
}

async function exportSessions(id = null) {
    const sessions = await getSessions(id);

    const downloadUrl = URL.createObjectURL(
        new Blob([JSON.stringify(sessions, null, '    ')], {
            type: 'aplication/json'
        })
    );

    const fileName = returnFileName(sessions);

    const downloading = browser.downloads.download({
        url: downloadUrl,
        filename: `${fileName}.json`,
        conflictAction: 'uniquify',
        saveAs: true
    });
    downloading;
}

async function getSessions(id) {
    return new Promise(function (resolve, reject) {
        browser.runtime.sendMessage({
            message: "getSessions",
            id: id
        }).then((response) => {
            resolve(response.sessions);
        });
    });
}

function returnFileName(sessions) {
    let fileName;
    if (sessions.length == 1) {
        fileName = `${sessions[0].name} - ${moment(sessions[0].date).format(S.get().dateFormat)}`;
    } else {
        const sessionsLabel = browser.i18n.getMessage('sessionsLabel');
        fileName = `${sessionsLabel} - ${moment().format(S.get().dateFormat)}`;
    }
    const pattern = /\\|\/|\:|\?|\.|"|<|>|\|/g;
    fileName = fileName.replace(pattern, "-");
    return fileName;
}
