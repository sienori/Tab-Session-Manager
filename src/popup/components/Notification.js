import React, { Component } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import PlusIcon from "../icons/plus.svg";
import "../styles/Notification.scss";

export default class Notification extends Component {
  constructor(props) {
    super(props);
    this.state = {
      notification: {
        key: "0",
        message: "",
        type: "info",
        buttonLabel: "",
        duration: 10000,
        onClick: () => {}
      },
      isOpen: true
    };
  }

  closeNotification = () => {
    this.setState({ isOpen: false });
  };

  handleButtonClick = () => {
    this.state.notification.onClick();
    this.closeNotification();
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const shouldShowNotification =
      nextProps.notification.key && nextProps.notification.key !== prevState.notification.key;
    if (!shouldShowNotification) return null;

    return {
      notification: nextProps.notification,
      isOpen: true
    };
  }

  render() {
    const notification = this.state.notification;
    const shouldShowButton = notification.onClick && notification.buttonLabel;
    return (
      <div id="notificationArea">
        <TransitionGroup>
          {this.state.isOpen && (
            <CSSTransition key={notification.key} timeout={notification.duration || 10000}>
              <div className="notification" data-type={notification.type}>
                <span className="message">{notification.message}</span>
                <div className="buttons">
                  {shouldShowButton && (
                    <button onClick={this.handleButtonClick}>{notification.buttonLabel}</button>
                  )}
                  <button className="closeButton" onClick={this.closeNotification}>
                    <PlusIcon />
                  </button>
                </div>
              </div>
            </CSSTransition>
          )}
        </TransitionGroup>
      </div>
    );
  }
}
