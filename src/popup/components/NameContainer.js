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
    if (name === this.props.sessionName) return;
    if (name.trim() === "") return;
    sendSesssionRenameMessage(this.props.sessionId, name);
  };

  handleRenameClick = () => {
    const title = browser.i18n.getMessage("renameSessionLabel");
    const content = (
      <TextInputModalContent
        onSave={this.renameSession}
        closeModal={this.props.closeModal}
        defaultText={this.props.sessionName}
      />
    );
    this.props.openModal(title, content);
  };

  render() {
    const { sessionName, canRename = true, forceTruncate = false } = this.props;
    const isTruncateClass = forceTruncate || getSettings("truncateTitle") ? 'isTruncate' : '';
    const buttonTitle = browser.i18n.getMessage("renameSessionLabel");
    const displayName = sessionName.trim() === "" ? "_" : sessionName;
    const session = <span className="sessionName">{displayName}</span>
    return (
      <div className={`nameContainer ${isTruncateClass}`}>
        {canRename ? (
          <button onClick={this.handleRenameClick} title={buttonTitle}>
            {session}
          </button>) : session}
      </div>
    );
  }
}
