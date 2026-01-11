import browser from "webextension-polyfill";
import moment from "moment";
import log from "loglevel";
import Sessions from "./sessions.js";
import { updateSession } from "./save.js";
import { getSettings } from "src/settings/settings";
import { endTrackingBySessionId } from "./track.js";

const logDir = "background/tag";

export const getValidatedTag = (tag, session) => {
  const comma = /,/g;
  const beginningAndEndSpaces = /(^( |　)*)|(( |　)*$)/g;
  const multipleSpaces = /( )+/g;
  tag = tag.replace(comma, " ").replace(beginningAndEndSpaces, "").replace(multipleSpaces, " ");

  const reservedTag = [
    "regular",
    "winClose",
    "browserExit",
    "temp",
    "_displayAll",
    "_user",
    "_auto",
    browser.i18n.getMessage("regularSaveSessionName"),
    browser.i18n.getMessage("winCloseSessionName"),
    browser.i18n.getMessage("browserExitSessionName"),
    browser.i18n.getMessage("startupLabel")
  ];
  const isNotEqual = value => value != tag;
  const currentTags = session.tag;
  if (!reservedTag.every(isNotEqual)) return "";
  if (!currentTags.every(isNotEqual)) return "";

  const onlySpaces = /^( |　)*$/;
  if (onlySpaces.test(tag)) return "";

  return tag;
};

export async function addTag(id, tag) {
  log.log(logDir, "addTag()", id, tag);
  let session = await Sessions.get(id).catch(() => {});
  if (!session) return;

  const validatedTag = getValidatedTag(tag, session);
  if (validatedTag === "") return;

  session.tag.push(validatedTag);
  return await updateSession(session);
}

export async function removeTag(id, tag) {
  log.log(logDir, "removeTag()", id, tag);
  let session = await Sessions.get(id).catch(() => {});
  if (session == undefined) return;

  const isNotEqual = value => {
    return value != tag;
  };
  const currentTags = session.tag;
  if (currentTags.every(isNotEqual)) return;

  session.tag = session.tag.filter(element => {
    return element != tag;
  });

  if (tag === "_tracking") endTrackingBySessionId(id);
  return await updateSession(session);
}

//指定されたタグを含むセッションを新しい順に取得 needKeysにはtag, dateが必須
export async function getSessionsByTag(tag, needKeys = null) {
  log.log(logDir, "getSessionsByTag()", tag, needKeys);
  const newestSort = (a, b) => {
    return moment(b.date).unix() - moment(a.date).unix();
  };
  const isIncludesTag = (element, index, array) => {
    return element.tag.includes(tag);
  };

  let sessions = await Sessions.getAll(needKeys).catch(() => {});
  sessions = sessions.filter(isIncludesTag);
  sessions.sort(newestSort);

  return sessions;
}

export async function applyDeviceName() {
  const shouldSaveDeviceName = getSettings("shouldSaveDeviceName");
  const deviceName = getSettings("deviceName");
  if (!(shouldSaveDeviceName && deviceName)) return;
  log.log(logDir, "applyDeviceName()", deviceName);

  const sessions = await Sessions.getAll().catch(() => {});
  for (let session of sessions) {
    const validatedTag = getValidatedTag(deviceName, session);
    if (validatedTag === "") continue;

    session.tag.push(validatedTag);
    await updateSession(session);
  }
}
