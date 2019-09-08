import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import PlusIcon from "../icons/plus.svg";
import "../styles/Modal.scss";

export default class Modal extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  focusModal = () => {
    setTimeout(() => {
      const modal = ReactDOM.findDOMNode(this.refs.modal);
      const closeButton = modal.querySelector("button");
      const focusElementInContent = modal
        .querySelector(".modalContent")
        .querySelector("input, button, a");
      if (focusElementInContent) focusElementInContent.focus();
      else closeButton.focus();
    }, 100);
  };

  loopFocus = e => {
    const isNextFocus = e.key === "Tab" && !e.shiftKey;
    const isPrevFocus = e.key === "Tab" && e.shiftKey;
    if (!isNextFocus && !isPrevFocus) return;

    const modal = ReactDOM.findDOMNode(this.refs.modal);
    const focusElements = modal.querySelectorAll("input, button, a");
    const firstElement = focusElements[0];
    const lastElement = focusElements[focusElements.length - 1];

    if (isNextFocus && document.activeElement == lastElement) {
      e.preventDefault();
      firstElement.focus();
    } else if (isPrevFocus && document.activeElement == firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
  };

  stopPropagation = e => {
    e.stopPropagation();
  };

  componentDidUpdate() {
    if (this.shouldUpdate && this.props.modal.isOpen) {
      this.shouldUpdate = false;
      this.focusModal();
    } else if (!this.props.modal.isOpen) {
      this.shouldUpdate = true;
    }
  }

  render() {
    const { modal, closeModal } = this.props;
    return (
      <div
        id="modalBackground"
        className={modal.isOpen ? "isOpen" : "isClose"}
        onClick={closeModal}
      >
        <div
          id="modal"
          ref="modal"
          role="dialog"
          onKeyDown={this.loopFocus}
          onClick={this.stopPropagation}
        >
          <div className="modalHeader">
            <div className="modalTitle">{modal.title}</div>
            <button
              className="closeModalButton"
              title={browser.i18n.getMessage("closeLabel")}
              onClick={closeModal}
              autoFocus
            >
              <PlusIcon />
            </button>
          </div>
          <hr />
          <div className="modalContent">{modal.content}</div>
        </div>
      </div>
    );
  }
}
