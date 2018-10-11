import React, { Component } from "react";
import browser from "webextension-polyfill";
import { initSettings, getSettings, setSettings } from "src/settings/settings";
import {
  getSessions,
  sendSessionRemoveMessage,
  sendSessionUpdateMessage
} from "../actions/controlSessions";
import Header from "./Header";
import OptionsArea from "./OptionsArea";
import SessionsArea from "./SessionsArea";
import Notification from "./Notification";
import SaveArea from "./SaveArea";
import Menu from "./Menu";
import Error from "./Error";
import "../styles/PopupPage.scss";

export default class PopupPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sessions: [],
      isInitSessions: false,
      removedSession: {},
      filterValue: "_displayAll",
      sortValue: "newest",
      isShowSearchBar: false,
      searchWord: "",
      notification: {
        isOpen: false,
        message: "",
        buttonLabel: "",
        onClick: () => {}
      },
      menu: {
        isOpen: false,
        x: 0,
        y: 0,
        items: <div />
      },
      error: {
        isError: false,
        type: ""
      }
    };

    this.init();
  }

  init = async () => {
    await initSettings();
    document.body.style.width = `${getSettings("popupWidth")}px`;
    document.body.style.height = `${getSettings("popupHeight")}px`;
    this.setState({
      sortValue: getSettings("sortValue") || "newest",
      isShowSearchBar: getSettings("isShowSearchBar")
    });

    const isInit = await browser.runtime.sendMessage({ message: "getInitState" });
    if (!isInit) this.setState({ error: { isError: true, type: "indexedDB" } });

    const keys = ["id", "name", "date", "tag", "tabsNumber", "windowsNumber"];
    const sessions = await getSessions(null, keys);
    this.setState({
      sessions: sessions,
      isInitSessions: true,
      filterValue: getSettings("filterValue") || "_displayAll"
    });
    browser.runtime.onMessage.addListener(this.changeSessions);
  };

  changeSessions = async request => {
    let sessions, newSession, index;
    switch (request.message) {
      case "saveSession":
        newSession = await getSessions(request.id);
        sessions = this.state.sessions.concat(newSession);
        break;
      case "updateSession":
        newSession = await getSessions(request.id);
        sessions = this.state.sessions;
        index = sessions.findIndex(session => session.id === request.id);
        if (index === -1) sessions = this.state.sessions.concat(newSession);
        else sessions.splice(index, 1, newSession);
        break;
      case "deleteSession":
        sessions = this.state.sessions;
        index = sessions.findIndex(session => session.id === request.id);
        sessions.splice(index, 1);
        break;
      case "deleteAll":
        const keys = ["id", "name", "date", "tag", "tabsNumber", "windowsNumber"];
        sessions = await getSessions(null, keys);
        break;
    }
    this.setState({ sessions: sessions });
  };

  changeFilterValue = value => {
    this.setState({ filterValue: value });
    setSettings("filterValue", value);
  };

  changeSortValue = value => {
    this.setState({ sortValue: value });
    setSettings("sortValue", value);
  };

  changeSearchWord = searchWord => {
    this.setState({ searchWord: searchWord.trim() });
  };

  getSessionDetail = async id => {
    const session = await getSessions(id);
    const sessions = this.state.sessions;
    const index = sessions.findIndex(session => session.id === id);
    sessions.splice(index, 1, session);
    this.setState({ sessions: sessions });
  };

  removeSession = async id => {
    const removedSession = await getSessions(id);
    this.setState({
      removedSession: removedSession
    });
    sendSessionRemoveMessage(id);
    this.openNotification(
      browser.i18n.getMessage("sessionDeletedLabel"),
      browser.i18n.getMessage("restoreSessionLabel"),
      this.restoreSession
    );
  };

  restoreSession = () => {
    const removedSession = this.state.removedSession;
    if (removedSession.id == null) return;
    sendSessionUpdateMessage(removedSession);
    this.setState({
      removedSession: {}
    });
  };

  openNotification = (message, buttonLabel, onClick) => {
    this.setState({
      notification: {
        isOpen: true,
        message: message,
        buttonLabel: buttonLabel,
        onClick: onClick
      }
    });
  };

  closeNotification = () => {
    const notification = this.state.notification;
    this.setState({
      notification: {
        isOpen: false,
        message: notification.message,
        buttonLabel: notification.buttonLabel,
        onClick: notification.onClick
      }
    });
  };

  openMenu = (x, y, itemsComponent) => {
    this.setState({
      menu: {
        isOpen: true,
        x: x,
        y: y,
        items: itemsComponent
      }
    });
  };

  closeMenu = () => {
    this.setState({
      menu: {
        isOpen: false,
        x: this.state.menu.x,
        y: this.state.menu.y,
        items: this.state.menu.items
      }
    });
  };

  componentDidUpdate() {
    if (this.state.error.isError) return;
    if (this.state.sessions === undefined || this.state.sessions === null) {
      browser.runtime.onMessage.removeListener(this.changeSessions);
      window.close();
      this.setState({ error: { isError: true, type: "noConnection" } });
    }
  }

  render() {
    return (
      <div id="popupPage" onClick={this.state.menu.isOpen ? this.closeMenu : null}>
        <Header />
        <OptionsArea
          sessions={this.state.sessions || []}
          filterValue={this.state.filterValue}
          sortValue={this.state.sortValue}
          isShowSearchBar={this.state.isShowSearchBar}
          changeSearchWord={this.changeSearchWord}
          changeFilter={this.changeFilterValue}
          changeSort={this.changeSortValue}
        />
        <Error error={this.state.error} />
        <SessionsArea
          sessions={this.state.sessions || []}
          filterValue={this.state.filterValue}
          sortValue={this.state.sortValue}
          searchWord={this.state.searchWord}
          removeSession={this.removeSession}
          getSessionDetail={this.getSessionDetail}
          openMenu={this.openMenu}
          isInitSessions={this.state.isInitSessions}
          error={this.state.error}
        />
        <Notification notification={this.state.notification} handleClose={this.closeNotification} />
        <SaveArea openMenu={this.openMenu} />
        <Menu menu={this.state.menu} />
      </div>
    );
  }
}
