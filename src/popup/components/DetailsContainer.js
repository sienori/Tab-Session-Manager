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

const TAB_DRAG_STATE = {
  tabId: null,
  windowId: null
};
const setTabDragState = (tabId, windowId) => {
  TAB_DRAG_STATE.tabId = tabId;
  TAB_DRAG_STATE.windowId = windowId;
};
const clearTabDragState = () => {
  TAB_DRAG_STATE.tabId = null;
  TAB_DRAG_STATE.windowId = null;
};
const getTabDragState = () => TAB_DRAG_STATE;

const TabContainer = props => {
  const {
    tab,
    windowId,
    allTabsNumber,
    searchWords,
    handleRemoveTab,
    viewMode,
    hideThumbnailText,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragOver,
    isDragging
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

  const isGridView = viewMode === "grid";

  if (isGridView) {
    const tileClassNames = ["tabTile"];
    if (hideThumbnailText) tileClassNames.push("isTextHidden");
    if (isDragging) tileClassNames.push("isDragging");
    if (isDragOver === "before") tileClassNames.push("isDragOverBefore");
    if (isDragOver === "after") tileClassNames.push("isDragOverAfter");

    return (
      <div
        className={tileClassNames.join(" ")}
        onDragOver={event => onDragOver?.(tab.id, event)}
        onDrop={event => onDrop?.(tab.id, event)}
      >
        <div
          className="thumbnailWrapper"
          role="button"
          tabIndex={0}
          draggable
          onDragStart={event => onDragStart?.(tab.id, event)}
          onDragEnd={event => {
            // Remove focus from any focused element to hide toolbar
            if (document.activeElement) {
              document.activeElement.blur();
            }
            onDragEnd?.(event);
          }}
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
    this.state = {
      isCollapsed: false,
      draggingTabId: null,
      dragOverTabId: null,
      dragPosition: null
    };
    this.tabsContainer = null;
  }

  componentDidMount() {
    this.updateToolbarSide();
    window.addEventListener("resize", this.handleResize);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.viewMode !== this.props.viewMode ||
      prevProps.thumbnailSize !== this.props.thumbnailSize ||
      prevProps.tabs !== this.props.tabs ||
      prevProps.hideThumbnailText !== this.props.hideThumbnailText
    ) {
      this.updateToolbarSide();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);
  }

  setTabsRef = (node) => {
    this.tabsContainer = node;
    this.updateToolbarSide();
  };

  handleResize = () => {
    this.updateToolbarSide();
  };

  handleDragStart = (tabId, event) => {
    if (this.props.viewMode !== "grid") return;
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", tabId || "tab");
    }
    setTabDragState(tabId, this.props.windowId);
    this.setState({ draggingTabId: tabId, dragOverTabId: null, dragPosition: null });
  };

  handleDragOver = (tabId, event) => {
    if (this.props.viewMode !== "grid") return;
    const draggingTabId = this.state.draggingTabId || getTabDragState().tabId;
    if (!draggingTabId || draggingTabId === tabId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPosition = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    this.setState(prev =>
      prev.dragOverTabId === tabId && prev.dragPosition === nextPosition
        ? null
        : { dragOverTabId: tabId, dragPosition: nextPosition }
    );
  };

  handleDrop = (tabId, event) => {
    if (this.props.viewMode !== "grid") return;
    event.preventDefault();
    event.stopPropagation();
    const dragState = getTabDragState();
    const draggingTabId = this.state.draggingTabId || dragState.tabId;
    const sourceWindowId = dragState.windowId;
    const targetWindowId = this.props.windowId;
    if (!draggingTabId || (draggingTabId === tabId && sourceWindowId === targetWindowId)) {
      this.resetDragState();
      return;
    }
    const position = this.state.dragPosition || "before";
    this.props.handleReorderTab?.(sourceWindowId || targetWindowId, targetWindowId, draggingTabId, tabId, position);
    this.resetDragState();
    clearTabDragState();
  };

  handleContainerDragOver = event => {
    if (this.props.viewMode !== "grid") return;
    const draggingTabId = this.state.draggingTabId || getTabDragState().tabId;
    if (!draggingTabId) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.state.dragOverTabId || this.state.dragPosition) {
      this.setState({ dragOverTabId: null, dragPosition: null });
    }
  };

  handleContainerDrop = event => {
    if (this.props.viewMode !== "grid") return;
    event.preventDefault();
    event.stopPropagation();
    const dragState = getTabDragState();
    const draggingTabId = this.state.draggingTabId || dragState.tabId;
    const sourceWindowId = dragState.windowId;
    const targetWindowId = this.props.windowId;
    if (!draggingTabId) {
      this.resetDragState();
      return;
    }
    this.props.handleReorderTab?.(sourceWindowId || targetWindowId, targetWindowId, draggingTabId, null, "after");
    this.resetDragState();
    clearTabDragState();
  };

  handleDragEnd = () => {
    if (this.props.viewMode !== "grid") return;
    this.resetDragState();
    clearTabDragState();
  };

  resetDragState = () => {
    this.setState({ draggingTabId: null, dragOverTabId: null, dragPosition: null });
  };

  updateToolbarSide = () => {
    if (!this.tabsContainer) return;
    const tiles = Array.from(this.tabsContainer.querySelectorAll(".tabTile"));
    if (!tiles.length) return;
    tiles.forEach((tile) => tile.classList.remove("isToolbarLeft"));
    if (this.props.viewMode !== "grid") return;

    const containerRect = this.tabsContainer.getBoundingClientRect();
    if (!containerRect.width) return;

    const tileData = tiles.map((tile) => {
      const wrapper = tile.querySelector(".thumbnailWrapper");
      const rect = wrapper ? wrapper.getBoundingClientRect() : tile.getBoundingClientRect();
      return { tile, rect };
    });

    const tolerance = 16;
    const rows = [];
    tileData.forEach((entry) => {
      const existingRow = rows.find((row) => Math.abs(row.top - entry.rect.top) < tolerance);
      if (existingRow) {
        existingRow.items.push(entry);
      } else {
        rows.push({ top: entry.rect.top, items: [entry] });
      }
    });

    const toolbarRightEdge = containerRect.right - 52;
    rows.forEach((row) => {
      const furthest = row.items.reduce((current, candidate) =>
        candidate.rect.right > current.rect.right ? candidate : current,
        row.items[0]
      );
      const shouldFlip = furthest.rect.right > toolbarRightEdge;
      furthest.tile.classList.toggle("isToolbarLeft", shouldFlip);
      row.items.forEach((entry) => {
        entry.tile.dataset.toolbarRow = Math.round(furthest.rect.top);
      });
    });
  };

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
      hideThumbnailText,
      handleReorderTab
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
        <div
          className={tabsContainerClass}
          style={tabsStyle}
          ref={this.setTabsRef}
          onDragOver={this.handleContainerDragOver}
          onDrop={this.handleContainerDrop}
        >
          {Object.values(sortedTabs).map(tab => (
            <TabContainer
              tab={tab}
              windowId={windowId}
              allTabsNumber={allTabsNumber}
              searchWords={searchWords}
              handleRemoveTab={handleRemoveTab}
              viewMode={viewMode}
              hideThumbnailText={hideThumbnailText}
              onDragStart={this.handleDragStart}
              onDragOver={this.handleDragOver}
              onDrop={this.handleDrop}
              onDragEnd={this.handleDragEnd}
              isDragOver={this.state.dragOverTabId === tab.id ? this.state.dragPosition : null}
              isDragging={this.state.draggingTabId === tab.id}
              key={tab.id}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default props => {
  const {
    session,
    searchWords,
    removeWindow,
    removeTab,
    openMenu,
    viewMode,
    thumbnailSize,
    hideThumbnailText,
    reorderTab
  } = props;

  if (!session.windows) return null;

  const handleRemoveWindow = windowId => {
    removeWindow(session, windowId);
  };

  const handleRemoveTab = (windowId, tabId) => {
    removeTab(session, windowId, tabId);
  };

  const containerClass = `detailsContainer scrollbar ${viewMode === "grid" ? "gridView" : ""}`;

  const handleReorderTab = (sourceWindowId, targetWindowId, tabId, anchorTabId, position) => {
    if (typeof reorderTab === "function") {
      reorderTab(session, sourceWindowId, targetWindowId, tabId, anchorTabId, position);
    }
  };

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
          handleReorderTab={handleReorderTab}
          key={`${session.id}${windowId}`}
        />
      ))}
    </div>
  );
};
