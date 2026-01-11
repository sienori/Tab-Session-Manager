import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import moment from "moment";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage } from "../actions/controlSessions";
import generateWindowsInfo from "../actions/generateWindowsInfo";
import NameContainer from "./NameContainer";
import TagsContainer from "./TagsContainer";
import DetailsContainer from "./DetailsContainer";
import SessionMenuItems from "./SessionMenuItems";
import OpenMenuItems from "./OpenMenuItems";
import MenuIcon from "../icons/menu.svg";
import NewWindowIcon from "../icons/newWindow.svg";
import DeleteIcon from "../icons/delete.svg";
import "../styles/SessionDetailsArea.scss";

const getOpenButtonTitle = () => {
  const defaultBehavior = getSettings("openButtonBehavior");
  switch (defaultBehavior) {
    case "openInNewWindow":
      return browser.i18n.getMessage("openInNewWindowLabel");
    case "openInCurrentWindow":
      return browser.i18n.getMessage("openInCurrentWindowLabel");
    case "addToCurrentWindow":
      return browser.i18n.getMessage("addToCurrentWindowLabel");
    default:
      return "";
  }
};

export default class SessionDetailsArea extends Component {
  constructor(props) {
    super(props);
  }

  handleMenuClick = e => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(
      x,
      y,
      <SessionMenuItems session={this.props.session} isTracking={this.props.isTracking} />
    );
  };

  handleOpenClick = () => {
    const defaultBehavior = getSettings("openButtonBehavior");
    sendOpenMessage(this.props.session.id, defaultBehavior);
  };

  handleOpenRightClick = e => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <OpenMenuItems session={this.props.session} />);
    e.preventDefault();
  };

  handleRemoveClick = () => {
    this.props.removeSession(this.props.session.id);
  };

  shouldComponentUpdate = nextProps => {
    const isChangeSession = this.props.session.id !== nextProps.session.id;
    const isUpdateSession = this.props.session.lastEditedTime !== nextProps.session.lastEditedTime;
    const isLoadedSession =
      this.props.session.hasOwnProperty("windows") !== nextProps.session.hasOwnProperty("windows");
    const isChangedTagList = this.props.tagList !== nextProps.tagList;
    const isChangedTracking = this.props.isTracking !== nextProps.isTracking;
    return (
      isChangeSession || isUpdateSession || isLoadedSession || isChangedTagList || isChangedTracking
    );
  };

  render() {
    const {
      session,
      searchWords,
      isTracking,
      removeWindow,
      removeTab,
      openModal,
      closeModal,
      tagList,
      openMenu
    } = this.props;

    if (!session.id)
      return (
        <div id="sessionDetailArea">
          <div className="noSession">
            <p>{browser.i18n.getMessage("noSessionSelectedLabel")}</p>
          </div>
        </div>
      );

    return (
      <div id="sessionDetailArea" ref="sessionDetailArea">
        <div className="sessionHeader">
          <div className="lineContainer">
            <NameContainer
              sessionId={session.id}
              sessionName={session.name}
              openModal={openModal}
              closeModal={closeModal}
            />
            <button
              className="menuButton"
              onClick={this.handleMenuClick}
              title={browser.i18n.getMessage("menuLabel")}
            >
              <MenuIcon />
            </button>
          </div>
          <div className="lineContainer">
            <TagsContainer
              sessionId={session.id}
              tags={session.tag}
              tagList={tagList}
              isTracking={isTracking}
              openModal={openModal}
              closeModal={closeModal}
            />
            <span className="date">{moment(session.date).format(getSettings("dateFormat"))}</span>
          </div>

          <div className="lineContainer">
            <span className="windowsInfo">
              {generateWindowsInfo(session.windowsNumber, session.tabsNumber)}
            </span>

            <div className="buttonsContainer">
              <button
                className="open"
                onClick={this.handleOpenClick}
                onContextMenu={this.handleOpenRightClick}
                title={getOpenButtonTitle()}
              >
                <NewWindowIcon />
                <span>{browser.i18n.getMessage("open")}</span>
              </button>
              <button className="remove" onClick={this.handleRemoveClick}>
                <DeleteIcon />
                <span>{browser.i18n.getMessage("remove")}</span>
              </button>
            </div>
          </div>
        </div>
        <DetailsContainer
          session={session}
          searchWords={searchWords}
          removeWindow={removeWindow}
          removeTab={removeTab}
          openMenu={openMenu}
        />
      </div>
    );
  }
}
