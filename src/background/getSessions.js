import Sessions from "./sessions";

export default async (id = null, needKeys = null) => {
  let sessions;
  if (id == null) {
    sessions = await Sessions.getAll(needKeys).catch(() => {});
  } else {
    sessions = await Sessions.get(id).catch(() => {});
  }

  //該当するセッションが存在しない時
  //idを指定:undefined, 非指定:[] を返す
  return sessions;
};
