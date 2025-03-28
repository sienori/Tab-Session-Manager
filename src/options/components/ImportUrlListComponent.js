import React, { Component } from "react";
import browser from "webextension-polyfill";
import { v4 as uuidv4 } from "uuid";
import OptionContainer from "./OptionContainer";

const createSessionByUrl = inputText => {
  let session = {
    windows: {
      1: {}
    },
    windowsNumber: 1,
    tabsNumber: 0,
    name: "",
    date: Date.now(),
    lastEditedTime: Date.now(),
    tag: [],
    sessionStartTime: Date.now(),
    id: uuidv4()
  };

  const urlList = inputText.split(/\r\n|\r|\n/);
  let tabId = 0;
  for (const urlLine of urlList) {
    const tab = createTabByUrl(urlLine, tabId);
    if (!tab) continue;

    session.windows[1][tabId] = tab;
    session.tabsNumber++;
    tabId++;
  }

  if (session.tabsNumber == 0) return;
  session.name = session.windows[1][0].title;
  return session;
};

const createTabByUrl = (urlLine, tabId) => {
  urlLine = urlLine.replace(/\t/g, " ").trim();
  const spaceIndex = urlLine.indexOf(" ");

  const url = spaceIndex == -1 ? urlLine : urlLine.slice(0, spaceIndex);
  const title = spaceIndex == -1 ? urlLine : urlLine.slice(spaceIndex + 1);

  if (url == "") return;
  if (!url.match(/^(http:|https:|file:|ftp:|about:|chrome:|moz-extension:|chrome-extension)/))
    return;

  return {
    active: tabId == 0 ? true : false,
    highlighted: false,
    id: tabId,
    incognito: false,
    index: tabId,
    isArticle: false,
    isInReaderMode: false,
    lastAccessed: Date.now(),
    pinned: false,
    selected: false,
    title: title,
    url: url,
    windowId: 1,
    favIconUrl: `http://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}`
  };
};

export default class ImportSessionsComponent extends Component {
  constructor() {
    super();
    this.state = {
      inputText: ""
    };
  }

  importSessions() {
    const session = createSessionByUrl(this.state.inputText);
    if (session === undefined) return;

    browser.runtime.sendMessage({
      message: "import",
      importSessions: [session]
    });
    alert(browser.i18n.getMessage("importMessage"));
    this.setState({
      inputText: ""
    });
  }

  handleChange(e) {
    this.setState({
      inputText: e.target.value
    });
  }

  render() {
    const caption = browser.i18n
      .getMessage("urlImportCaptionLabel")
      .replace(/<br>/g, "\n")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    return (
      <div>
        <OptionContainer
          title="urlImportLabel"
          captions={[caption]}
          useRawCaptions={true}
          type="button"
          value="importSaveButtonLabel"
          onClick={this.importSessions.bind(this)}
          extraCaption={
            <textarea
              id="urlImportList"
              spellCheck={false}
              placeholder="https://www.google.com/ Google                                                                                              https://github.com/"
              onChange={this.handleChange.bind(this)}
              value={this.state.inputText}
            />
          }
        />
      </div>
    );
  }
}
