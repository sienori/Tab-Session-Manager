import log from "loglevel";

const logDir = "background/tabAssets";
const DB_NAME = "tabAssets";
const DB_VERSION = 1;
const STORE_THUMBNAILS = "thumbnails";
const STORE_OFFLINE = "offlinePages";

let dbInstance = null;
let initPromise = null;

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) {
        db.createObjectStore(STORE_THUMBNAILS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_OFFLINE)) {
        db.createObjectStore(STORE_OFFLINE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = event => {
      reject(event.target.error);
    };
  });
};

const getDb = async () => {
  if (dbInstance) return dbInstance;
  if (!initPromise) initPromise = openDatabase();
  dbInstance = await initPromise;
  return dbInstance;
};

const runTransaction = async (storeName, mode, callback) => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let requestResult;

    try {
      requestResult = callback(store);
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => resolve(requestResult?.result ?? requestResult);
    tx.onerror = event => reject(event.target.error);
  });
};

export const initTabAssets = async () => {
  if (dbInstance || initPromise) {
    await getDb();
    return;
  }
  log.info(logDir, "initTabAssets()");
  await getDb();
};

export const putThumbnail = async record => {
  log.debug(logDir, "putThumbnail()", record?.id);
  return runTransaction(STORE_THUMBNAILS, "readwrite", store => store.put(record));
};

export const putOfflinePage = async record => {
  log.debug(logDir, "putOfflinePage()", record?.id);
  return runTransaction(STORE_OFFLINE, "readwrite", store => store.put(record));
};

export const getThumbnail = async id => {
  if (!id) return undefined;
  log.debug(logDir, "getThumbnail()", id);
  return runTransaction(STORE_THUMBNAILS, "readonly", store => store.get(id));
};

export const getOfflinePage = async id => {
  if (!id) return undefined;
  log.debug(logDir, "getOfflinePage()", id);
  return runTransaction(STORE_OFFLINE, "readonly", store => store.get(id));
};

const deleteRecords = async (storeName, ids) => {
  if (!ids?.length) return;
  log.debug(logDir, "deleteRecords()", storeName, ids.length);
  const db = await getDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    ids.forEach(id => store.delete(id));
    tx.oncomplete = resolve;
    tx.onerror = event => reject(event.target.error);
  });
};

export const deleteThumbnails = async ids => deleteRecords(STORE_THUMBNAILS, ids);

export const deleteOfflinePages = async ids => deleteRecords(STORE_OFFLINE, ids);

export const deleteBySession = async sessionId => {
  if (!sessionId) return;
  log.debug(logDir, "deleteBySession()", sessionId);
  const db = await getDb();
  await Promise.all([
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_THUMBNAILS, "readwrite");
      const store = tx.objectStore(STORE_THUMBNAILS);
      const request = store.openCursor();
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = event => reject(event.target.error);
    }),
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE, "readwrite");
      const store = tx.objectStore(STORE_OFFLINE);
      const request = store.openCursor();
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = event => reject(event.target.error);
    })
  ]);
};

export const deleteAllAssets = async () => {
  log.info(logDir, "deleteAllAssets()");
  const db = await getDb();
  db.close();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      dbInstance = null;
      initPromise = null;
      resolve();
    };
    request.onerror = event => reject(event.target.error);
  });
  await initTabAssets();
};

export const collectAssetIds = session => {
  const thumbnailIds = [];
  const offlineIds = [];
  if (!session?.windows) return { thumbnailIds, offlineIds };
  Object.entries(session.windows).forEach(([windowId, tabs]) => {
    Object.entries(tabs).forEach(([tabId, tab]) => {
      if (tab?.thumbnailId) thumbnailIds.push(tab.thumbnailId);
      if (tab?.offlineBackupId) offlineIds.push(tab.offlineBackupId);
    });
  });
  return { thumbnailIds, offlineIds };
};

export const closeTabAssetsDatabase = () => {
  if (dbInstance) dbInstance.close();
  dbInstance = null;
  initPromise = null;
};
