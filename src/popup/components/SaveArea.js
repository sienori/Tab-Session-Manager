import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import { getSettings, initSettings } from "src/settings/settings";
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

  handleKeyDown = e => {
    if (e.key === "Tab" && e.shiftKey) {
      this.props.sessionsAreaRef.focus();
      e.preventDefault();
    }
  };

  saveSession = () => {
    const input = this.props.saveAreaRef.current;
    const name = input.value;
    const defaultBehavior = getSettings("saveButtonBehavior");
    this.props.saveSession(name, defaultBehavior);
  };

  openMenu = e => {
    const input = this.props.saveAreaRef.current;
    const name = input.value;
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <SaveMenuItems name={name} saveSession={this.props.saveSession} />);
    e.preventDefault();
  };

  setTabName = async () => {
    await initSettings();
    const tabName = await this.getCurrentTabName();
    const input = this.props.saveAreaRef.current;
    input.value = tabName;
  };

  getSaveButtonTitle = () => {
    const defaultBehavior = getSettings("saveButtonBehavior");
    switch (defaultBehavior) {
      case "saveAllWindows":
        return browser.i18n.getMessage("saveAllWindowsLabel");
      case "saveOnlyCurrentWindow":
        return browser.i18n.getMessage("saveOnlyCurrentWindowLabel");
      default:
        return "";
    }
  };

  componentDidMount() {
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
            onKeyDown={this.handleKeyDown}
            ref={this.props.saveAreaRef}
          />
          <button
            className="submitButton saveButton"
            onClick={this.saveSession}
            onContextMenu={this.openMenu}
            title={this.getSaveButtonTitle()}
          >
            {browser.i18n.getMessage("saveLabel")}
          </button>
          <button
            className="submitButton saveOptionButton"
            onClick={this.openMenu}
            onContextMenu={this.openMenu}
            title={browser.i18n.getMessage("menuLabel")}
          >
            <TriangleIcon />
          </button>
        </div>
      </div>
    );
  }
}
