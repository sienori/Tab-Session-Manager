/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let S = new settingsObj;
S.initOptionsPage();

document.addEventListener('click', function (e) {
    switch (e.target.id) {
        case "save":
            save();
            break;
        case "export":
            exportSessions();
            break;
    }
});

function save() {
    S.saveOptionsPage();
}

document.getElementById("import").addEventListener("change", importSessions, false);

async function importSessions() {
    let sessions = [];
    for (let file of this.files) {
        session = await fileOpen(file);
        Array.prototype.push.apply(sessions, session);
    }
    margeSessions(sessions);
}

function fileOpen(file) {
    return new Promise(function (resolve, reject) {
        let reader = new FileReader();
        reader.readAsText(file);

        reader.onload = function (event) {
            if (file.name.toLowerCase().endsWith('.json')) {
                let jsonFile = JSON.parse(reader.result);
                if (checkImportFile(jsonFile)) {
                    resolve(jsonFile);
                }
            } else if (file.name.toLowerCase().endsWith('.session')) {
                resolve(parseOldSession(reader.result));
            }
        }
    })
}

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

    session.name = line[1].substr(5);
    session.sessionStartTime = parseInt(line[2].substr(10));
    session.date = moment(session.sessionStartTime).toISOString();
    session.tag = 'user';
    session.tabsNumber = 0;
    session.windows = {};

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
    /*
    for(let newSession of newSessions){
        for(let session of(sessions)){
            if(moment(newSession.date).valueOf()>=moment(session.date).valueOf()){
                sessions.splice(sessions.indexOf(session), 0, newSession)
            }
            console.log(session.);
        }
    }
    */

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
    console.log(sessions);
    //saveSessions(sessions);
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

function saveSessions() {
    browser.storage.local.set({
        'sessions': sessions
    });
}
