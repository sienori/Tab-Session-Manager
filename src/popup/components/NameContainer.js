import React, { Component } from "react";
import browser from "webextension-polyfill";
import { sendSesssionRenameMessage } from "../actions/controlSessions";
import { getSettings } from "src/settings/settings";
import InputForm from "./InputForm";
import "../styles/NameContainer.scss";

export default class NameContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpenedInput: false
    };
  }

  renameSession = name => {
    this.toggleNameInput();
    if (name === this.props.session.name) return;
    sendSesssionRenameMessage(this.props.session.id, name);
  };

  toggleNameInput = () => {
    const isOpenedInput = !this.state.isOpenedInput;
    this.setState({ isOpenedInput: isOpenedInput });
  };

  render() {
    const { session } = this.props;
    return (
      <div className={`nameContainer ${getSettings("truncateTitle") ? "isTruncate" : ""}`}>
        {this.state.isOpenedInput ? (
          <InputForm
            onSubmit={this.renameSession}
            isFocus={this.state.isOpenedInput}
            defaultValue={session.name}
          />
        ) : (
          <button onClick={this.toggleNameInput} title={browser.i18n.getMessage("renameLabel")}>
            <span>{session.name.trim() === "" ? "_" : session.name}</span>
          </button>
        )}
      </div>
    );
  }
}
