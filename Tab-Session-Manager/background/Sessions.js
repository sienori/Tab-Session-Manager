/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Sessions = (function () {
    let self = {};

    let DB;

    self.init = () => {
        const request = window.indexedDB.open('sessions', 1);

        request.onupgradeneeded = e => {
            const db = request.result;
            const store = db.createObjectStore('sessions', {
                keyPath: 'id'
            });

            store.createIndex('name', 'name');
            store.createIndex('date', 'date');
            store.createIndex('tag', 'tag');
            store.createIndex('tabsNumber', 'tabsNumber');
            store.createIndex('windowsNumber', 'windowsNumber');
            store.createIndex('sessionStartTime', 'sessionStartTime');
        }

        return new Promise(resolve => {
            request.onsuccess = e => {
                DB = request.result;
                resolve(e);
            }
            request.onerror = e => {
                console.log(e);
            }
        });
    }

    self.DBUpdate = async() => {
        let sessions;
        try {
            sessions = await self.getAll();
            await self.deleteAll();
        } catch (e) {
            return;
        }

        for (let session of sessions) {
            await self.put(session).catch(() => {});
        }
    }

    self.put = session => {
        const db = DB;
        const transaction = db.transaction('sessions', 'readwrite');
        const store = transaction.objectStore('sessions');
        const request = store.put(session);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve();
            }
            request.onerror = e => {
                console.log(e);
                reject();
            }
        });
    }

    self.delete = id => {
        const db = DB;
        const transaction = db.transaction('sessions', 'readwrite');
        const store = transaction.objectStore('sessions');
        const request = store.delete(id);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                resolve();
            }
            transaction.onerror = e => {
                console.log(e);
                reject();
            }
        });
    }

    self.deleteAll = () => {
        DB.close('sessions');

        const request = window.indexedDB.deleteDatabase('sessions');

        return new Promise(resolve => {
            request.onsuccess = () => {
                resolve(self.init());
            }
            request.onerror = e => {
                console.log(e);
                reject();
            }
        });
    }

    self.get = id => {
        const db = DB;
        const transaction = db.transaction('sessions', 'readonly');
        const store = transaction.objectStore('sessions');
        const request = store.get(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) resolve(request.result);
                else reject();
            }
            request.onerror = e => {
                console.log(e);
                reject();
            }
        });
    }

    self.getAll = (needKeys = null) => {
        const db = DB;
        const transaction = db.transaction('sessions', 'readonly');
        const store = transaction.objectStore('sessions');
        const request = store.openCursor();

        let sessions = [];
        return new Promise((resolve, reject) => {
            request.onsuccess = e => {
                const cursor = request.result;
                if (cursor) {
                    let session = {};
                    if (needKeys == null) {
                        session = cursor.value;
                    } else {
                        for (let i of needKeys) {
                            session[i] = cursor.value[i];
                        }
                    }

                    sessions.push(session);
                    cursor.continue();
                } else {
                    resolve(sessions);
                }
            }
            request.onerror = e => {
                console.log(e);
                reject();
            }
        });
    }

    self.search = (index, key) => {
        const db = DB;
        const transaction = db.transaction('sessions', 'readonly');
        const store = transaction.objectStore('sessions');
        const request = store.index(index).openCursor(key, 'next');

        let sessions = [];
        return new Promise(resolve => {
            request.onsuccess = e => {
                const cursor = request.result;
                if (cursor) {
                    sessions.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(sessions);
                }
            }
            request.onerror = e => {
                console.log(e);
                resolve();
            }
        });
    }


    return self;
})();
