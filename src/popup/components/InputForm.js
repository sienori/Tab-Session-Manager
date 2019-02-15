import React, { Component } from "react";
import ReactDOM from "react-dom";
import CheckIcon from "../icons/check.svg";
import "../styles/InputForm.scss";

export default class InputForm extends Component {
  handleSubmit = e => {
    e.preventDefault();
    this.props.onSubmit(e.target[0].value);
    e.target[0].value = "";
  };

  focusInput() {
    if (!this.props.isFocus) return;
    const input = ReactDOM.findDOMNode(this.refs.input);
    input.focus();
  }

  componentDidMount() {
    this.focusInput();
  }

  render() {
    return (
      <form className="inputForm" onSubmit={this.handleSubmit} autoComplete="off">
        <input
          type="text"
          ref="input"
          spellCheck={false}
          defaultValue={this.props.defaultValue || ""}
          placeholder={this.props.placeholder || ""}
        />
        <button
          className="submitButton"
          type="submit"
          title={browser.i18n.getMessage("addTagLabel")}
        >
          <CheckIcon />
        </button>
      </form>
    );
  }
}
