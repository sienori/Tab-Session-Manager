import React, { Component } from "react";
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
  handleMenuClick = e => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <SessionMenuItems session={this.props.session} isTracking={this.props.isTracking} />);
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

  handleViewModeClick = mode => {
    if (this.props.onViewModeChange) this.props.onViewModeChange(mode);
  };

  handleThumbnailSizeInput = event => {
    const value = Number(event.target.value);
    if (this.props.onThumbnailSizeChange) this.props.onThumbnailSizeChange(value);
  };

  handleThumbnailSourceToggle = event => {
    if (this.props.onThumbnailSourceToggle) this.props.onThumbnailSourceToggle(event.target.checked);
  };

  shouldComponentUpdate(nextProps) {
    const propKeys = [
      "session",
      "searchWords",
      "isTracking",
      "tagList",
      "viewMode",
      "thumbnailSize",
      "thumbnailSource"
    ];

    for (const key of propKeys) {
      if (this.props[key] !== nextProps[key]) return true;
    }

    return false;
  }

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
      openMenu,
      viewMode,
      thumbnailSize,
      thumbnailSource
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
              <button className="open"
                onClick={this.handleOpenClick}
                onContextMenu={this.handleOpenRightClick}
                title={getOpenButtonTitle()}>
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
        <div className="viewControls">
          <div className="viewToggle">
            <button
              type="button"
              className={viewMode === "list" ? "isActive" : ""}
              onClick={() => this.handleViewModeClick("list")}
            >
              {browser.i18n.getMessage("listViewLabel")}
            </button>
            <button
              type="button"
              className={viewMode === "grid" ? "isActive" : ""}
              onClick={() => this.handleViewModeClick("grid")}
            >
              {browser.i18n.getMessage("gridViewLabel")}
            </button>
            <label className="thumbnailSourceToggle">
              <input
                type="checkbox"
                checked={thumbnailSource === "screenshot"}
                onChange={this.handleThumbnailSourceToggle}
              />
              <span>{browser.i18n.getMessage("thumbnailSourceScreenshotShortLabel")}</span>
            </label>
          </div>
          {viewMode === "grid" && (
            <label className="thumbnailSizeControl">
              <span>{browser.i18n.getMessage("thumbnailSizeLabel")}</span>
              <input
                type="range"
                min="120"
                max="320"
                step="10"
                value={thumbnailSize}
                onChange={this.handleThumbnailSizeInput}
              />
              <span className="thumbnailSizeValue">{`${thumbnailSize}px`}</span>
            </label>
          )}
        </div>
        <DetailsContainer
          session={session}
          searchWords={searchWords}
          removeWindow={removeWindow}
          removeTab={removeTab}
          openMenu={openMenu}
          viewMode={viewMode}
          thumbnailSize={thumbnailSize}
        />
      </div>
    );
  }
}
