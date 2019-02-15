import React, { Component } from "react";
import browserInfo from "browser-info";
import browser from "webextension-polyfill";
import ClearIcon from "../icons/clear.svg";
import RestetIcon from "../icons/reset.svg";

const normalizeKey = (key, keyCode) => {
  const alphabet = /^([a-z]|[A-Z])$/;
  if (alphabet.test(key)) return key.toUpperCase();

  const digit = /^[0-9]$/;
  const func = /^F([0-9]|1[0-2])$/;
  const homes = /^(Home|End|PageUp|PageDown|Insert|Delete)$/;
  if (digit.test(key) || func.test(key) || homes.test(key)) return key;

  const space = /^\s$/;
  if (space.test(key)) return "Space";

  const arrows = /^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/;
  if (arrows.test(key)) return key.split("Arrow")[1];

  const medias = /^(MediaPlayPause|MediaStop)$/;
  if (medias.test(key)) return key;
  if (key == "MediaTrackNext") return "MediaNextTrack";
  if (key == "MediaTrackPrevious") return "MediaPrevTrack";

  const keyCode0 = 48;
  if (keyCode0 <= keyCode && keyCode <= keyCode0 + 9) return keyCode - keyCode0;

  if (keyCode == 188) return "Comma";
  if (keyCode == 190) return "Period";

  return "";
};

export default class KeyboardShortcutForm extends Component {
  constructor(props) {
    super(props);
    this.isMac = browserInfo().os == "OS X";
    this.state = {
      shortcut: props.shortcut,
      value: props.shortcut,
      defaultValue: props.defaultValue,
      error: ""
    };
  }

  handleFocus(e) {
    e.target.select();
    window.document.onkeydown = () => false;
    window.document.onkeypress = () => false;
  }

  handleBlur(e) {
    const shortcut = this.state.shortcut;
    this.setState({ error: "", value: shortcut });
    window.document.onkeydown = () => true;
    window.document.onkeypress = () => true;
  }

  handleChange(e) {}

  handleKeyDown(e) {
    if (e.repeat) return;
    if (e.key == "Tab") {
      window.document.activeElement.blur();
      return;
    }
    const normalizedKey = normalizeKey(e.key, e.keyCode);
    let error = "";

    const mediaKeys = /^(MediaPlayPause|MediaStop|MediaNextTrack|MediaPrevTrack)$/;
    const funcKeys = /^F([0-9]|1[0-2])$/;
    const modifierKeys = /^(Control|Alt|Shift|Meta)$/;

    if (mediaKeys.test(normalizedKey) || funcKeys.test(normalizedKey)) error = "";
    else if (modifierKeys.test(e.key)) error = browser.i18n.getMessage("typeLetterMessage");
    else if (!e.ctrlKey && !e.altKey && !e.metaKey)
      error = this.isMac
        ? browser.i18n.getMessage("includeMacModifierKeysMessage")
        : browser.i18n.getMessage("includeModifierKeysMessage");
    else if (normalizedKey == "") error = browser.i18n.getMessage("invalidLetterMessage");

    const value = `${e.ctrlKey ? (this.isMac ? "MacCtrl+" : "Ctrl+") : ""}${
      e.metaKey && this.isMac ? "Command+" : ""
    }${e.altKey ? "Alt+" : ""}${e.shiftKey ? "Shift+" : ""}${normalizedKey}`;

    this.setState({ error: error, value: value || "" });
    const isValidShortcut = value != "" && error == "";
    if (isValidShortcut) this.updateShortcut(value);
  }

  handleKeyUp(e) {
    if (this.state.error != "") {
      this.setState({ value: "" });
    }
  }

  async updateShortcut(shortcut) {
    try {
      await browser.commands.update({ name: this.props.id, shortcut: shortcut });
      this.setState({ shortcut: shortcut || "" });
    } catch (e) {
      this.setState({ error: browser.i18n.getMessage("invalidShortcutMessage") });
    }
  }

  async clearShortcut() {
    await browser.commands.reset(this.props.id).catch(() => {});
    this.setState({ shortcut: "", value: "" });
  }

  async resetShortcut() {
    const defaultValue = this.state.defaultValue;
    this.updateShortcut(defaultValue);
    this.setState({ value: defaultValue || "" });
  }

  render() {
    return (
      <div className={`keyboardShortcut ${this.state.error && "isError"}`}>
        <div className="row">
          <input
            type="text"
            id={this.props.id}
            value={this.state.value}
            placeholder={browser.i18n.getMessage("typeShortcutMessage")}
            onKeyDown={e => this.handleKeyDown(e)}
            onKeyUp={e => this.handleKeyUp(e)}
            onChange={e => this.handleChange(e)}
            onFocus={e => this.handleFocus(e)}
            onBlur={e => this.handleBlur(e)}
            style={{ imeMode: "disabled" }}
          />
          <button
            className="clearButton"
            title={browser.i18n.getMessage("clear")}
            onClick={e => this.clearShortcut(e)}
          >
            <ClearIcon />
          </button>
          <button
            className="resetButton"
            title={browser.i18n.getMessage("reset")}
            onClick={e => this.resetShortcut(e)}
          >
            <RestetIcon />
          </button>
        </div>
        <p className="error">{this.state.error}</p>
      </div>
    );
  }
}
