import React, { Component } from "react";
import browser from "webextension-polyfill";
import Highlight from "react-highlighter";
import { getSettings } from "src/settings/settings";
import generateTagLabel from "../actions/generateTagLabel";
import generateWindowsInfo from "../actions/generateWindowsInfo";
import moment from "moment";
import TagIcon from "../icons/tag.svg";
import "../styles/SessionItem.scss";

export default class Session extends Component {
  constructor(props) {
    super(props);
  }
  
  render() {
    const { session, isSelected, order, searchWord, handleSessionSelect, handleKeyDown, previous, next } = this.props;

    return (
      <button
        className={`sessionItem ${isSelected ? "isSelected" : ""}`}
        onFocus={() => handleSessionSelect(session.id)}
        onKeyDown={(event) => handleKeyDown(event, session, previous, next)}
        style={{ order: order }}
        ref={(input) => { if (input && isSelected) input.focus(); }}
      >
        <span className={`name ${getSettings("truncateTitle") ? "isTruncate" : ""}`}>
          <Highlight search={searchWord}>
            {session.name.trim() === "" ? "_" : session.name}
          </Highlight>
        </span>
        <ul className="tagsContainer">
          {session.tag.map((tag, index) => (
            <li className="tag" key={index}>
              <TagIcon />
              {generateTagLabel(tag)}
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
    );
  }
}
