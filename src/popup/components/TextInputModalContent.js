import React, { Component } from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import "../styles/textInputModalContent.scss";

export default class TextInputModalContent extends Component {
  constructor(props) {
    super(props);
    this.inputText = "";
  }

  handleSubmit = () => {
    this.props.onSave(this.inputText);
    this.props.closeModal();
  };

  handleChange = e => {
    this.inputText = e.target.value;
  };

  componentDidMount = () => {
    setTimeout(() => {
      const input = ReactDOM.findDOMNode(this.refs.input);
      if (input) input.focus();
    }, 100);
  };

  render() {
    const { closeModal, placeholder, defaultText } = this.props;
    return (
      <div className="textInputModalContent">
        <form onSubmit={this.handleSubmit}>
          <input
            type="text"
            placeholder={placeholder || ""}
            defaultValue={defaultText || ""}
            onChange={this.handleChange}
            ref="input"
          />
          <div className="buttons">
            <button type="button" onClick={closeModal}>
              {browser.i18n.getMessage("cancelLabel")}
            </button>
            <button type="submit" className="saveButton">
              {browser.i18n.getMessage("saveLabel")}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
