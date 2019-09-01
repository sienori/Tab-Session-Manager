import React, { Component } from "react";
import PlusIcon from "../icons/plus.svg";
import "../styles/Notification.scss";

export default class Notification extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      notification: {
        message: "",
        type: "info",
        buttonLabel: "",
        onClick: () => {}
      }
    };
  }

  openNotification = notification => {
    this.setState({ isOpen: true, notification: notification });

    const duration = notification.duration || 10000;
    this.timer = setTimeout(() => {
      this.closeNotification();
    }, duration);
  };

  closeNotification = () => {
    this.setState({ isOpen: false });
  };

  handleButtonClick = () => {
    this.props.notification.onClick();
    this.closeNotification();
  };

  shouldComponentUpdate(nextProps, nextState) {
    return (
      nextProps.notification.key !== this.props.notification.key ||
      nextState.isOpen !== this.state.isOpen
    );
  }

  componentWillReceiveProps(nextProps) {
    const notification = nextProps.notification;
    if (notification.key === this.props.notification.key) return;
    clearTimeout(this.timer);

    if (this.state.isOpen) {
      this.closeNotification();
      setTimeout(() => {
        this.openNotification(notification);
      }, 200);
    } else {
      this.openNotification(notification);
    }
  }

  render() {
    const notification = this.state.notification;
    const shouldShowButton = notification.onClick && notification.buttonLabel;
    return (
      <div id="notificationArea">
        <div
          id="notification"
          className={this.state.isOpen ? "isOpen" : "isClose"}
          data-type={notification.type}
        >
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
      </div>
    );
  }
}
