import React, { Component } from "react";
import browser from "webextension-polyfill";
import { sendTagRemoveMessage, sendTagAddMessage } from "../actions/controlSessions";
import { generateTagLabel, generateTagIcon } from "../actions/generateTagLabel";
import TagInputModalContent from "./TagInputModalContent";
import PlusIcon from "../icons/plus.svg";
import TagIcon from "../icons/tag.svg";
import "../styles/TagsContainer.scss";

export default class TagsContainer extends Component {
  constructor(props) {
    super(props);
  }

  addTag = tagName => {
    if (tagName.trim() === "") return;
    sendTagAddMessage(this.props.sessionId, tagName);
  };

  handleAddTagClick = () => {
    const { tagList, closeModal } = this.props;
    const title = browser.i18n.getMessage("addTagLabel");
    const content = (
      <TagInputModalContent onSave={this.addTag} closeModal={closeModal} tagList={tagList} />
    );
    this.props.openModal(title, content);
  };

  render() {
    const { sessionId, tags } = this.props;
    return (
      <div className="tagsContainer">
        {tags.map((tag, index) => (
          <div className="tag" key={index}>
            {generateTagIcon(tag)}
            <span>{generateTagLabel(tag)}</span>
            <button
              className="removeTagButton"
              onClick={() => {
                sendTagRemoveMessage(sessionId, tag);
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
