import React, { Component } from "react";
import PlusIcon from "../icons/plus.svg";
import "../styles/Notification.scss";

export default class Notification extends Component {
  handleButtonClick = () => {
    this.props.notification.onClick();
    this.props.handleClose();
  };

  componentWillReceiveProps(nextProps) {
    clearTimeout(this.timer);
    if (!nextProps.notification.isOpen) return;
    const duration = nextProps.notification.duration || 5000;
    this.timer = setTimeout(() => {
      this.props.handleClose();
    }, duration);
  }

  render() {
    const { notification, handleClose } = this.props;
    const shouldShowButton = notification.onClick && notification.buttonLabel;
    return (
      <div id="notificationArea">
        <div
          id="notification"
          className={notification.isOpen ? "isOpen" : "isClose"}
          data-type={notification.type}
        >
          <span className="message">{notification.message}</span>
          <div className="buttons">
            {shouldShowButton && (
              <button onClick={this.handleButtonClick}>{notification.buttonLabel}</button>
            )}
            <button className="closeButton" onClick={handleClose}>
              <PlusIcon />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
