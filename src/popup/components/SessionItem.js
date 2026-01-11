import React, { Component } from "react";
import browser from "webextension-polyfill";
import Highlighter from "react-highlight-words";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage } from "../actions/controlSessions";
import { generateTagLabel, generateTagIcon } from "../actions/generateTagLabel";
import generateWindowsInfo from "../actions/generateWindowsInfo";
import SessionMenuItems from "./SessionMenuItems";
import OpenMenuItems from "./OpenMenuItems";
import moment from "moment";
import NewWindowIcon from "../icons/newWindow.svg";
import DeleteIcon from "../icons/delete.svg";
import "../styles/SessionItem.scss";

export default class Session extends Component {
  constructor(props) {
    super(props);
    this.sessionItemElement = React.createRef();
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

  handleSessionRightClick = e => {
    this.props.handleSessionSelect(this.props.session.id);
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <SessionMenuItems session={this.props.session} />);
    e.preventDefault();
  };

  handleOpenRightClick = e => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <OpenMenuItems session={this.props.session} />);
    e.preventDefault();
  };

  componentDidUpdate(prevProps) {
    const shouldFocus = this.props.isSelected && !prevProps.isSelected;
    if (shouldFocus) this.sessionItemElement.current.focus();
  }

  render() {
    const { session, isSelected, isTracking, order, searchWords,
      handleSessionSelect } = this.props;

    return (
      <div className={`sessionItem ${isSelected ? "isSelected" : ""} ${isTracking ? "isTracking" : ""}`}
        style={{ order: order }}
      >
        <button className="selectButton"
          onClick={() => handleSessionSelect(session.id)}
          onDoubleClick={this.handleOpenClick}
          onContextMenu={this.handleSessionRightClick}
          ref={this.sessionItemElement}
        >
          <span className={`name ${getSettings("truncateTitle") ? "isTruncate" : ""}`}>
            <Highlighter
              searchWords={searchWords}
              textToHighlight={session.name.trim() === "" ? "_" : session.name}
              autoEscape={true}
            />
          </span>
          <ul className="tagsContainer">
            {session.tag.map((tag, index) => (
              <li className="tag" key={index}>
                {generateTagIcon(tag)}
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

        {getSettings("isShowOpenButtons") && (
          <div className="buttonsContainer">
            <button
              className="open"
              onClick={this.handleOpenClick}
              onContextMenu={this.handleOpenRightClick}
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
        )}
      </div>
    );
  }
}
