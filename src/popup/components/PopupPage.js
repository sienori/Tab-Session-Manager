import React, { Component } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import url from "url";
import {
  initSettings,
  getSettings,
  setSettings,
  handleSettingsChange
} from "src/settings/settings";
import { updateLogLevel, overWriteLogLevel } from "src/common/log";
import {
  getSessions,
  sendSessionSaveMessage,
  sendSessionRemoveMessage,
  sendSessionUpdateMessage
} from "../actions/controlSessions";
import { deleteWindow, deleteTab } from "../../common/editSessions.js";
import openUrl from "../actions/openUrl";
import Header from "./Header";
import OptionsArea from "./OptionsArea";
import SessionsArea from "./SessionsArea";
import SessionDetailsArea from "./SessionDetailsArea";
import Notification from "./Notification";
import SaveArea from "./SaveArea";
import Menu from "./Menu";
import Modal from "./Modal";
import Error from "./Error";
import DonationMessage from "./DonationMessage";
import "../styles/PopupPage.scss";

const logDir = "popup/components/PopupPage";

export default class PopupPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sessions: [],
      isInitSessions: false,
      selectedSession: {},
      removedSession: {},
      filterValue: "_displayAll",
      sortValue: "newest",
      isShowSearchBar: false,
      searchWord: "",
      isInTab: false,
      sidebarWidth: 300,
      notification: {
        message: "",
        type: "info",
        buttonLabel: "",
        onClick: () => {}
      },
      syncStatus: {
        status: "complete",
        progress: 0,
        total: 0
      },
      needsSync: false,
      menu: {
        isOpen: false,
        x: 0,
        y: 0,
        items: <div />
      },
      modal: {
        isOpen: false,
        title: "Title",
        content: <div />
      },
      error: {
        isError: false,
        type: ""
      }
    };

    this.optionsAreaElement = React.createRef();
    this.sessionsAreaElement = React.createRef();
    this.saveAreaElement = React.createRef();

    this.init();
  }

  init = async () => {
    await initSettings();
    overWriteLogLevel();
    updateLogLevel();
    log.info(logDir, "init()");

    const isInTab = url.parse(location.href).hash == "#inTab";
    if (!isInTab) {
      document.body.style.width = `${getSettings("popupWidthV2")}px`;
      document.body.style.height = `${getSettings("popupHeight")}px`;
      if (getSettings("isSessionListOpenInTab")) {
        const popupUrl = "../popup/index.html#inTab";
        openUrl(popupUrl);
        window.close();
      }
    } else {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
    }
    this.setState({
      sortValue: getSettings("sortValue") || "newest",
      isShowSearchBar: getSettings("isShowSearchBar"),
      isInTab: isInTab,
      sidebarWidth: getSettings("sidebarWidth")
    });

    const isInit = await browser.runtime.sendMessage({ message: "getInitState" });
    if (!isInit) this.setState({ error: { isError: true, type: "indexedDB" } });

    const keys = ["id", "name", "date", "tag", "tabsNumber", "windowsNumber", "lastEditedTime"];
    const selectedSessionId = getSettings("selectedSessionId");
    if (selectedSessionId) {
      const selectedSession = await getSessions(selectedSessionId, keys);
      if (selectedSession) {
        this.setState({ sessions: [selectedSession] });
        this.selectSession(selectedSessionId);
      }
    }

    browser.runtime.onMessage.addListener(this.handleMessage);
    browser.runtime.sendMessage({ message: "requestAllSessions", needKeys: keys, count: 30 });

    browser.storage.onChanged.addListener(handleSettingsChange);

    if (getSettings("isShowUpdated")) {
      this.openNotification({
        message: browser.i18n.getMessage("NotificationOnUpdateLabel"),
        type: "info",
        duration: 20000,
        buttonLabel: browser.i18n.getMessage("seeMoreLabel"),
        onClick: () => openUrl("../options/index.html#information?action=updated")
      });
      setSettings("isShowUpdated", false);
    }

    if (Math.random() < 0.03) {
      this.openModal(browser.i18n.getMessage("donationLabel"), <DonationMessage />);
    }
  };

  calcNeedsSync = sessions => {
    const shouldShowCloudSync = getSettings("signedInEmail");
    const lastSyncTime = getSettings("lastSyncTime");
    const removedQueue = getSettings("removedQueue");
    const includesAutoSaveToSync = getSettings("includesAutoSaveToSync");
    if (!shouldShowCloudSync) return false;

    const shouldDelete = removedQueue.length > 0;
    const shouldUpload = sessions
      .filter(session => !session.tag.includes("temp"))
      .filter(
        session =>
          includesAutoSaveToSync ||
          (!session.tag.includes("regular") &&
            !session.tag.includes("winClose") &&
            !session.tag.includes("browserExit"))
      )
      .some(session => session.lastEditedTime > lastSyncTime);
    return shouldDelete || shouldUpload;
  };

  handleMessage = request => {
    switch (request.message) {
      case "saveSession":
      case "updateSession":
      case "deleteSession":
      case "deleteAll":
        return this.changeSessions(request);
      case "updateSyncStatus":
        return this.handleUpdateSyncStatus(request);
      case "responseAllSessions":
        return this.handleResponseAllSessions(request);
    }
  };

  handleResponseAllSessions = async request => {
    const selectedSessionId = getSettings("selectedSessionId");
    const sessions = request.sessions.filter(session => session.id !== selectedSessionId);
    this.setState({
      sessions: this.state.sessions.concat(sessions),
      filterValue: getSettings("filterValue") || "_displayAll"
    });

    if (request.isEnd) {
      const needsSync = this.calcNeedsSync(this.state.sessions);
      this.setState({
        isInitSessions: true,
        needsSync: needsSync
      });
    }
  };

  changeSessions = async request => {
    log.info(logDir, "changeSessions()", request);
    let sessions;
    let selectedSession = this.state.selectedSession;
    let needsSync = true;

    switch (request.message) {
      case "saveSession": {
        const newSession = request.session;
        sessions = this.state.sessions.concat(newSession);
        needsSync = !request.saveBySync;
        break;
      }
      case "updateSession": {
        const newSession = request.session;
        if (newSession.id === selectedSession.id) selectedSession = newSession;

        sessions = this.state.sessions;
        const index = sessions.findIndex(session => session.id === newSession.id);
        if (index === -1) sessions = this.state.sessions.concat(newSession);
        else sessions.splice(index, 1, newSession);
        needsSync = !request.saveBySync;
        break;
      }
      case "deleteSession": {
        const deletedSessionId = request.id;
        if (deletedSessionId === selectedSession.id) selectedSession = {};

        sessions = this.state.sessions;
        const index = sessions.findIndex(session => session.id === deletedSessionId);
        if (index === -1) return;
        sessions.splice(index, 1);
        break;
      }
      case "deleteAll": {
        const keys = ["id", "name", "date", "tag", "tabsNumber", "windowsNumber"];
        sessions = await getSessions(null, keys);
        selectedSession = {};
        break;
      }
    }
    this.setState({
      sessions: sessions,
      selectedSession: selectedSession,
      needsSync: needsSync
    });
  };

  handleUpdateSyncStatus = request => {
    if (request.syncStatus.status == "pending") this.setState({ needsSync: false });
    this.setState({ syncStatus: request.syncStatus });
  };

  changeFilterValue = value => {
    log.info(logDir, "changeFilterValue()", value);
    this.setState({ filterValue: value });
    setSettings("filterValue", value);
  };

  changeSortValue = value => {
    log.info(logDir, "changeSortValue()", value);
    this.setState({ sortValue: value });
    setSettings("sortValue", value);
  };

  changeSearchWord = searchWord => {
    log.info(logDir, "changeSearchValue()", searchWord);
    this.setState({ searchWord: searchWord.trim() });
  };

  selectSession = async id => {
    if (id === this.state.selectedSession.id) return;
    log.info(logDir, "selectSession()", id);

    let selectedSession = this.state.sessions.find(session => session.id === id);
    this.setState({ selectedSession: selectedSession || {} });
    setSettings("selectedSessionId", id);

    selectedSession = await getSessions(id);
    if (!selectedSession) return;
    if (selectedSession.id !== this.state.selectedSession.id) return;
    this.setState({ selectedSession: selectedSession || {} });
  };

  saveSession = async (name, property) => {
    log.info(logDir, "saveSession()", name, property);
    try {
      const savedSession = await sendSessionSaveMessage(name, property);
      this.selectSession(savedSession.id);
      this.openNotification({
        message: browser.i18n.getMessage("sessionSavedLabel"),
        type: "success",
        duration: 2000
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedSaveSessionLabel"),
        type: "error"
      });
    }
  };

  removeSession = async id => {
    log.info(logDir, "removeSession()", id);
    const removedSession = await getSessions(id);
    this.saveRemovedSession(removedSession);
    try {
      await sendSessionRemoveMessage(id);
      this.openNotification({
        message: browser.i18n.getMessage("sessionDeletedLabel"),
        type: "warn",
        buttonLabel: browser.i18n.getMessage("restoreSessionLabel"),
        onClick: this.restoreRemovedSession
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedDeleteSessionLabel"),
        type: "error"
      });
    }
  };

  removeWindow = async (session, winId) => {
    this.saveRemovedSession(session);
    try {
      const editedSession = deleteWindow(session, winId);
      await sendSessionUpdateMessage(editedSession);
      this.openNotification({
        message: browser.i18n.getMessage("sessionWindowDeletedLabel"),
        type: "warn",
        buttonLabel: browser.i18n.getMessage("restoreSessionLabel"),
        onClick: this.restoreRemovedSession
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedDeleteSessionWindowLabel"),
        type: "error"
      });
    }
  };

  removeTab = async (session, winId, tabId) => {
    this.saveRemovedSession(session);
    try {
      const editedSession = deleteTab(session, winId, tabId);
      await sendSessionUpdateMessage(editedSession);
      this.openNotification({
        message: browser.i18n.getMessage("sessionTabDeletedLabel"),
        type: "warn",
        buttonLabel: browser.i18n.getMessage("restoreSessionLabel"),
        onClick: this.restoreRemovedSession
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedDeleteSessionTabLabel"),
        type: "error"
      });
    }
  };

  saveRemovedSession = removedSession => {
    log.info(logDir, "saveRemovedSession()");
    this.setState({
      removedSession: removedSession
    });
  };

  restoreRemovedSession = async () => {
    log.info(logDir, "restoreRemovedSession()");
    const removedSession = this.state.removedSession;
    if (removedSession.id == null) return;
    await sendSessionUpdateMessage(removedSession);
    this.selectSession(removedSession.id);
    this.setState({
      removedSession: {}
    });
  };

  openNotification = notification => {
    log.info(logDir, "openNotification()", notification);
    this.setState({
      notification: {
        key: Date.now(),
        ...notification
      }
    });
  };

  openMenu = (x, y, itemsComponent) => {
    log.info(logDir, "openMenu()", itemsComponent);
    this.lastFocusedElement = document.activeElement;
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
    this.lastFocusedElement.focus();
  };

  openModal = (title, contentComponent) => {
    log.info(logDir, "openModal", title);
    this.lastFocusedElement = document.activeElement;
    this.setState({
      modal: {
        isOpen: true,
        title: title,
        content: contentComponent
      }
    });
  };

  closeModal = () => {
    this.setState({
      modal: {
        isOpen: false,
        title: this.state.modal.title,
        content: this.state.modal.content
      }
    });
    this.lastFocusedElement.focus();
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
      <div
        id="popupPage"
        className={this.state.isInTab ? "isInTab" : ""}
        onClick={this.state.menu.isOpen ? this.closeMenu : null}
      >
        <Notification notification={this.state.notification} />
        <Header
          openModal={this.openModal}
          openNotification={this.openNotification}
          syncStatus={this.state.syncStatus}
          needsSync={this.state.needsSync}
        />
        <div id="contents">
          <div className="column sidebar" style={{ width: `${this.state.sidebarWidth}px` }}>
            <OptionsArea
              sessions={this.state.sessions || []}
              filterValue={this.state.filterValue}
              sortValue={this.state.sortValue}
              isShowSearchBar={this.state.isShowSearchBar}
              changeSearchWord={this.changeSearchWord}
              changeFilter={this.changeFilterValue}
              changeSort={this.changeSortValue}
              optionsAreaRef={this.optionsAreaElement}
            />
            <Error error={this.state.error} />
            <SessionsArea
              sessions={this.state.sessions || []}
              selectedSessionId={this.state.selectedSession.id || ""}
              filterValue={this.state.filterValue}
              sortValue={this.state.sortValue}
              searchWord={this.state.searchWord}
              removeSession={this.removeSession}
              selectSession={this.selectSession}
              openMenu={this.openMenu}
              isInitSessions={this.state.isInitSessions}
              error={this.state.error}
              sessionsAreaRef={this.sessionsAreaElement}
              optionsAreaRef={this.optionsAreaElement.current}
              saveAreaRef={this.saveAreaElement.current}
            />
            <SaveArea
              openMenu={this.openMenu}
              saveSession={this.saveSession}
              saveAreaRef={this.saveAreaElement}
              sessionsAreaRef={this.sessionsAreaElement.current}
            />
          </div>
          <div className="column">
            <SessionDetailsArea
              session={this.state.selectedSession}
              removeSession={this.removeSession}
              removeWindow={this.removeWindow}
              removeTab={this.removeTab}
              openMenu={this.openMenu}
              openModal={this.openModal}
              closeModal={this.closeModal}
            />
          </div>
        </div>
        <Menu menu={this.state.menu} />
        <Modal modal={this.state.modal} closeModal={this.closeModal} />
      </div>
    );
  }
}
