import React, { Component } from "react";
import browser from "webextension-polyfill";
import Highlight from "react-highlighter";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage } from "../actions/controlSessions";
import generateTagLabel from "../actions/generateTagLabel";
import generateWindowsInfo from "../actions/generateWindowsInfo";
import moment from "moment";
import TagIcon from "../icons/tag.svg";
import NewWindowIcon from "../icons/newWindow.svg";
import DeleteIcon from "../icons/delete.svg";
import "../styles/SessionItem.scss";

export default class Session extends Component {
  constructor(props) {
    super(props);
  }

  handleOpenClick = e => {
    const openBehavior = getSettings("openButtonBehavior");
    sendOpenMessage(this.props.session.id, openBehavior);
    e.stopPropagation();
  };

  handleRemoveClick = e => {
    this.props.removeSession(this.props.session.id);
    e.stopPropagation();
  };

  render() {
    const { session, isSelected, order, searchWord, handleSessionSelect } = this.props;

    return (
      <div className={`sessionItem ${isSelected ? "isSelected" : ""}`} style={{ order: order }}>
        <button className="selectButton" onClick={() => handleSessionSelect(session.id)}>
          <span className={`name ${getSettings("truncateTitle") ? "isTruncate" : ""}`}>
            <Highlight search={searchWord}>
              {session.name.trim() === "" ? "_" : session.name}
            </Highlight>
          </span>
          <ul className="tagsContainer">
            {session.tag.map((tag, index) => (
              <li className="tag" key={index}>
                <TagIcon />
                <span>{generateTagLabel(tag)}</span>
              </li>
            ))}
          </ul>
          <div className="lineContainer">
            <span className="windowsInfo">
              {generateWindowsInfo(session.windowsNumber, session.tabsNumber)}
            </span>
            <span className="date">{moment(session.date).format(getSettings("dateFormat"))}</span>
          </div>
        </button>

        <div className="buttonsContainer">
          <button
            className="open"
            onClick={this.handleOpenClick}
            title={browser.i18n.getMessage("open")}
          >
            <NewWindowIcon />
          </button>
          <button
            className="remove"
            onClick={this.handleRemoveClick}
            title={browser.i18n.getMessage("remove")}
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    );
  }
}
