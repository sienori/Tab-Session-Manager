import React, { Component } from "react";
import { VariableSizeList } from "react-window";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import openUrl from "../actions/openUrl";
import { sendOpenMessage } from "../actions/controlSessions";
import PlusIcon from "../icons/plus.svg";
import CollapseIcon from "../icons/collapse.svg";
import EditIcon from "../icons/edit.svg";
import WindowMenuItems from "./WindowMenuItems";
import WindowIcon from "../icons/window.svg";
import WindowIncognitoChromeIcon from "../icons/window_incognito_chrome.svg";
import WindowIncognitoFirefoxIcon from "../icons/window_incognito_firefox.svg";

import "../styles/DetailsContainer.scss";
import Highlighter from "react-highlight-words";

const WINDOW_ROW_HEIGHT = 30;
const TAB_ROW_HEIGHT = 30;
const WINDOW_GAP_HEIGHT = 5;

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
  const { tab, windowId, allTabsNumber, searchWords, handleRemoveTab } = props;
  const handleRemoveClick = () => {
    handleRemoveTab(windowId, tab.id);
  };

  const handleOpenClick = e => {
    if (e.button === 0) openUrl(tab.url, tab.title, true);
    else if (e.button === 1) openUrl(tab.url, tab.title, false);
  };

  return (
    <div className="tabContainer">
      <button className="tabButton" onMouseUp={handleOpenClick} title={`${tab.title}\n${tab.url}`}>
        <FavIcon favIconUrl={tab.favIconUrl} />
        <span className="tabTitle">
          <Highlighter
            searchWords={searchWords}
            textToHighlight={tab.title || ""}
            autoEscape={true}
          />
        </span>
      </button>
      <div className="buttonsContainer">
        {allTabsNumber > 1 && <RemoveButton handleClick={handleRemoveClick} />}
      </div>
    </div>
  );
};

export default class DetailsContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      collapsedSessionId: null,
      collapsedWindowIds: {},
      height: 0
    };
  }

  componentDidUpdate(prevProps, prevState) {
    // Reset the scroll position and collapsed state when the session changes
    if (prevProps.session.id !== this.props.session.id) {
      this.list?.scrollTo(0);
      this.setState({ collapsedSessionId: null, collapsedWindowIds: {} });
    }

    if (
      prevProps.session !== this.props.session ||
      prevProps.session.id !== this.props.session.id ||
      prevState.collapsedWindowIds !== this.state.collapsedWindowIds
    ) {
      this.list?.resetAfterIndex(0);
    }
  }

  componentWillUnmount() {
    this.resizeObserver?.disconnect();
  }

  setContainerRef = container => {
    if (this.container === container) return;

    this.resizeObserver?.disconnect();
    this.container = container;

    if (!container) return;

    // Calculate the height of the container and update the state when it changes
    this.resizeObserver = new ResizeObserver(entries => {
      const height = Math.floor(entries[0].contentRect.height);
      if (height !== this.state.height) this.setState({ height });
    });

    this.resizeObserver.observe(container);
  };

  getRows = () => {
    // Generate a flat list of rows to render, including window rows and tab rows
    const { session } = this.props;

    const isCurrentSession = this.state.collapsedSessionId === session.id;

    return Object.keys(session.windows).flatMap(windowId => {
      const tabs = session.windows[windowId];
      const isCollapsed = isCurrentSession && this.state.collapsedWindowIds[windowId];
      const rows = [{ type: "window", windowId, tabs, isCollapsed }];

      // Add sorted tab row to the list if the window is not collapsed
      if (!isCollapsed) {
        Object.values(tabs)
          .sort((a, b) => a.index - b.index)
          .forEach(tab => rows.push({ type: "tab", windowId, tab }));
      }

      rows.push({ type: "gap", windowId });
      return rows;
    });
  };

  getRowHeight = index => {
    const row = this.rows[index];

    switch (row.type) {
      case "window":
        return WINDOW_ROW_HEIGHT;
      case "tab":
        return TAB_ROW_HEIGHT;
      default:
        return WINDOW_GAP_HEIGHT;
    }
  };

  toggleCollapsed = windowId => {
    const { session } = this.props;

    this.setState(prevState => {
      // Get current collapsed window IDs or reset if the session has changed
      const collapsedWindowIds =
        prevState.collapsedSessionId === session.id ? prevState.collapsedWindowIds : {};

      // Add or remove the window ID from the collapsed window IDs based on its current state
      return {
        collapsedSessionId: session.id,
        collapsedWindowIds: {
          ...collapsedWindowIds,
          [windowId]: !collapsedWindowIds[windowId]
        }
      };
    });
  };

  handleRemoveTab = (windowId, tabId) => {
    const { removeTab } = this.props;
    removeTab(this.props.session, windowId, tabId);
  };

  handleRemoveWindowClick = windowId => {
    const { removeWindow } = this.props;
    removeWindow(this.props.session, windowId);
  };

  handleOpenWindowClick = windowId => {
    const { session } = this.props;
    sendOpenMessage(session.id, "openInNewWindow", windowId);
  };

  handleEditWindowClick = (e, windowId) => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(
      x,
      y,
      <WindowMenuItems sessionId={this.props.session.id} windowId={windowId} />
    );
    e.preventDefault();
  };

  renderWindowRow = (row, style) => {
    const { session } = this.props;
    const { windowId, tabs, isCollapsed } = row;
    const tabsNumber = Object.keys(tabs).length;
    const tabLabel = browser.i18n.getMessage("tabLabel");
    const tabsLabel = browser.i18n.getMessage("tabsLabel");
    const isIncognito = Object.values(tabs)[0].incognito;
    const windowTitle = session?.windowsInfo?.[windowId]?.title;

    return (
      <div
        className={`windowContainer virtualRow ${isCollapsed ? "isCollapsed" : ""}`}
        style={style}
      >
        <div className="windowInfo" onContextMenu={e => this.handleEditWindow(e, windowId)}>
          <div className="leftWrapper">
            <button className="collapseButton" onClick={() => this.toggleCollapsed(windowId)}>
              <CollapseIcon />
            </button>
            <div className="windowIcon">
              {isIncognito ? (
                browserInfo().name === "Chrome" ? (
                  <WindowIncognitoChromeIcon />
                ) : (
                  <WindowIncognitoFirefoxIcon />
                )
              ) : (
                <WindowIcon />
              )}
            </div>
            <button
              className="windowTitle"
              onClick={() => this.handleOpenWindow(windowId)}
              title={browser.i18n.getMessage("openInNewWindowLabel")}
            >
              {windowTitle ||
                Object.values(tabs).find(tab => tab.active)?.title ||
                browser.i18n.getMessage("windowLabel")}
            </button>
            <span className="tabsNumber">
              {tabsNumber} {tabsNumber > 1 ? tabsLabel : tabLabel}
            </span>
          </div>
          <div className="buttonsContainer">
            <EditButton handleClick={e => this.handleEditWindow(e, windowId)} />
            {session.windowsNumber > 1 && (
              <RemoveButton handleClick={() => this.handleRemoveWindow(windowId)} />
            )}
          </div>
        </div>
      </div>
    );
  };

  renderTabRow(row, style) {
    const { session, searchWords } = this.props;

    return (
      <div className="windowContainer virtualRow" style={style}>
        <div className="tabs">
          <TabContainer
            tab={row.tab}
            windowId={row.windowId}
            allTabsNumber={session.tabsNumber}
            searchWords={searchWords}
            handleRemoveTab={this.handleRemoveTab}
            key={`${session.id}-${row.windowId}-${row.tab.id}`}
          />
        </div>
      </div>
    );
  }

  renderRow = ({ index, style }) => {
    const row = this.rows[index];

    switch (row.type) {
      case "window":
        return this.renderWindowRow(row, style);
      case "tab":
        return this.renderTabRow(row, style);
      default:
        return <div style={style} />;
    }
  };

  render() {
    const { session } = this.props;

    if (!session.windows) return null;

    this.rows = this.getRows();

    return (
      <div className="detailsContainer" ref={this.setContainerRef}>
        {this.state.height > 0 && (
          <VariableSizeList
            ref={list => (this.list = list)}
            className="scrollbar"
            height={this.state.height}
            itemCount={this.rows.length}
            itemKey={index => {
              const row = this.rows[index];

              if (row.type === "window") {
                return `${session.id}-${row.type}-${row.windowId}`;
              } else if (row.type === "tab") {
                return `${session.id}-${row.type}-${row.windowId}-${row.tab.id}`;
              }
            }}
            itemSize={this.getRowHeight}
            width="100%"
          >
            {this.renderRow}
          </VariableSizeList>
        )}
      </div>
    );
  }
}
