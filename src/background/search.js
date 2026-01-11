import browser from "webextension-polyfill";
import Sessions from "./sessions.js";
import { makeSearchInfo } from "../common/makeSearchInfo.js";

export const getsearchInfo = async () => {
  const sessions = await Sessions.getAll(["id", "windows"]).catch(() => {});
  const searchInfo = sessions.map(session => makeSearchInfo(session));
  return searchInfo;
};
