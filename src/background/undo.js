import browser from "webextension-polyfill";
import log from "loglevel";
import { updateSession, removeSession } from "./save";

const logDir = "background/undo";

let changes = [];
let currentIndex = -1;

export const recordChange = (beforeSession, afterSession) => {
  if (beforeSession === undefined || afterSession === undefined) return;
  if (currentIndex < changes.length - 1) changes.splice(currentIndex + 1);
  changes.push({ before: beforeSession, after: afterSession });
  currentIndex = changes.length - 1;

  updateUndoStatus();
};

export const undo = () => {
  if (currentIndex < 0) return;
  log.log(logDir, "undo()", currentIndex, changes);

  if (changes[currentIndex].before) updateSession(changes[currentIndex].before);
  else removeSession(changes[currentIndex].after.id);
  currentIndex -= 1;

  updateUndoStatus();
};

export const redo = () => {
  if (currentIndex >= changes.length - 1) return;
  log.log(logDir, "redo()", currentIndex, changes);

  currentIndex += 1;
  if (changes[currentIndex].after) updateSession(changes[currentIndex].after);
  else removeSession(changes[currentIndex].before.id);

  updateUndoStatus();
};

export const updateUndoStatus = () => {
  const undoStatus = {
    undoCount: currentIndex + 1,
    redoCount: changes.length - 1 - currentIndex,
  };
  browser.runtime
    .sendMessage({ message: "updateUndoStatus", undoStatus: undoStatus })
    .catch(() => { });
};