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
  sendSessionUpdateMessage,
  sendUndoMessage,
  sendEndTrackingByWindowDeleteMessage
} from "../actions/controlSessions";
import { deleteWindow, deleteTab } from "../../common/editSessions.js";
import openUrl from "../actions/openUrl";
import Header from "./Header";
import OptionsArea from "./OptionsArea";
import SessionsArea, { getSortedSessions } from "./SessionsArea";
import SessionDetailsArea from "./SessionDetailsArea";
import Notification from "./Notification";
import SaveArea from "./SaveArea";
import Menu from "./Menu";
import Modal from "./Modal";
import Error from "./Error";
import DonationMessage from "./DonationMessage";
import "../styles/PopupPage.scss";
import { makeSearchInfo } from "../../common/makeSearchInfo";
import { initToolbarLayout, disposeToolbarLayout } from "../toolbarLayout";

const THUMBNAIL_COLUMNS_MIN = 1;
const THUMBNAIL_COLUMNS_MAX = 6;
const THUMBNAIL_COLUMNS_DEFAULT = 3;
const THUMBNAIL_PIXEL_MIN = 80;
const THUMBNAIL_PIXEL_MAX = 320;

const logDir = "popup/components/PopupPage";

export default class PopupPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sessions: [],
      searchInfo: [],
      isInitSessions: false,
      selectedSession: {},
      filterValue: "_displayAll",
      sortValue: "newest",
      isShowSearchBar: false,
      searchWords: [],
      searchedSessionIds: [],
      isInTab: false,
      sidebarWidth: 300,
      viewMode: "list",
      thumbnailSize: THUMBNAIL_COLUMNS_DEFAULT,
      thumbnailSource: "representative",
      hideThumbnailText: false,
      notification: {
        message: "",
        type: "info",
        buttonLabel: "",
        onClick: () => { }
      },
      syncStatus: {
        status: "complete",
        progress: 0,
        total: 0
      },
      needsSync: false,
      undoStatus: {
        undoCount: 0,
        redoCount: 0
      },
      tagList: [],
      trackingSessions: [],
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
    this.searchBarElement = React.createRef();
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

    document.body.dataset.theme = getSettings("theme");

    const storedThumbnailSize = this.normalizeThumbnailColumns(getSettings("thumbnailSize"));
    const storedHideText = getSettings("hideThumbnailText");
    this.setState({
      sortValue: getSettings("sortValue") || "newest",
      isInTab: isInTab,
      sidebarWidth: getSettings("sidebarWidth"),
      viewMode: getSettings("thumbnailViewMode") || "list",
      thumbnailSize: storedThumbnailSize,
      thumbnailSource: getSettings("thumbnailImageSource") || "representative",
      hideThumbnailText: storedHideText === true || storedHideText === "true"
    });

    const isInit = await browser.runtime.sendMessage({ message: "getInitState" });
    if (!isInit) this.setState({ error: { isError: true, type: "indexedDB" } });

    this.firstFilterValue = getSettings("filterValue");
    this.firstSelectedSessionId = getSettings("selectedSessionId");

    const keys = ["id", "name", "date", "tag", "tabsNumber", "windowsNumber", "lastEditedTime"];
    this.port = Math.random();
    browser.runtime.onMessage.addListener(this.handleMessage);
    browser.runtime.sendMessage({ message: "requestAllSessions", needKeys: keys, count: 30, port: this.port });

    if (this.firstSelectedSessionId) {
      const selectedSession = await getSessions(this.firstSelectedSessionId, keys);
      if (selectedSession) {
        this.setState({ sessions: this.state.sessions.concat([selectedSession]) });
        this.selectSession(this.firstSelectedSessionId);
      }
    }

    browser.storage.local.onChanged.addListener(handleSettingsChange);
    browser.storage.local.onChanged.addListener(this.handleViewPreferencesChange);
    initToolbarLayout();
    window.addEventListener("unload", this.handleUnload, { once: true });
    browser.runtime.sendMessage({ message: "updateUndoStatus" });
    browser.runtime.sendMessage({ message: "updateTrackingStatus" });

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

  updateTagList = sessions => {
    const reservedTags = [
      "regular",
      "winClose",
      "browserExit",
      "temp",
      "_startup",
      "_tracking"
    ];
    const allTags = sessions.map(session => session.tag).flat().concat(this.state.tagList);
    const uniqueTags = Array.from(new Set(allTags)).filter(tag => !reservedTags.includes(tag))
      .sort((a, b) => a.localeCompare(b));

    this.setState({ tagList: uniqueTags });
  };
  normalizeThumbnailColumns = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return THUMBNAIL_COLUMNS_DEFAULT;
    }
    if (numericValue > THUMBNAIL_COLUMNS_MAX) {
      const clampedPixels = Math.min(Math.max(numericValue, THUMBNAIL_PIXEL_MIN), THUMBNAIL_PIXEL_MAX);
      const ratio = (clampedPixels - THUMBNAIL_PIXEL_MIN) / (THUMBNAIL_PIXEL_MAX - THUMBNAIL_PIXEL_MIN);
      const derivedColumns = THUMBNAIL_COLUMNS_MAX - ratio * (THUMBNAIL_COLUMNS_MAX - THUMBNAIL_COLUMNS_MIN);
      return Math.min(Math.max(Math.round(derivedColumns), THUMBNAIL_COLUMNS_MIN), THUMBNAIL_COLUMNS_MAX);
    }
    return Math.min(Math.max(Math.round(numericValue), THUMBNAIL_COLUMNS_MIN), THUMBNAIL_COLUMNS_MAX);
  };

  handleViewModeChange = mode => {
    setSettings("thumbnailViewMode", mode);
    this.setState({ viewMode: mode });
  };

  handleThumbnailSizeChange = value => {
    const normalized = this.normalizeThumbnailColumns(value);
    setSettings("thumbnailSize", normalized);
    this.setState({ thumbnailSize: normalized });
  };

  handleThumbnailSourceToggle = isScreenshot => {
    const value = isScreenshot ? "screenshot" : "representative";
    setSettings("thumbnailImageSource", value);
    this.setState({ thumbnailSource: value });
  };

  handleHideThumbnailTextChange = isHidden => {
    setSettings("hideThumbnailText", !!isHidden);
    this.setState({ hideThumbnailText: !!isHidden });
  };

  handleViewPreferencesChange = (changes, areaName) => {
    if (areaName !== "local" || !changes.Settings) return;
    const updatedViewMode = getSettings("thumbnailViewMode") || "list";
    const updatedSize = this.normalizeThumbnailColumns(getSettings("thumbnailSize"));
    const updatedSource = getSettings("thumbnailImageSource") || "representative";
    const hideTextPref = getSettings("hideThumbnailText");
    const updatedHideText = hideTextPref === true || hideTextPref === "true";

    this.setState(prev => {
      const shouldUpdate =
        prev.viewMode !== updatedViewMode ||
        prev.thumbnailSize !== updatedSize ||
        prev.thumbnailSource !== updatedSource ||
        prev.hideThumbnailText !== updatedHideText;
      return shouldUpdate ? {
        viewMode: updatedViewMode,
        thumbnailSize: updatedSize,
        thumbnailSource: updatedSource,
        hideThumbnailText: updatedHideText
      } : null;
    });
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
      case "updateUndoStatus":
        return this.handleUpdateUndoStatus(request);
      case "updateTrackingStatus":
        return this.handleUpdateTrackingStatus(request);
    }
  };

  handleResponseAllSessions = async request => {
    if (request.port != this.port) return;
    const sessions = request.sessions.filter(session => session.id !== this.firstSelectedSessionId);
    this.setState({
      sessions: this.state.sessions.concat(sessions),
      filterValue: this.firstFilterValue || "_displayAll"
    });

    if (request.isEnd) {
      this.changeFilterValue(this.firstFilterValue);
      const needsSync = this.calcNeedsSync(this.state.sessions);
      const syncStatus = await browser.runtime.sendMessage({ message: "getSyncStatus" });
      this.updateTagList(this.state.sessions);
      this.setState({
        isInitSessions: true,
        needsSync: needsSync,
        syncStatus: syncStatus
      });

      const searchInfo = await browser.runtime.sendMessage({ message: "getsearchInfo" });
      this.setState({ searchInfo: searchInfo });
    }
  };

  changeSessions = async request => {
    log.info(logDir, "changeSessions()", request);
    let sessions;
    let searchInfo;
    let selectedSession = this.state.selectedSession;
    let needsSync = true;

    switch (request.message) {
      case "saveSession": {
        const newSession = request.session;
        sessions = this.state.sessions.concat(newSession);
        searchInfo = this.state.searchInfo.concat(makeSearchInfo(newSession));
        needsSync = !request.saveBySync;
        this.updateTagList([newSession]);
        break;
      }
      case "updateSession": {
        const newSession = request.session;
        const newSearchInfo = makeSearchInfo(newSession);
        if (newSession.id === selectedSession.id) selectedSession = newSession;

        sessions = this.state.sessions;
        searchInfo = this.state.searchInfo;
        const sessionIndex = sessions.findIndex(session => session.id === newSession.id);
        const infoIndex = searchInfo.findIndex(info => info.id === newSearchInfo.id);
        if (sessionIndex === -1) {
          sessions = this.state.sessions.concat(newSession);
          searchInfo = this.state.searchInfo.concat(newSearchInfo);
        }
        else {
          sessions.splice(sessionIndex, 1, newSession);
          searchInfo.splice(infoIndex, 1, newSearchInfo);
        }
        needsSync = !request.saveBySync;
        this.updateTagList([newSession]);
        break;
      }
      case "deleteSession": {
        const deletedSessionId = request.id;
        if (deletedSessionId === selectedSession.id) selectedSession = {};

        sessions = this.state.sessions;
        searchInfo = this.state.searchInfo;
        const sessionIndex = sessions.findIndex(session => session.id === deletedSessionId);
        const infoIndex = searchInfo.findIndex(info => info.id === deletedSessionId);
        if (sessionIndex === -1) return;
        sessions.splice(sessionIndex, 1);
        searchInfo.splice(infoIndex, 1);
        break;
      }
      case "deleteAll": {
        const keys = ["id", "name", "date", "tag", "tabsNumber", "windowsNumber"];
        sessions = await getSessions(null, keys);
        searchInfo = [];
        selectedSession = {};
        break;
      }
    }
    this.setState({
      sessions: sessions,
      searchInfo: searchInfo,
      selectedSession: selectedSession,
      needsSync: needsSync
    });
  };

  handleUpdateSyncStatus = request => {
    if (request.syncStatus.status == "pending") this.setState({ needsSync: false });
    this.setState({ syncStatus: request.syncStatus });
  };

  handleUpdateUndoStatus = request => {
    if (!request.undoStatus) return;
    this.setState({ undoStatus: request.undoStatus });
  };

  handleUpdateTrackingStatus = request => {
    this.setState({ trackingSessions: request.trackingSessions || [] });
  };

  handleUnload = () => {
    browser.storage.local.onChanged.removeListener(handleSettingsChange);
    disposeToolbarLayout();
    browser.storage.local.onChanged.removeListener(this.handleViewPreferencesChange);
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

  toggleSearchBar = (isShow = !this.state.isShowSearchBar) => {
    this.setState({ isShowSearchBar: isShow });
    if (isShow) this.searchBarElement.current?.focus();
    else {
      this.changeSearchWord("");
      this.sessionsAreaElement.current?.focus();
    }
  };

  changeSearchWord = (searchWord, isEnter = false) => {
    log.info(logDir, "changeSearchValue()", searchWord);
    this.searchSessions(searchWord);
    if (isEnter) {
      const { sessions, sortValue, filterValue, searchWords, searchedSessionIds } = this.state;
      const sortedSessions = getSortedSessions(sessions, sortValue, filterValue, searchWords, searchedSessionIds);
      if (sortedSessions.length === 0) return;
      this.selectSession(sortedSessions[0].id);
      this.sessionsAreaElement.current.focus();
      if (searchWord === "") this.toggleSearchBar(false);
    }
  };

  searchSessions = searchWord => {
    log.info(logDir, "searchSessions()", searchWord);
    const searchWords = searchWord.trim().toLowerCase().split(" ");
    this.setState({ searchWords: searchWords });
    if (searchWords.length === 0) return;

    const matchedIdsBySessionName = this.state.sessions
      .filter(session => searchWords.every(word => session.name.toLowerCase().includes(word)))
      .map(session => session.id);

    const matchedIdsByTabTitle = this.state.searchInfo
      .filter(info => searchWords.every(word => info.tabsTitle.includes(word)))
      .map(info => info.id);

    const searchedSessionIds = Array.from(new Set(matchedIdsBySessionName.concat(matchedIdsByTabTitle)));
    this.setState({ searchedSessionIds: searchedSessionIds });
    log.info(logDir, "=>searchSessions()", searchedSessionIds);
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
      const savedSession = await sendSessionSaveMessage(name, property, {
        thumbnailSource: this.state.thumbnailSource
      });
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
    try {
      await sendSessionRemoveMessage(id);
      this.openNotification({
        message: browser.i18n.getMessage("sessionDeletedLabel"),
        type: "warn",
        buttonLabel: browser.i18n.getMessage("undoLabel"),
        onClick: sendUndoMessage
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedDeleteSessionLabel"),
        type: "error"
      });
    }
  };

  removeWindow = async (session, winId) => {
    try {
      const editedSession = deleteWindow(session, winId);
      await sendSessionUpdateMessage(editedSession);

      if (this.state.trackingSessions.includes(session.id)) sendEndTrackingByWindowDeleteMessage(session.id, winId);

      this.openNotification({
        message: browser.i18n.getMessage("sessionWindowDeletedLabel"),
        type: "warn",
        buttonLabel: browser.i18n.getMessage("undoLabel"),
        onClick: sendUndoMessage
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedDeleteSessionWindowLabel"),
        type: "error"
      });
    }
  };

  removeTab = async (session, winId, tabId) => {
    try {
      const editedSession = deleteTab(session, winId, tabId);
      await sendSessionUpdateMessage(editedSession);
      this.openNotification({
        message: browser.i18n.getMessage("sessionTabDeletedLabel"),
        type: "warn",
        buttonLabel: browser.i18n.getMessage("undoLabel"),
        onClick: sendUndoMessage
      });
    } catch (e) {
      this.openNotification({
        message: browser.i18n.getMessage("failedDeleteSessionTabLabel"),
        type: "error"
      });
    }
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

  render() {
    return (
      <div
        id="popupPage"
        className={this.state.isInTab ? "isInTab" : ""}
        onClick={this.state.menu.isOpen ? this.closeMenu : null}
        onContextMenu={this.state.menu.isOpen ? this.closeMenu : null}
      >
        <Notification notification={this.state.notification} />
        <Header
          openModal={this.openModal}
          openNotification={this.openNotification}
          syncStatus={this.state.syncStatus}
          needsSync={this.state.needsSync}
          undoStatus={this.state.undoStatus}
        />
        <div id="contents">
          <div className="column sidebar" style={{ width: `${this.state.sidebarWidth}px` }}>
            <OptionsArea
              sessions={this.state.sessions || []}
              filterValue={this.state.filterValue}
              sortValue={this.state.sortValue}
              toggleSearchBar={this.toggleSearchBar}
              isShowSearchBar={this.state.isShowSearchBar}
              changeSearchWord={this.changeSearchWord}
              changeFilter={this.changeFilterValue}
              changeSort={this.changeSortValue}
              optionsAreaRef={this.optionsAreaElement}
              searchBarRef={this.searchBarElement}
              sessionsAreaRef={this.sessionsAreaElement}
            />
            <Error error={this.state.error} />
            <SessionsArea
              sessions={this.state.sessions || []}
              selectedSessionId={this.state.selectedSession.id || ""}
              filterValue={this.state.filterValue}
              sortValue={this.state.sortValue}
              searchWords={this.state.searchWords}
              searchedSessionIds={this.state.searchedSessionIds || []}
              trackingSessions={this.state.trackingSessions}
              removeSession={this.removeSession}
              selectSession={this.selectSession}
              openMenu={this.openMenu}
              toggleSearchBar={this.toggleSearchBar}
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
              searchWords={this.state.searchedSessionIds.includes(this.state.selectedSession.id) ?
                this.state.searchWords : []}
              tagList={this.state.tagList}
              isTracking={this.state.trackingSessions.includes(this.state.selectedSession.id)}
              removeSession={this.removeSession}
              removeWindow={this.removeWindow}
              removeTab={this.removeTab}
              openMenu={this.openMenu}
              openModal={this.openModal}
              closeModal={this.closeModal}
              viewMode={this.state.viewMode}
              thumbnailSize={this.state.thumbnailSize}
              thumbnailSource={this.state.thumbnailSource}
              hideThumbnailText={this.state.hideThumbnailText}
              onViewModeChange={this.handleViewModeChange}
              onThumbnailSizeChange={this.handleThumbnailSizeChange}
              onThumbnailSourceToggle={this.handleThumbnailSourceToggle}
              onHideThumbnailTextChange={this.handleHideThumbnailTextChange}
            />
          </div>
        </div>
        <Menu menu={this.state.menu} />
        <Modal modal={this.state.modal} closeModal={this.closeModal} />
      </div>
    );
  }
}
