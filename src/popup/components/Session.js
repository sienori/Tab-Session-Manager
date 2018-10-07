import React, { Component } from "react";
import browser from "webextension-polyfill";
import moment from "moment";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage } from "../actions/controlSessions";
import NameContainer from "./NameContainer";
import SessionMenuItems from "./SessionMenuItems";
import TagsContainer from "./TagsContainer";
import DetailsContainer from "./DetailsContainer";
import MenuIcon from "../icons/menu.svg";
import "../styles/Session.scss";

export default class Session extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpenedDetails: false
    };
  }

  handleOpenDetailClick = async () => {
    const isOpenedDetails = !this.state.isOpenedDetails;
    if (!this.props.session.windows) await this.props.getSessionDetail(this.props.session.id);
    setTimeout(() => {
      this.setState({
        isOpenedDetails: isOpenedDetails
      });
    }, 10);
  };

  handleMenuClick = e => {
    this.props.openMenu(e.pageX, e.pageY, <SessionMenuItems session={this.props.session} />);
  };

  render() {
    const { session, removeSession, order, searchWord } = this.props;
    const windowLabel = browser.i18n.getMessage("windowLabel");
    const windowsLabel = browser.i18n.getMessage("windowsLabel");
    const tabLabel = browser.i18n.getMessage("tabLabel");
    const tabsLabel = browser.i18n.getMessage("tabsLabel");

    const detailText = `${session.windowsNumber} ${
      session.windowsNumber == 1 ? windowLabel : windowsLabel
    } - ${session.tabsNumber} ${session.tabsNumber == 1 ? tabLabel : tabsLabel}`;

    return (
      <div className="session" style={{ order: order }}>
        <div className="line">
          <NameContainer session={session} searchWord={searchWord} />
          <button
            className="menuButton"
            onClick={this.handleMenuClick}
            title={browser.i18n.getMessage("menuLabel")}
          >
            <MenuIcon />
          </button>
        </div>
        <div className="line">
          <TagsContainer session={session} />
          <div className="dateContainer">
            {moment(session.date).format(getSettings("dateFormat"))}
          </div>
        </div>
        <div className="line">
          <div className="buttonsContainer">
            <button
              onClick={this.handleOpenDetailClick}
              title={browser.i18n.getMessage("detailLabel")}
            >
              {detailText}
            </button>
          </div>
          <div className="buttonsContainer">
            <button
              className="open"
              onClick={() => {
                sendOpenMessage(session.id, "default");
              }}
            >
              <span>{browser.i18n.getMessage("open")}</span>
            </button>
            <button
              className="remove"
              onClick={() => {
                removeSession(session.id);
              }}
            >
              <span>{browser.i18n.getMessage("remove")}</span>
            </button>
          </div>
        </div>
        <DetailsContainer isOpenedDetails={this.state.isOpenedDetails} session={session} />
      </div>
    );
  }
}
