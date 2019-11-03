import React, { Component } from "react";
import browser from "webextension-polyfill";
import moment from "moment";
import uuidv4 from "uuid/v4";
import OptionContainer from "./OptionContainer";

const fileOpen = file => {
  return new Promise(function(resolve, reject) {
    let reader = new FileReader();
    reader.onload = event => {
      if (file.name.toLowerCase().endsWith(".json")) {
        if (!isJSON(reader.result)) {
          //jsonの構文を判定
          resolve(); //失敗
        } else {
          let jsonFile = JSON.parse(reader.result);
          if (checkImportFile(jsonFile)) {
            //データの構造を判定
            jsonFile = parseSession(jsonFile);
            resolve(jsonFile);
          } else {
            resolve(); //失敗
          }
        }
      } else if (file.name.toLowerCase().endsWith(".session")) {
        resolve(parseOldSession(reader.result));
      } else {
        resolve();
      }
    };
    reader.readAsText(file);
  });
};

const isJSON = arg => {
  arg = typeof arg === "function" ? arg() : arg;
  if (typeof arg !== "string") return false;
  try {
    arg = !JSON ? eval("(" + arg + ")") : JSON.parse(arg);
    return true;
  } catch (e) {
    return false;
  }
};

const isArray = o => {
  return Object.prototype.toString.call(o) === "[object Array]";
};

const checkImportFile = file => {
  if (!isArray(file)) return false;

  const correctKeys = ["windows", "tabsNumber", "name", "date", "tag", "sessionStartTime"];
  for (const session of file) {
    const sessionKeys = Object.keys(session);
    const isIncludes = value => {
      return sessionKeys.includes(value);
    };
    if (!correctKeys.every(isIncludes)) return false;
  }
  return true;
};

const parseSession = file => {
  for (const session of file) {
    //ver1.9.2以前のセッションのタグを配列に変更
    if (!Array.isArray(session.tag)) {
      session.tag = session.tag.split(" ");
    }
    //ver1.9.2以前のセッションにUUIDを追加 タグからauto, userを削除
    if (!session["id"]) {
      session["id"] = uuidv4();

      session.tag = session.tag.filter(element => {
        return !(element == "user" || element == "auto");
      });
    }
    //windowsNumberを追加
    if (session.windowsNumber === undefined) {
      session.windowsNumber = Object.keys(session.windows).length;
    }
    //ver4.0.0以前のdateをunix msに変更
    if (typeof session.date !== "number") {
      session.date = moment(session.date).valueOf();
    }
  }
  return file;
};

const parseOldSession = file => {
  let session = {};
  const line = file.split(/\r\n|\r|\n/);

  session.windows = {};
  session.windowsNumber = 0;
  session.tabsNumber = 0;
  session.name = line[1].substr(5);
  session.date = moment(parseInt(line[2].substr(10))).valueOf();
  session.tag = [];
  session.sessionStartTime = parseInt(line[2].substr(10));
  session.id = uuidv4();

  if (!isJSON(line[4])) return;

  const sessionData = JSON.parse(line[4]);

  for (const win in sessionData.windows) {
    session.windows[win] = {};
    let index = 0;
    for (const tab of sessionData.windows[win].tabs) {
      const entryIndex = tab.index - 1;
      session.windows[win][index] = {
        id: index,
        index: index,
        windowId: parseInt(win),
        lastAccessed: tab.lastAccessed,
        url: tab.entries[entryIndex].url,
        title: tab.entries[entryIndex].title,
        favIconUrl: tab.image
      };
      index++;
    }
    session.tabsNumber += index;
  }
  session.windowsNumber = Object.keys(session.windows).length;
  return [session];
};

const getSessionsState = sessions => {
  const sessionLabel = browser.i18n.getMessage("sessionLabel").toLowerCase();
  const sessionsLabel = browser.i18n.getMessage("sessionsLabel").toLowerCase();
  let sessionsState;
  if (sessions == undefined) sessionsState = browser.i18n.getMessage("readFailedMessage");
  else if (sessions.length <= 1) sessionsState = `${sessions.length} ${sessionLabel}`;
  else sessionsState = `${sessions.length} ${sessionsLabel}`;
  return sessionsState;
};

export default class ImportSessionsComponent extends Component {
  constructor() {
    super();
    this.state = {
      importedFiles: [],
      importedSessions: []
    };
  }

  async readSessions(e) {
    const files = e.target.files;
    if (files == undefined) return;

    for (const file of files) {
      const sessions = await fileOpen(file);

      const importedFiles = this.state.importedFiles.concat({
        name: file.name,
        state: getSessionsState(sessions)
      });
      let importedSessions;
      if (sessions === undefined) importedSessions = this.state.importedSessions;
      else importedSessions = this.state.importedSessions.concat(sessions);

      this.setState({
        importedFiles: importedFiles,
        importedSessions: importedSessions
      });
    }
  }

  async importSessions() {
    if (!this.state.importedSessions.length) return;

    const sendImportMessage = async sessions => {
      if (sessions.length == 0) return;
      try {
        await browser.runtime.sendMessage({
          message: "import",
          importSessions: sessions
        });
      } catch (e) {
        //セッションが巨大だとsendMessageに失敗する
        //その場合は2分割して送信する
        const midIndex = Math.floor(sessions.length / 2);
        await sendImportMessage(sessions.slice(0, midIndex));
        await sendImportMessage(sessions.slice(midIndex, sessions.length + 1));
      }
    };

    await sendImportMessage(this.state.importedSessions);

    alert(browser.i18n.getMessage("importMessage"));
    this.clearSessions();
  }

  clearSessions() {
    this.setState({
      importedFiles: [],
      importedSessions: []
    });
  }

  render() {
    const buttons = (
      <div className="optionElement buttonsContainer">
        <div className="optionForm">
          <input
            type="button"
            value={browser.i18n.getMessage("importSaveButtonLabel")}
            onClick={this.importSessions.bind(this)}
          />
        </div>
        <div className="optionForm">
          <input
            type="button"
            value={browser.i18n.getMessage("cancelLabel")}
            onClick={this.clearSessions.bind(this)}
          />
        </div>
      </div>
    );

    return (
      <div>
        <OptionContainer
          id="import"
          title="importLabel"
          captions={["importCaptionLabel"]}
          type="file"
          value="importButtonLabel"
          accept=".json, .session"
          multiple={true}
          onChange={this.readSessions.bind(this)}
        >
          <ul className="childElements">
            {this.state.importedFiles.map((file, index) => (
              <OptionContainer
                key={index}
                title={file.name}
                captions={[file.state]}
                useRawTitle={true}
                useRawCaptions={true}
                type="none"
              />
            ))}
            {this.state.importedFiles.length > 0 ? buttons : ""}
          </ul>
        </OptionContainer>
      </div>
    );
  }
}
