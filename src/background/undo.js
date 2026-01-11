import browser from "webextension-polyfill";
import log from "loglevel";
import { updateSession, removeSession } from "./save";

const logDir = "background/undo";

const setHistory = async (changes, currentIndex) => {
  await browser.storage.session.set({ history: { changes, currentIndex } });
};

const getHistory = async () => {
  return (
    (await browser.storage.session.get("history")).history || { changes: [], currentIndex: -1 }
  );
};

export const recordChange = async (beforeSession, afterSession) => {
  if (beforeSession === undefined || afterSession === undefined) return;
  let { changes, currentIndex } = await getHistory();

  if (currentIndex < changes.length - 1) changes.splice(currentIndex + 1);
  changes.push({ before: beforeSession, after: afterSession });
  currentIndex = changes.length - 1;

  await setHistory(changes, currentIndex);
  updateUndoStatus();
};

export const undo = async () => {
  let { changes, currentIndex } = await getHistory();
  if (currentIndex < 0) return;
  log.log(logDir, "undo()", currentIndex, changes);

  if (changes[currentIndex].before) updateSession(changes[currentIndex].before);
  else removeSession(changes[currentIndex].after.id);
  currentIndex -= 1;

  await setHistory(changes, currentIndex);
  updateUndoStatus();
};

export const redo = async () => {
  let { changes, currentIndex } = await getHistory();
  if (currentIndex >= changes.length - 1) return;

  currentIndex += 1;
  if (changes[currentIndex].after) updateSession(changes[currentIndex].after);
  else removeSession(changes[currentIndex].before.id);

  await setHistory(changes, currentIndex);
  updateUndoStatus();
};

export const updateUndoStatus = async () => {
  const { changes, currentIndex } = await getHistory();

  const undoStatus = {
    undoCount: currentIndex + 1,
    redoCount: changes.length - 1 - currentIndex
  };
  browser.runtime
    .sendMessage({ message: "updateUndoStatus", undoStatus: undoStatus })
    .catch(() => {});
};
