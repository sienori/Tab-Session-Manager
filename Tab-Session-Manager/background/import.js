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
