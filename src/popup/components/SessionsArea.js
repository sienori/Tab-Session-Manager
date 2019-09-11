import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage } from "../actions/controlSessions";
import SessionItem from "./SessionItem";
import "../styles/SessionsArea.scss";

const matchesFilter = (tags, filterValue) => {
  if (tags.includes("temp")) return false;
  switch (filterValue) {
    case "_displayAll":
      return true;
    case "_user":
      return (
        !tags.includes("regular") && !tags.includes("winClose") && !tags.includes("browserExit")
      );
    case "_auto":
      return tags.includes("regular") || tags.includes("winClose") || tags.includes("browserExit");
    default:
      return tags.includes(filterValue);
  }
};

const matchesSearch = (sessionName, searchWord) => {
  if (searchWord === "") return true;
  sessionName = sessionName.toLowerCase();
  searchWord = searchWord.toLowerCase();
  return sessionName.includes(searchWord);
};

const newestSort = (a, b) => b.date - a.date;
const alphabeticallySort = (a, b) => {
  if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
  else if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
};
const namelessSort = (a, b) => {
  //名前の無いセッションを最後に，同じ名前なら新しい順に
  if (a.name == "" && b.name != "") return 1;
  else if (a.name != "" && b.name == "") return -1;
  else if (a.name == b.name) return newestSort(a, b);
};

const getSortedSessions = (sessions, sortValue, filterValue, searchWord) => {
  let sortedSessions = sessions.map(session => ({
    id: session.id,
    date: session.date,
    name: session.name,
    tag: session.tag
  }));
  sortedSessions = sortedSessions.filter(
    session => matchesFilter(session.tag, filterValue) && matchesSearch(session.name, searchWord)
  );

  switch (sortValue) {
    case "newest":
      sortedSessions.sort(newestSort);
      break;
    case "oldest":
      sortedSessions.sort(newestSort);
      sortedSessions.reverse();
      break;
    case "aToZ":
      sortedSessions.sort(alphabeticallySort);
      sortedSessions.sort(namelessSort);
      break;
    case "zToA":
      sortedSessions.sort(alphabeticallySort);
      sortedSessions.reverse();
      sortedSessions.sort(namelessSort);
      break;
  }

  return sortedSessions;
};

export default class SessionsArea extends Component {
  scrollToTop = () => {
    const sessionsArea = this.props.sessionsAreaRef.current;
    sessionsArea.scrollTo(0, 0);
  };

  handleSessionSelect = id => {
    this.props.selectSession(id);
  };

  handleKeyDown = e => {
    const { selectSession, optionsAreaRef, saveAreaRef, selectedSessionId } = this.props;

    if (e.key === "ArrowUp") {
      selectSession(this.prevSession.id);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      selectSession(this.nextSession.id);
      e.preventDefault();
    } else if (e.key === "Tab" && e.shiftKey) {
      optionsAreaRef.focus();
      e.preventDefault();
    } else if (e.key === "Tab" && !e.shiftKey) {
      saveAreaRef.focus();
      e.preventDefault();
    } else if (e.key === "Enter" && e.shiftKey) {
      const openBehavior = getSettings("openButtonBehavior");
      sendOpenMessage(selectedSessionId, openBehavior);
    }
  };

  componentDidUpdate() {
    const { filterValue, sortValue } = this.props;
    const { prevFilterValue, prevSortValue } = this;

    if (filterValue !== prevFilterValue || sortValue !== prevSortValue) this.scrollToTop();
    this.prevFilterValue = filterValue;
    this.prevSortValue = sortValue;
  }

  render() {
    const {
      sessions,
      selectedSessionId,
      filterValue,
      sortValue,
      searchWord,
      isInitSessions,
      removeSession,
      error,
      sessionsAreaRef
    } = this.props;

    const sortedSessions = getSortedSessions(sessions, sortValue, filterValue, searchWord);

    const order = sortedSessions.findIndex(sortedSession => sortedSession.id === selectedSessionId);
    const maxOrder = sortedSessions.length - 1;
    this.nextSession = sortedSessions[order < maxOrder ? order + 1 : maxOrder];
    this.prevSession = sortedSessions[order > 0 ? order - 1 : 0];

    const shouldShowNoSessionMessage =
      isInitSessions &&
      sortedSessions.length === 0 &&
      filterValue == "_displayAll" &&
      searchWord === "" &&
      !error.isError;
    const shouldShowNoResultMessage =
      isInitSessions && sortedSessions.length === 0 && searchWord !== "" && !error.isError;

    return (
      <div
        id="sessionsArea"
        ref={sessionsAreaRef}
        role="toolbar"
        tabIndex="0"
        onKeyDown={this.handleKeyDown}
      >
        {sessions.map(
          session =>
            matchesFilter(session.tag, filterValue) &&
            matchesSearch(session.name, searchWord) && (
              <SessionItem
                session={session}
                isSelected={selectedSessionId === session.id}
                order={sortedSessions.findIndex(sortedSession => sortedSession.id === session.id)}
                searchWord={searchWord}
                removeSession={removeSession}
                handleSessionSelect={this.handleSessionSelect}
                key={session.id}
              />
            )
        )}
        {shouldShowNoSessionMessage && (
          <div className="noSession">
            <p>{browser.i18n.getMessage("noSessionLabel")}</p>
            <p>{browser.i18n.getMessage("letsSaveLabel")}</p>
          </div>
        )}
        {shouldShowNoResultMessage && (
          <div className="noSession">
            <p>{browser.i18n.getMessage("noResultLabel")}</p>
          </div>
        )}
      </div>
    );
  }
}
