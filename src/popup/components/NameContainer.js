import React, { Component } from "react";
import browser from "webextension-polyfill";
import { sendSesssionRenameMessage } from "../actions/controlSessions";
import { getSettings } from "src/settings/settings";
import TextInputModalContent from "./TextInputModalContent";
import "../styles/NameContainer.scss";

export default class NameContainer extends Component {
  constructor(props) {
    super(props);
  }

  renameSession = name => {
    if (name === this.props.session.name) return;
    if (name.trim() === "") return;
    sendSesssionRenameMessage(this.props.session.id, name);
  };

  handleRenameClick = () => {
    const title = browser.i18n.getMessage("renameSessionLabel");
    const content = (
      <TextInputModalContent
        onSave={this.renameSession}
        closeModal={this.props.closeModal}
        defaultText={this.props.session.name}
      />
    );
    this.props.openModal(title, content);
  };

  render() {
    const { session } = this.props;
    return (
      <div className={`nameContainer ${getSettings("truncateTitle") ? "isTruncate" : ""}`}>
        <button
          onClick={this.handleRenameClick}
          title={browser.i18n.getMessage("renameSessionLabel")}
        >
          <span className="sessionName">{session.name.trim() === "" ? "_" : session.name}</span>
        </button>
      </div>
    );
  }
}
