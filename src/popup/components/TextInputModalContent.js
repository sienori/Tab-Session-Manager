import React, { Component } from "react";
import browser from "webextension-polyfill";
import "../styles/TextInputModalContent.scss";

export default class TextInputModalContent extends Component {
  constructor(props) {
    super(props);
    this.state = { inputText: "" };
  }

  handleSubmit = e => {
    this.props.onSave(this.state.inputText);
    this.props.closeModal();
    e.preventDefault();
  };

  handleChange = e => {
    this.setState({ inputText: e.target.value });
  };

  initInput = defaultText => {
    this.setState({ inputText: defaultText || "" });
  };

  componentDidMount() {
    this.initInput(this.props.defaultText);
  }

  componentWillReceiveProps(nextProps) {
    this.initInput(nextProps.defaultText);
  }

  render() {
    const { closeModal, placeholder, defaultText } = this.props;
    return (
      <div className="textInputModalContent">
        <form onSubmit={this.handleSubmit}>
          <input
            type="text"
            placeholder={placeholder || ""}
            value={this.state.inputText}
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
