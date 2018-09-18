import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import Session from "./Session";
import "../styles/sessionsArea.scss";

const shouldShowSession = (tags, filterValue) => {
  if (tags.includes("temp")) return false;
  switch (filterValue) {
    case "_displayAll":
      return true;
    case "_user":
      return !tags.includes("regular") && !tags.includes("winClose");
    case "_auto":
      return tags.includes("regular") || tags.includes("winClose");
    default:
      return tags.includes(filterValue);
  }
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

const getSortedSessions = (sessions, sortValue, filterValue) => {
  let sortedSessions = sessions.map(session => ({
    id: session.id,
    date: session.date,
    name: session.name,
    tag: session.tag
  }));
  sortedSessions = sortedSessions.filter(session => shouldShowSession(session.tag, filterValue));

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
    const sessionsArea = ReactDOM.findDOMNode(this.refs.sessionsArea);
    sessionsArea.scrollTo(0, 0);
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
      filterValue,
      sortValue,
      removeSession,
      getSessionDetail,
      openMenu,
      isInitSessions,
      error
    } = this.props;

    const sortedSessions = getSortedSessions(sessions, sortValue, filterValue);
    const shouldShowNoSessionMessage =
      isInitSessions &&
      sortedSessions.length === 0 &&
      filterValue == "_displayAll" &&
      !error.isError;

    return (
      <TransitionGroup id="sessionsArea" ref="sessionsArea">
        {sessions.map(
          session =>
            shouldShowSession(session.tag, filterValue) && (
              <CSSTransition classNames="fade" timeout={150} key={session.id}>
                <Session
                  session={session}
                  order={sortedSessions.findIndex(sortedSession => sortedSession.id === session.id)}
                  removeSession={removeSession}
                  getSessionDetail={getSessionDetail}
                  openMenu={openMenu}
                />
              </CSSTransition>
            )
        )}
        {shouldShowNoSessionMessage && (
          <CSSTransition classNames="fade" timeout={150}>
            <div className="noSession">
              <p>{browser.i18n.getMessage("noSessionLabel")}</p>
              <p>{browser.i18n.getMessage("letsSaveLabel")}</p>
            </div>
          </CSSTransition>
        )}
      </TransitionGroup>
    );
  }
}
