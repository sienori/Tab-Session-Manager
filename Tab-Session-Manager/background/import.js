/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

async function importSessions(newSessions) {
    Array.prototype.push.apply(sessions, newSessions);

    Array.prototype.push.apply(sessions, newSessions);
    sessions.sort(function (a, b) {
        a = moment(a.date).valueOf();
        b = moment(b.date).valueOf();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });

    //UUIDを無視
    let ignoreUuidSessions = [];
    for (let i in sessions) {
        ignoreUuidSessions[i] = {};
        Object.assign(ignoreUuidSessions[i], sessions[i]);
        delete ignoreUuidSessions[i].id;
    }

    //重複を削除
    for (let i = 0; i < sessions.length; i++) {
        if (JSON.stringify(ignoreUuidSessions[i]) === JSON.stringify(ignoreUuidSessions[i + 1])) {
            sessions.splice(i + 1, 1);
            ignoreUuidSessions.splice(i + 1, 1);
            i--;
        }
    }
    setStorage();
}

async function backupSessions() {
    if (!S.get().ifBackup) return;
    if (sessions.length == 0) return;

    const downloadUrl = URL.createObjectURL(
        new Blob([JSON.stringify(sessions, null, '    ')], {
            type: 'aplication/json'
        })
    );

    const fileName = returnFileName();

    await browser.downloads.download({
        url: downloadUrl,
        filename: `TabSessionManager - Backup/${fileName}.json`,
        conflictAction: 'uniquify',
        saveAs: false
    });

    removeBackupFile();
}

function returnFileName() {
    const sessionsLabel = browser.i18n.getMessage('sessionsLabel');
    let fileName = `${sessions.length}${sessionsLabel} - ${moment().format(S.get().dateFormat)}`;

    const pattern = /\\|\/|\:|\?|\.|"|<|>|\|/g;
    fileName = fileName.replace(pattern, "-");
    return fileName;
}

async function removeBackupFile() {
    const backupItems = await browser.downloads.search({
        query: ['TabSessionManager - Backup'],
        orderBy: ['-startTime'],
        exists: true
    });

    const limit = S.get().backupFilesLimit;
    let count = 0;

    for (let i of backupItems) {
        count++;
        if (count < limit) continue;
        await browser.downloads.removeFile(i.id);
        await browser.downloads.erase({
            id: i.id
        });
    }
}
