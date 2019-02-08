import React, { Component } from "react";
import browser from "webextension-polyfill";
import getShortcut from "src/common/getShortcut";
import CategoryContainer from "./CategoryContainer";

export default class KeyboardShortcutPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      commands: [],
      isInit: false
    };
    this.initCommands();
  }

  async initCommands() {
    const commands = await browser.commands.getAll();
    this.setState({ commands: commands, isInit: true });
  }

  render() {
    const commandElements = this.state.commands.map(command => ({
      id: command.name,
      title: command.description,
      useRawTitle: true,
      captions: [],
      type: "keyboard-shortcut",
      shortcut: command.shortcut || "",
      defaultValue: getShortcut(command.name)
    }));

    const shortcutCategory = {
      category: "",
      elements: [
        {
          id: "keyboard",
          title: "keyboardShortcutsLabel",
          captions: ["setKeyboardShortCutsMessage"],
          type: "none",
          new: true,
          childElements: commandElements
        }
      ]
    };

    return (
      <div>
        <p className="contentTitle">{browser.i18n.getMessage("keyboardShortcutsLabel")}</p>
        <hr />
        {this.state.isInit && <ul>{<CategoryContainer {...shortcutCategory} />}</ul>}
      </div>
    );
  }
}
