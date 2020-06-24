import React, { Component } from "react";
import browser from "webextension-polyfill";
import "../styles/SearchBar.scss";
import SearchIcon from "../icons/search.svg";
import PlusIcon from "../icons/plus.svg";

export default class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchWord: ""
    };
  }
  handleChange = e => {
    this.setState({ searchWord: e.target.value });
    this.props.changeSearchWord(e.target.value);
  };

  handleCrearButtonClick = () => {
    this.setState({ searchWord: "" });
    this.props.changeSearchWord("");
  };

  handleSearchButtonClick = () => {
    this.props.changeSearchWord(this.state.searchWord);
  };

  render() {
    return (
      <div id="searchBar">
        <button
          className="searchButton"
          onClick={this.handleSearchButtonClick}
          title={browser.i18n.getMessage("search")}
        >
          <SearchIcon />
        </button>
        <div className="inputForm">
          <input
            type="text"
            value={this.state.searchWord}
            spellCheck={false}
            placeholder={browser.i18n.getMessage("searchBarPlaceholder")}
            onChange={this.handleChange}
            autoFocus={true}
          />
        </div>
        {this.state.searchWord !== "" && (
          <button
            className="clearButton"
            onClick={this.handleCrearButtonClick}
            title={browser.i18n.getMessage("clearSearch")}
          >
            <PlusIcon />
          </button>
        )}
      </div>
    );
  }
}
