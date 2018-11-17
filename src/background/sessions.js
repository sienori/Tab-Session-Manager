import Sessions from "./sessions";
import log from "loglevel";

const logDir = "background/sessions";

let DB;
export default {
  init: () => {
    log.log(logDir, "init()");
    const request = window.indexedDB.open("sessions", 1);

    request.onupgradeneeded = e => {
      const db = request.result;
      const store = db.createObjectStore("sessions", {
        keyPath: "id"
      });

      store.createIndex("name", "name");
      store.createIndex("date", "date");
      store.createIndex("tag", "tag");
      store.createIndex("tabsNumber", "tabsNumber");
      store.createIndex("windowsNumber", "windowsNumber");
      store.createIndex("sessionStartTime", "sessionStartTime");
    };

    return new Promise(resolve => {
      request.onsuccess = e => {
        DB = request.result;
        resolve(e);
      };
      request.onerror = e => {
        log.error(logDir, "init()", e);
      };
    });
  },

  DBUpdate: async () => {
    log.log(logDir, "DBUpdate()");
    let sessions;
    try {
      sessions = await Session.getAll();
      await Session.deleteAll();
    } catch (e) {
      log.error(logDir, "DBUpdate()", e);
      return;
    }

    for (let session of sessions) {
      await Session.put(session).catch(() => {});
    }
  },

  put: session => {
    log.log(logDir, "put()", session);
    const db = DB;
    const transaction = db.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");
    const request = store.put(session);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = e => {
        log.error(logDir, "put()", e);
        reject();
      };
    });
  },

  delete: id => {
    log.log(logDir, "delete()", id);
    const db = DB;
    const transaction = db.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");
    const request = store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = e => {
        log.error(logDir, "delete()", e);
        reject();
      };
    });
  },

  deleteAll: () => {
    log.log(logDir, "deleteAll()");
    DB.close("sessions");

    const request = window.indexedDB.deleteDatabase("sessions");

    return new Promise(resolve => {
      request.onsuccess = () => {
        resolve(Sessions.init());
      };
      request.onerror = e => {
        log.error(logDir, "deleteAll()", e);
        reject();
      };
    });
  },

  get: id => {
    log.log(logDir, "get()", id);
    const db = DB;
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) resolve(request.result);
        else reject();
      };
      request.onerror = e => {
        log.error(logDir, "get()", e);
        reject();
      };
    });
  },

  getAll: (needKeys = null) => {
    log.log(logDir, "getAll()", needKeys);
    const db = DB;
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
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
      };
      request.onerror = e => {
        log.error(logDir, "getAll()", e);
        reject();
      };
    });
  },

  search: (index, key) => {
    log.log(logDir, "search()", index, key);
    const db = DB;
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    const request = store.index(index).openCursor(key, "next");

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
      };
      request.onerror = e => {
        log.error(logDir, "search()", e);
        resolve();
      };
    });
  }
};
