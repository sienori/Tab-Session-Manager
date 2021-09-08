import Sessions from "./sessions";
import log from "loglevel";

const logDir = "background/sessions";

let DB;
export default {
  init: () => {
    log.log(logDir, "init()");
    navigator.storage.persist();
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
        log.log(logDir, "=>init()", e);
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
      await Session.put(session).catch(e => {
        log.error(logDir, "DBUpdate()", e);
      });
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
        log.log(logDir, "=>put()", "success");
        resolve();
      };
      request.onerror = e => {
        log.error(logDir, "put()", e.target);
        reject(e.target);
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
        log.log(logDir, "=>delete()", "complete");
        resolve();
      };
      transaction.onerror = e => {
        log.error(logDir, "delete()", e.target);
        reject(e.target);
      };
    });
  },

  deleteAll: () => {
    log.log(logDir, "deleteAll()");
    DB.close("sessions");

    const request = window.indexedDB.deleteDatabase("sessions");

    return new Promise(resolve => {
      request.onsuccess = () => {
        log.log(logDir, "=>deleteAll()", "success");
        resolve(Sessions.init());
      };
      request.onerror = e => {
        log.error(logDir, "deleteAll()", e);
        reject(e);
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
        if (request.result) {
          log.log(logDir, "=>get()", request.result);
          resolve(request.result);
        } else reject(request);
      };
      request.onerror = e => {
        log.error(logDir, "get()", e);
        reject(request);
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
          log.log(logDir, "=>getAll()", sessions);
          resolve(sessions);
        }
      };
      request.onerror = e => {
        log.error(logDir, "getAll()", e);
        reject(request);
      };
    });
  },

  getAllWithStream: (sendResponse, needKeys, count) => {
    log.log(logDir, "getAllWithStream()", needKeys, count);
    const db = DB;
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    const request = store.openCursor();

    let sessions = [];

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
        if (sessions.length === count) {
          sendResponse(sessions, false);
          sessions = [];
        }
        cursor.continue();
      } else {
        log.log(logDir, "=>getAllWithStream()");
        sendResponse(sessions, true);
      }
    };
    request.onerror = e => {
      log.error(logDir, "getAllWithStream()", e);
    };
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
          log.log(logDir, "=>search()", sessions);
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
