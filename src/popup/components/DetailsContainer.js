import React from "react";
import browser from "webextension-polyfill";
import openUrl from "../actions/openUrl";
import { sendOpenMessage, deleteWindow, deleteTab } from "../actions/controlSessions";
import "../styles/DetailsContainer.scss";
import PlusIcon from "../icons/plus.svg";

export default props => {
  const { session, isOpenedDetails } = props;

  let winNumber = 1;
  return (
    <div className={`detailsContainer ${isOpenedDetails ? "" : "isClose"}`}>
      {session.windows ? (
        <ul>
          {Object.keys(session.windows).map(windowId => (
            <li className="windowList" key={windowId}>
              <div className="window">
                <button
                  className="itemTitleButton"
                  onClick={() => {
                    sendOpenMessage(session.id, "openInNewWindow", windowId);
                  }}
                  title={browser.i18n.getMessage("open")}
                >
                  <img src="/icons/window.png" />
                  <span>{`${browser.i18n.getMessage("windowLabel")} ${winNumber++}`}</span>
                </button>
                <button
                  className="deleteWindowButton"
                  onClick={() => {
                    deleteWindow(session, windowId);
                  }}
                  title={browser.i18n.getMessage("remove")}
                >
                  <PlusIcon />
                </button>
              </div>
              <ul className="tabs">
                {Object.keys(session.windows[windowId]).map(tabId => (
                  <li
                    className="tab"
                    style={{ order: session.windows[windowId][tabId].index }}
                    key={tabId}
                  >
                    <button
                      className="itemTitleButton"
                      onClick={e => {
                        openUrl(
                          session.windows[windowId][tabId].url,
                          session.windows[windowId][tabId].title
                        );
                      }}
                      title={`${session.windows[windowId][tabId].title}\n${
                        session.windows[windowId][tabId].url
                      }`}
                    >
                      <img
                        src={session.windows[windowId][tabId].favIconUrl || "/icons/favicon.png"}
                        onError={e => {
                          e.target.src = "/icons/favicon.png";
                        }}
                      />
                      <span>{session.windows[windowId][tabId].title}</span>
                    </button>
                    <button
                      className="deleteTabButton"
                      onClick={() => {
                        deleteTab(session, windowId, tabId);
                      }}
                      title={browser.i18n.getMessage("remove")}
                    >
                      <PlusIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        ""
      )}
    </div>
  );
};
