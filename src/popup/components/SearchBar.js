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

  handleKeyDown = e => {
    if (e.key === "Enter") {
      this.props.changeSearchWord(e.target.value, true);
    }
  };

  handleCrearButtonClick = () => {
    this.setState({ searchWord: "" });
    this.props.toggleSearchBar(false);
  };

  componentDidMount = () => {
    this.props.searchBarRef.current.focus();
  };

  render() {
    return (
      <div id="searchBar">
        <div className="searchIcon">
          <SearchIcon />
        </div>
        <div className="inputForm">
          <input
            type="text"
            value={this.state.searchWord}
            spellCheck={false}
            placeholder={browser.i18n.getMessage("searchBarPlaceholder")}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}
            ref={this.props.searchBarRef}
          />
        </div>

        <button
          className="clearButton"
          onClick={this.handleCrearButtonClick}
          title={browser.i18n.getMessage("clearSearch")}
        >
          <PlusIcon />
        </button>
      </div>
    );
  }
}
