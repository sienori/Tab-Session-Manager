import React, { Component } from "react";
import browser from "webextension-polyfill";
import { sendTagRemoveMessage, sendTagAddMessage } from "../actions/controlSessions";
import InputForm from "./InputForm";
import PlusIcon from "../icons/plus.svg";
import "../styles/TagsContainer.scss";

export default class TagsContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpenedInput: false
    };
  }

  addTag = tagName => {
    this.toggleInput();
    if (tagName.trim() === "") return;
    sendTagAddMessage(this.props.session.id, tagName);
  };

  toggleInput = () => {
    const isOpenedInput = !this.state.isOpenedInput;
    this.setState({ isOpenedInput: isOpenedInput });
  };

  getTagLabel = tag => {
    switch (tag) {
      case "regular":
        return browser.i18n.getMessage("regularSaveSessionName");
      case "winClose":
        return browser.i18n.getMessage("winCloseSessionName");
      case "browserExit":
        return browser.i18n.getMessage("browserExitSessionName");
      default:
        return tag;
    }
  };

  render() {
    const { session } = this.props;
    return (
      <div className="tagsContainer">
        <div
          className={`addTagInputContainer  ${this.state.isOpenedInput ? "isOpen" : "isClose"}`}
          title={browser.i18n.getMessage("addTagLabel")}
        >
          <button className="showInputButton" onClick={this.toggleInput}>
            <PlusIcon />
          </button>
          {this.state.isOpenedInput && (
            <div className="addTagInput">
              <InputForm
                onSubmit={this.addTag}
                isFocus={this.state.isOpenedInput}
                placeholder={browser.i18n.getMessage("addTagLabel")}
              />
            </div>
          )}
        </div>
        {session.tag.map((tag, index) => (
          <div className="tag" key={index}>
            <span>{this.getTagLabel(tag)}</span>
            <button
              className="removeTagButton"
              onClick={() => {
                sendTagRemoveMessage(session.id, tag);
              }}
              title={browser.i18n.getMessage("removeTagLabel")}
            >
              <PlusIcon />
            </button>
          </div>
        ))}
      </div>
    );
  }
}
