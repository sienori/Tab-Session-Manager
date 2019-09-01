import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import PlusIcon from "../icons/plus.svg";
import "../styles/modal.scss";

export default class Modal extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  focusModal = () => {
    const modal = ReactDOM.findDOMNode(this.refs.modal);
    modal.querySelector("button").focus();
  };

  loopFocus = e => {
    const isNextFocus = e.key === "Tab" && !e.shiftKey;
    const isPrevFocus = e.key === "Tab" && e.shiftKey;
    if (!isNextFocus && !isPrevFocus) return;

    const modal = ReactDOM.findDOMNode(this.refs.modal);
    const buttons = modal.querySelectorAll("button");
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    if (isNextFocus && document.activeElement == lastButton) {
      e.preventDefault();
      firstButton.focus();
    } else if (isPrevFocus && document.activeElement == firstButton) {
      e.preventDefault();
      lastButton.focus();
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
      modal.isOpen && (
        <div id="modalBackground" onClick={closeModal}>
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
              >
                <PlusIcon />
              </button>
            </div>
            <hr />
            {modal.content}
          </div>
        </div>
      )
    );
  }
}
