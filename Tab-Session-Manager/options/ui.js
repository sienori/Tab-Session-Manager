/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let e = {};
e.hash = location.href;

if (e.hash.indexOf("#") != -1) {
  e.hash = "#" + e.hash.split("#")[1];
} else {
  e.hash = "#settings";
}
readHash(e);

// hash の監視を開始
tm.HashObserver.enable();
document.addEventListener("changehash", readHash, false);

function readHash(e) {
  const hash = e.hash.split("?")[0];
  let selected = document.getElementsByClassName("selected");
  selected[0].classList.remove("selected");

  document.getElementById("settings").style.display = "none";
  document.getElementById("sessions").style.display = "none";
  document.getElementById("information").style.display = "none";

  switch (hash) {
    case "#settings":
      document.getElementById("settings").style.display = "block";
      document
        .getElementsByClassName("settingsLabel")[0]
        .classList.add("selected");
      break;
    case "#sessions":
      document.getElementById("sessions").style.display = "block";
      document
        .getElementsByClassName("sessionsLabel")[0]
        .classList.add("selected");
      break;
    case "#information":
      document.getElementById("information").style.display = "block";
      document
        .getElementsByClassName("informationLabel")[0]
        .classList.add("selected");
      break;
    default:
      document.getElementById("settings").style.display = "block";
      document
        .getElementsByClassName("settingsLabel")[0]
        .classList.add("selected");
      break;
  }

  const params = getParams(e.hash);
  switch (params.action) {
    case "export":
      exportSessions(params.id);
      break;
    case "updated":
      showUpdated();
      break;
  }
}

function getParams(hash) {
  let params = {};
  if (hash.split("?")[1] == undefined) return params;
  hash = hash.split("?")[1].split("&");
  for (let i of hash) {
    params[i.split("=")[0]] = i.split("=")[1];
  }
  return params;
}

const sanitaize = {
  encode: str => {
    str = str || "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
  decode: str => {
    str = str || "";
    return str
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }
};

function showImportFile(fileName, sessions) {
  document.getElementById("fileList").parentNode.style.display = "block";
  document
    .getElementById("fileList")
    .insertAdjacentHTML("beforeend", returnFileListNode(fileName, sessions));
}

function returnFileListNode(fileName, sessions) {
  const sessionLabel = browser.i18n.getMessage("sessionLabel").toLowerCase();
  const sessionsLabel = browser.i18n.getMessage("sessionsLabel").toLowerCase();
  let sessionsState;
  if (sessions == undefined)
    sessionsState = browser.i18n.getMessage("readFailedMessage");
  else if (sessions.length <= 1)
    sessionsState = `${sessions.length} ${sessionLabel}`;
  else sessionsState = `${sessions.length} ${sessionsLabel}`;

  return `<li><div class=optionContainer><div class=optionText>
                <p>${sanitaize.encode(fileName)}</p>
                <p class=caption>${sessionsState}</p>
            </div></div></li>`;
}

function clearImportFile() {
  document.getElementById("fileList").parentNode.style.display = "none";
  document.getElementById("fileList").innerHTML = "";
}

function showUpdated() {
  const version = document.getElementsByClassName("addonVersion")[0];
  version.classList.add("updated");
}

function replaceBackupFolderName() {
  const backupFolder = document.getElementById("backupFolder");

  const specialChars = /\:|\?|\.|"|<|>|\|/g; //使用できない特殊文字
  const slash = /\//g; //単一のスラッシュ
  const spaces = /\s\s+/g; //連続したスペース
  const backSlashs = /\\\\+/g; //連続したバックスラッシュ
  const sandwich = /(\s\\|\\\s)+(\s|\\)?/g; //バックスラッシュとスペースが交互に出てくるパターン
  const beginningEnd = /^(\s|\\)+|(\s|\\)+$/g; //先頭と末尾のスペース,バックスラッシュ

  const folderName = backupFolder.value
    .replace(specialChars, "-")
    .replace(slash, "\\")
    .replace(spaces, " ")
    .replace(backSlashs, "\\")
    .replace(sandwich, "\\")
    .replace(beginningEnd, "");

  backupFolder.value = folderName;

  const showArea = document.getElementById("showBackupFolder");
  showArea.innerText = `${folderName == "" ? "" : "\\"}${folderName}`;
}

function openDownloadFolder() {
  browser.downloads.showDefaultFolder();
}

replaceBackupFolderName();
document.getElementById(
  "openDownloadFolder"
).innerText = `[${browser.i18n.getMessage("downloadFolderLabel")}]`;
document.getElementsByClassName("amazonUrl")[0].href = browser.i18n.getMessage(
  "amazonUrl"
);
document.getElementsByClassName("addonUrl")[0].href = browser.i18n.getMessage(
  "addonUrl"
);
document
  .getElementsByClassName("addonVersion")[0]
  .getElementsByClassName("caption")[0]
  .getElementsByTagName("a")[0].innerText = `Version ${
  browser.runtime.getManifest().version
}`;
