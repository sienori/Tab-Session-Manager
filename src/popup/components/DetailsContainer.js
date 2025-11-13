import React, { Component } from "react";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import openUrl from "../actions/openUrl";
import { sendOpenMessage } from "../actions/controlSessions";
import PlusIcon from "../icons/plus.svg";
import CollapseIcon from "../icons/collapse.svg";
import EditIcon from "../icons/edit.svg";
import DeleteIcon from "../icons/delete.svg";
import NewWindowIcon from "../icons/newWindow.svg";
import CopyIcon from "../icons/copy.svg";
import WindowMenuItems from "./WindowMenuItems";
import WindowIcon from "../icons/window.svg";
import WindowIncognitoChromeIcon from "../icons/window_incognito_chrome.svg";
import WindowIncognitoFirefoxIcon from "../icons/window_incognito_firefox.svg";
import TabThumbnail from "./TabThumbnail";

import "../styles/DetailsContainer.scss";
import Highlighter from "react-highlight-words";

const FavIcon = props => (
  <img
    className="favIcon"
    src={props.favIconUrl || "/icons/favicon.png"}
    onError={e => {
      const target = e.target;
      setTimeout(() => (target.src = "/icons/favicon.png"), 0);
    }}
  />
);

const RemoveButton = props => (
  <button
    className="removeButton"
    onClick={props.handleClick}
    title={browser.i18n.getMessage("remove")}
  >
    <PlusIcon />
  </button>
);

const EditButton = props => (
  <button
    className="editButton"
    onClick={props.handleClick}
    title={browser.i18n.getMessage("editWindowLabel")}
  >
    <EditIcon />
  </button>
);

const TabContainer = props => {
  const {
    tab,
    windowId,
    allTabsNumber,
    searchWords,
    handleRemoveTab,
    viewMode,
    hideThumbnailText
  } = props;

  const openInForeground = () => {
    openUrl(tab.url, tab.title, true, tab.offlineBackupId);
  };

  const openInBackground = () => {
    openUrl(tab.url, tab.title, false, tab.offlineBackupId);
  };

  const handleRemoveClick = e => {
    e.preventDefault();
    e.stopPropagation();
    handleRemoveTab(windowId, tab.id);
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openInForeground();
    }
  };

  const handleCopyLink = async e => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tab.url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = tab.url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.warn("Failed to copy tab URL", error);
    }
  };

  const handleTileClick = e => {
    if (e.defaultPrevented) return;
    if (e.target.closest(".thumbnailToolbar")) return;
    openInForeground();
  };

  const handleAuxClick = e => {
    if (e.button === 1) {
      e.preventDefault();
      openInBackground();
    }
  };

  if (viewMode === "grid") {
    const tileClassNames = ["tabTile"];
    if (hideThumbnailText) tileClassNames.push("isTextHidden");
    return (
      <div className={tileClassNames.join(" ")}>
        <div
          className="thumbnailWrapper"
          role="button"
          tabIndex={0}
          onClick={handleTileClick}
          onAuxClick={handleAuxClick}
          onKeyDown={handleKeyDown}
          title={`${tab.title || ""}\n${tab.url}`}
        >
          <TabThumbnail
            thumbnailId={tab.thumbnailId}
            thumbnailType={tab.thumbnailType}
            fallback={tab.favIconUrl}
            alt={tab.title}
          />
          <div className="thumbnailToolbar">
            <button
              type="button"
              className="thumbnailAction open"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                openInForeground();
              }}
              onMouseDown={e => e.stopPropagation()}
              onMouseUp={e => e.stopPropagation()}
              title={browser.i18n.getMessage("open")}
              aria-label={browser.i18n.getMessage("open")}
            >
              <NewWindowIcon />
            </button>
            <button
              type="button"
              className="thumbnailAction copy"
              onClick={handleCopyLink}
              onMouseDown={e => e.stopPropagation()}
              onMouseUp={e => e.stopPropagation()}
              title={browser.i18n.getMessage("copyUrlLabel")}
              aria-label={browser.i18n.getMessage("copyUrlLabel")}
            >
              <CopyIcon />
            </button>
            {allTabsNumber > 1 && (
              <button
                type="button"
                className="thumbnailAction delete"
                onClick={handleRemoveClick}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => e.stopPropagation()}
                title={browser.i18n.getMessage("remove")}
                aria-label={browser.i18n.getMessage("remove")}
              >
                <DeleteIcon />
              </button>
            )}
          </div>
        </div>
        <div className="tabTileInfo">
          <span className="tabTitle">
            <Highlighter searchWords={searchWords} textToHighlight={tab.title || ""} autoEscape={true} />
          </span>
          <span className="tabUrl">{tab.url}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tabContainer">
      <button
        type="button"
        className="tabButton"
        onClick={openInForeground}
        onAuxClick={handleAuxClick}
        onKeyDown={handleKeyDown}
        title={`${tab.title}\n${tab.url}`}
      >
        <FavIcon favIconUrl={tab.favIconUrl} />
        <span className="tabTitle">
          <Highlighter searchWords={searchWords} textToHighlight={tab.title || ""} autoEscape={true} />
        </span>
      </button>
      <div className="buttonsContainer">
        {allTabsNumber > 1 && <RemoveButton handleClick={handleRemoveClick} />}
      </div>
    </div>
  );
};

class WindowContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { isCollapsed: false };
  }

  getTabsNumberText = () => {
    const tabLabel = browser.i18n.getMessage("tabLabel");
    const tabsLabel = browser.i18n.getMessage("tabsLabel");
    const tabsNumber = Object.keys(this.props.tabs).length;
    const tabsNumberText = `${tabsNumber} ${tabsNumber > 1 ? tabsLabel : tabLabel}`;
    return tabsNumberText;
  };

  handleRemoveClick = () => {
    const { windowId, handleRemoveWindow } = this.props;
    handleRemoveWindow(windowId);
  };

  handleOpenClick = () => {
    const { sessionId, windowId } = this.props;
    sendOpenMessage(sessionId, "openInNewWindow", windowId);
  };

  handleEditClick = e => {
    const { sessionId, windowId } = this.props;
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <WindowMenuItems sessionId={sessionId} windowId={windowId} />);
    e.preventDefault();
  };

  toggleCollapsed = () => {
    const isCollapsed = !this.state.isCollapsed;
    this.setState({ isCollapsed: isCollapsed });
  };

  render() {
    const {
      windowTitle,
      windowId,
      tabs,
      windowsNumber,
      allTabsNumber,
      searchWords,
      handleRemoveTab,
      viewMode,
      thumbnailSize,
      hideThumbnailText
    } = this.props;
    const sortedTabs = Object.values(tabs).sort((a, b) => a.index - b.index);
    const isIncognito = Object.values(tabs)[0].incognito;
    const tabsContainerClass = `tabs ${viewMode === "grid" ? "isGrid" : ""}`;
    const tabsStyle = viewMode === "grid" ? { "--thumbnail-columns": `${thumbnailSize}` } : undefined;

    return (
      <div className={`windowContainer ${this.state.isCollapsed ? "isCollapsed" : ""}`}>
        <div className="windowInfo" onContextMenu={this.handleEditClick}>
          <div className="leftWrapper">
            <button className="collapseButton" onClick={this.toggleCollapsed}>
              <CollapseIcon />
            </button>
            <div className="windowIcon">
              {isIncognito ?
                browserInfo().name === "Chrome" ? <WindowIncognitoChromeIcon /> : <WindowIncognitoFirefoxIcon /> :
                <WindowIcon />
              }
            </div>
            <button
              className="windowTitle"
              onClick={this.handleOpenClick}
              title={browser.i18n.getMessage("openInNewWindowLabel")}
            >
              {windowTitle || Object.values(tabs).find(tab => tab.active)?.title || browser.i18n.getMessage("windowLabel")}
            </button>
            <span className="tabsNumber">{this.getTabsNumberText()}</span>
          </div>
          <div className="buttonsContainer">
            <EditButton handleClick={this.handleEditClick} />
            {windowsNumber > 1 && <RemoveButton handleClick={this.handleRemoveClick} />}
          </div>
        </div>
        <div className={tabsContainerClass} style={tabsStyle}>
          {Object.values(sortedTabs).map(tab => (
            <TabContainer
              tab={tab}
              windowId={windowId}
              allTabsNumber={allTabsNumber}
              searchWords={searchWords}
              handleRemoveTab={handleRemoveTab}
              viewMode={viewMode}
              hideThumbnailText={hideThumbnailText}
              key={tab.id}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default props => {
  const { session, searchWords, removeWindow, removeTab, openMenu, viewMode, thumbnailSize, hideThumbnailText } = props;

  if (!session.windows) return null;

  const handleRemoveWindow = windowId => {
    removeWindow(session, windowId);
  };

  const handleRemoveTab = (windowId, tabId) => {
    removeTab(session, windowId, tabId);
  };

  const containerClass = `detailsContainer scrollbar ${viewMode === "grid" ? "gridView" : ""}`;

  return (
    <div className={containerClass}>
      {Object.keys(session.windows).map(windowId => (
        <WindowContainer
          tabs={session.windows[windowId]}
          windowTitle={session?.windowsInfo?.[windowId]?.title}
          windowId={windowId}
          sessionId={session.id}
          windowsNumber={session.windowsNumber}
          allTabsNumber={session.tabsNumber}
          searchWords={searchWords}
          handleRemoveWindow={handleRemoveWindow}
          handleRemoveTab={handleRemoveTab}
          openMenu={openMenu}
          viewMode={viewMode}
          thumbnailSize={thumbnailSize}
          hideThumbnailText={hideThumbnailText}
          key={`${session.id}${windowId}`}
        />
      ))}
    </div>
  );
};
