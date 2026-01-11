import React, { Component } from "react";
import browser from "webextension-polyfill";
import moment from "moment";
import mozlz4a from "mozlz4a";
import { v4 as uuidv4 } from "uuid";
import OptionContainer from "./OptionContainer";

const fileOpen = file => {
  if (/(?:\.jsonlz4|\.baklz4)(-\d+)?$/.test(file.name.toLowerCase())) {
    // sessionstore.jsonlz4
    // previous.jsonlz4
    // recovery.baklz4
    // upgrade.jsonlz4-20211001010123
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        let input = new Uint8Array(reader.result);
        let output = mozlz4a.decompress(input);
        return resolve(convertMozLz4Sessionstore(output));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = reader.result;
      if (file.name.toLowerCase().endsWith(".json")) {
        // Ignore BOM
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        if (!isJSON(text)) return resolve();

        let jsonFile = JSON.parse(text);
        if (isTSM(jsonFile)) {
          return resolve(parseSession(jsonFile));
        }
        if (isSessionBuddy(jsonFile)) {
          return resolve(convertSessionBuddy(jsonFile));
        }

        return resolve();
      }

      if (file.name.toLowerCase().endsWith(".session")) {
        return resolve(convertSessionManager(text));
      }

      return resolve();
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

const isTSM = file => {
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
    //ver6.0.0以前のセッションにlastEditedTimeを追加
    if (session.lastEditedTime === undefined) {
      session.lastEditedTime = session.date;
    }
  }
  return file;
};

const isSessionBuddy = file => {
  const currentKeys = ["generated", "type", "windows"];
  const previousKeys = ["created", "generated", "gid", "id", "type", "windows"];
  const savedKeys = ["created", "generated", "gid", "id", "modified", "name", "type", "windows"];
  if (file.hasOwnProperty("sessions")) {
    return file.sessions.every(session => {
      if (session.type == "current") {
        return currentKeys.every(key => session.hasOwnProperty(key));
      }
      if (session.type == "previous") {
        return previousKeys.every(key => session.hasOwnProperty(key));
      }
      if (session.type == "saved") {
        return savedKeys.every(key => session.hasOwnProperty(key));
      }

      return false;
    });
  } else {
    return false;
  }
};

const convertSessionBuddy = file => {
  let sessions = [];
  for (const SBSession of file.sessions) {
    let session = {
      windows: {},
      windowsNumber: 0,
      windowsInfo: {},
      tabsNumber: 0,
      name: SBSession?.name || "Unnamed Session",
      date: moment(SBSession?.created || new Date()).valueOf(),
      lastEditedTime: Date.now(),
      tag: [],
      sessionStartTime: moment(SBSession?.generated || new Date()).valueOf(),
      id: uuidv4()
    };

    for (const window of SBSession.windows) {
      session.windows[window.id] = {};
      for (const tab of window.tabs) {
        session.windows[window.id][tab.id] = tab;
        session.tabsNumber++;
      }
      session.windowsInfo[window.id] = window;
      delete session.windowsInfo[window.id].tabs;
      session.windowsNumber++;
    }

    sessions.push(session);
  }

  return sessions;
};

const convertSessionManager = file => {
  let session = {};
  const line = file.split(/\r\n|\r|\n/);

  session.windows = {};
  session.windowsNumber = 0;
  session.tabsNumber = 0;
  session.name = line[1].slice(5);
  session.date = moment(parseInt(line[2].slice(10))).valueOf();
  session.lastEditedTime = Date.now();
  session.tag = [];
  session.sessionStartTime = parseInt(line[2].slice(10));
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

const convertMozLz4Sessionstore = async file => {
  const mozSession = JSON.parse(new TextDecoder().decode(file));
  if (!(mozSession.version[0] === "sessionrestore" && mozSession.version[1] === 1)) {
    return;
  }

  let session = {};
  session.windows = {};
  session.windowsNumber = 0;
  session.tabsNumber = 0;
  session.name = "sessionstore backup " + moment(mozSession.session.lastUpdate).toLocaleString();
  session.date = mozSession.session.lastUpdate;
  session.lastEditedTime = Date.now();
  session.tag = [];
  session.sessionStartTime = mozSession.session.startTime;
  session.id = uuidv4();

  for (const win in mozSession.windows) {
    session.windows[win] = {};
    let index = 0;
    for (const tab of mozSession.windows[win].tabs) {
      const entryIndex = tab.index - 1;
      if (tab.entries[entryIndex]) {
        session.windows[win][index] = {
          id: index,
          index: index,
          windowId: parseInt(win, 10),
          lastAccessed: tab.lastAccessed,
          url: tab.entries[entryIndex].url,
          title: tab.entries[entryIndex].title,
          favIconUrl: tab.image,
          discarded: true
        };
      } else {
        // User typed value into URL bar but page was not loaded
        session.windows[win][index] = {
          id: index,
          index: index,
          windowId: parseInt(win, 10),
          lastAccessed: tab.lastAccessed,
          url: "about:blank#" + tab.userTypedValue,
          title: "New Tab",
          favIconUrl: tab.image,
          discarded: true
        };
      }
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
          captions={["importCaptionLabel", "importCaptionLabel2"]}
          extraCaption={
            <p className="caption">
              - Tab Session Manager (.json)
              <br />
              - Session Buddy (.json)
              <br />
              - Session Manager (.session)
              <br />
              - Firefox Session Store Backup (.jsonlz4 .baklz4)
              <br />
              <a
                href="https://github.com/sienori/Tab-Session-Manager/wiki/Q&A:-How-to-import-sessions-from-other-extensions"
                target="_blank"
              >
                {browser.i18n.getMessage("importCaptionLabel3")}{" "}
              </a>
            </p>
          }
          type="file"
          value="importButtonLabel"
          accept=".json, .session, .jsonlz4, .baklz4"
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
