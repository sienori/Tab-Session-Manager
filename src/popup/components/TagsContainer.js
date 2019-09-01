import React, { Component } from "react";
import browser from "webextension-polyfill";
import { sendTagRemoveMessage, sendTagAddMessage } from "../actions/controlSessions";
import generateTagLabel from "../actions/generateTagLabel";
import TextInputModalContent from "./TextInputModalContent";
import PlusIcon from "../icons/plus.svg";
import TagIcon from "../icons/tag.svg";
import "../styles/TagsContainer.scss";

export default class TagsContainer extends Component {
  constructor(props) {
    super(props);
  }

  addTag = tagName => {
    if (tagName.trim() === "") return;
    sendTagAddMessage(this.props.session.id, tagName);
  };

  handleAddTagClick = () => {
    const title = browser.i18n.getMessage("addTagLabel");
    const content = (
      <TextInputModalContent onSave={this.addTag} closeModal={this.props.closeModal} />
    );
    this.props.openModal(title, content);
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.session.id !== this.props.session.id) this.setState({ isOpenedInput: false });
  }

  render() {
    const { session } = this.props;
    return (
      <div className="tagsContainer">
        {session.tag.map((tag, index) => (
          <div className="tag" key={index}>
            <TagIcon className="tagIcon" />
            <span>{generateTagLabel(tag)}</span>
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
        <button className="addTagButton" onClick={this.handleAddTagClick}>
          <TagIcon />
          <span>{browser.i18n.getMessage("addTagLabel")}</span>
        </button>
      </div>
    );
  }
}
