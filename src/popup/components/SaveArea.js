import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import { getSettings } from "src/settings/settings";
import { sendSessionSaveMessage } from "../actions/controlSessions";
import SaveMenuItems from "./SaveMenuItems";
import TriangleIcon from "../icons/triangle.svg";
import "../styles/SaveArea.scss";
import "../styles/InputForm.scss";

export default class SaveArea extends Component {
  constructor(props) {
    super(props);
  }

  getCurrentTabName = async () => {
    let tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!getSettings("ifSavePrivateWindow") && tabs[0].incognito) {
      tabs = await browser.tabs.query({ active: true });
      tabs = tabs.filter(element => !element.incognito);
      const tabTitle = tabs[0] != undefined ? tabs[0].title : "";
      return tabTitle;
    } else {
      return tabs[0].title;
    }
  };

  handleKeyPress = e => {
    if (e.key === "Enter") this.saveSession();
  };

  saveSession = () => {
    const name = ReactDOM.findDOMNode(this.refs.input).value;
    sendSessionSaveMessage(name);
  };

  openMenu = e => {
    const name = ReactDOM.findDOMNode(this.refs.input).value;
    this.props.openMenu(e.pageX, e.pageY, <SaveMenuItems name={name} />);
  };

  focusInput() {
    const input = ReactDOM.findDOMNode(this.refs.input);
    input.focus();
  }

  setTabName = async () => {
    const tabName = await this.getCurrentTabName();
    const input = ReactDOM.findDOMNode(this.refs.input);
    input.value = tabName;
  };

  componentDidMount() {
    this.focusInput();
    this.setTabName();
  }

  render() {
    return (
      <div id="saveArea">
        <div className="inputForm">
          <input
            type="text"
            ref="input"
            spellCheck={false}
            placeholder={browser.i18n.getMessage("initialNameValue")}
            onKeyPress={this.handleKeyPress}
          />
          <button
            className="submitButton saveButton"
            onClick={this.saveSession}
            title={browser.i18n.getMessage("initialNameValue")}
          >
            {browser.i18n.getMessage("saveLabel")}
          </button>
          <button
            className="submitButton saveOptionButton"
            onClick={this.openMenu}
            title={browser.i18n.getMessage("menuLabel")}
          >
            <TriangleIcon />
          </button>
        </div>
      </div>
    );
  }
}
