import React, { Component } from "react";
import browser from "webextension-polyfill";
import openUrl from "../actions/openUrl";
import { sendOpenMessage } from "../actions/controlSessions";
import PlusIcon from "../icons/plus.svg";
import CollapseIcon from "../icons/collapse.svg";
import "../styles/DetailsContainer.scss";

const FavIcon = props => (
  <img
    className="favIcon"
    src={props.favIconUrl || "/icons/favicon.png"}
    onError={e => {
      e.target.src = "/icons/favicon.png";
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

const TabContainer = props => {
  const { tab, windowId, allTabsNumber, handleRemoveTab } = props;
  const handleRemoveClick = () => {
    handleRemoveTab(windowId, tab.id);
  };

  const handleOpenClick = () => {
    openUrl(tab.url, tab.title);
  };

  return (
    <div className="tabContainer">
      <button className="tabButton" onClick={handleOpenClick} title={`${tab.title}\n${tab.url}`}>
        <FavIcon favIconUrl={tab.favIconUrl} />
        <span className="tabTitle">{tab.title}</span>
      </button>
      {allTabsNumber > 1 && <RemoveButton handleClick={handleRemoveClick} />}
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
      handleRemoveTab
    } = this.props;
    const sortedTabs = Object.values(tabs).sort((a, b) => a.index - b.index);

    return (
      <div className={`windowContainer ${this.state.isCollapsed ? "isCollapsed" : ""}`}>
        <div className="windowInfo">
          <div className="leftWrapper">
            <button className="collapseButton" onClick={this.toggleCollapsed}>
              <CollapseIcon />
            </button>
            <FavIcon favIconUrl="/icons/window.png" />
            <button
              className="windowTitle"
              onClick={this.handleOpenClick}
              title={browser.i18n.getMessage("openInNewWindowLabel")}
            >
              {windowTitle}
            </button>
            <span className="tabsNumber">{this.getTabsNumberText()}</span>
          </div>
          <div className="buttonsContainer">
            {windowsNumber > 1 && <RemoveButton handleClick={this.handleRemoveClick} />}
          </div>
        </div>
        <div className="tabs">
          {Object.values(sortedTabs).map(tab => (
            <TabContainer
              tab={tab}
              windowId={windowId}
              allTabsNumber={allTabsNumber}
              handleRemoveTab={handleRemoveTab}
              key={tab.id}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default props => {
  const { session, removeWindow, removeTab } = props;

  const handleRemoveWindow = windowId => {
    removeWindow(session, windowId);
  };

  const handleRemoveTab = (windowId, tabId) => {
    removeTab(session, windowId, tabId);
  };

  const windowLabel = browser.i18n.getMessage("windowLabel");
  return (
    <div className="detailsContainer">
      {Object.keys(session.windows).map(windowId => (
        <WindowContainer
          tabs={session.windows[windowId]}
          windowTitle={session.windowsInfo ? session.windowsInfo[windowId].title : windowLabel}
          windowId={windowId}
          sessionId={session.id}
          windowsNumber={session.windowsNumber}
          allTabsNumber={session.tabsNumber}
          handleRemoveWindow={handleRemoveWindow}
          handleRemoveTab={handleRemoveTab}
          key={`${session.id}${windowId}`}
        />
      ))}
    </div>
  );
};
