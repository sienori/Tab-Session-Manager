import log from "loglevel";
import { refreshAccessToken } from "./cloudAuth";
import { sliceTextByBytes } from "../common/sliceTextByBytes";

const logDir = "background/cloudAPIs";

export const listFiles = async (pageToken = "") => {
  log.log(logDir, "listFiles()");
  const accessToken = await refreshAccessToken();
  const params = {
    spaces: "appDataFolder",
    fields: [
      "files/id",
      "files/name",
      "files/appProperties/lastEditedTime",
      "files/appProperties/tag",
      "nextPageToken"
    ].join(","),
    pageSize: 1000,
    pageToken: pageToken
  }
  const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams(params)}`;
  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    const response = await fetch(url, { headers: headers });
    const result = await response.json();

    let files = result.files;
    if (result.nextPageToken) files = files.concat(await listFiles(result.nextPageToken));
    files = files.map(file => {
      file.appProperties.tag = file.appProperties?.tag?.split(",") || [];
      return file;
    });
    log.log(logDir, "=>listFiles()", files);
    return files;
  } catch (e) {
    log.error(logDir, "listFiles()", e);
    throw new Error();
  }
};

export const uploadSession = async (session, fileId = "") => {
  log.log(logDir, "uploadSession()", session, fileId);
  const metadata = {
    name: session.id,
    appProperties: {
      id: session.id,
      name: sliceTextByBytes(session.name, 115), // limited 124bytes
      date: session.date,
      lastEditedTime: session.lastEditedTime,
      tag: sliceTextByBytes(session.tag.join(","), 115),
      tabsNumber: session.tabsNumber,
      windowsNumber: session.windowsNumber
    },
    mimeType: "application/json"
  };
  if (!fileId) metadata.parents = ["appDataFolder"];
  const file = new Blob([JSON.stringify(session)], { type: "application/json" });
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const accessToken = await refreshAccessToken();
  const init = {
    method: fileId ? "PATCH" : "POST",
    headers: new Headers({ Authorization: "Bearer " + accessToken }),
    body: form
  };
  const url = `https://www.googleapis.com/upload/drive/v3/files${fileId ? `/${fileId}` : ""}?uploadType=multipart`;

  const result = await fetch(url, init).catch(e => {
    log.error(logDir, "uploadSession()", e);
  });
  const resultJson = await result.json();
  if (resultJson.error) log.error(logDir, "uploadSession()", resultJson);
  log.log(logDir, "=>uploadSession()", resultJson);
};

export const downloadFile = async fileId => {
  log.log(logDir, "downloadFile()", fileId);
  const accessToken = await refreshAccessToken();
  const params = { alt: "media" };
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?${new URLSearchParams(params)}`;
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    const response = await fetch(url, { headers: headers })
    const result = await response.json();

    log.log(logDir, "=>downloadFile()", result);
    return result;
  } catch (e) {
    log.error(logDir, "downloadFile", e);
    throw new Error();
  }
};

export const deleteAllFiles = async () => {
  log.log(logDir, "deleteAllFiles()");
  const files = await listFiles();
  for (let file of files) {
    await deleteFile(file.id);
  }
};

export const deleteFile = async fileId => {
  log.log(logDir, "deleteFiles()", fileId);
  const accessToken = await refreshAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    await fetch(url, { method: "DELETE", headers: headers });
  } catch (e) {
    log.error(logDir, "deleteFiles()", e.response);
    throw new Error();
  }
};
