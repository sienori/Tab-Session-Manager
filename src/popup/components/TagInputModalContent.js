import React, { Component } from "react";
import browser from "webextension-polyfill";
import Autosuggest from "react-autosuggest";
import "../styles/TextInputModalContent.scss";
import "../styles/TagInputModalContent.scss";

const getSuggestionValue = suggestion => suggestion;
const renderSuggestion = suggestion => <div>{suggestion}</div>;

export default class TextInputModalContent extends Component {
  constructor(props) {
    super(props);
    this.state = { suggestions: [], value: "" };
  }

  getSuggestions = value => {
    const { tagList } = this.props;
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? tagList
      : tagList.filter(tag => tag.toLowerCase().slice(0, inputLength) === inputValue);
  };

  onSuggestionsFetchRequested = ({ value }) => {
    const suggestions = this.getSuggestions(value);
    this.setState({
      suggestions: suggestions
    });
  };

  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: this.props.tagList
    });
  };

  handleSubmit = e => {
    this.props.onSave(this.state.value);
    this.props.closeModal();
    e.preventDefault();
  };

  handleChange = (e, { newValue }) => {
    this.setState({ value: newValue });
  };

  initInput = defaultText => {
    this.setState({ value: defaultText || "" });
  };

  componentDidMount() {
    this.initInput(this.props.defaultText);
  }

  componentWillReceiveProps(nextProps) {
    this.initInput(nextProps.defaultText);
  }

  render() {
    const { closeModal } = this.props;

    const inputProps = {
      placeholder: browser.i18n.getMessage("inputTagLabel"),
      value: this.state.value,
      onChange: this.handleChange
    };

    return (
      <div className="textInputModalContent">
        <form onSubmit={this.handleSubmit}>
          <Autosuggest
            suggestions={this.state.suggestions}
            getSuggestionValue={getSuggestionValue}
            onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested}
            shouldRenderSuggestions={() => true}
            renderSuggestion={renderSuggestion}
            inputProps={inputProps}
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
