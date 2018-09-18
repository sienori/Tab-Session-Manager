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
    this.timer = setTimeout(() => {
      this.props.handleClose();
    }, 5000);
  }

  render() {
    const { notification, handleClose } = this.props;
    return (
      <div id="notification" className={notification.isOpen ? "isOpen" : "isClose"}>
        <span className="message">{notification.message}</span>
        <div className="buttons">
          <button onClick={this.handleButtonClick}>{notification.buttonLabel}</button>
          <button className="closeButton" onClick={handleClose}>
            <PlusIcon />
          </button>
        </div>
      </div>
    );
  }
}
