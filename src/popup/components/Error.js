import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import React from "react";
import openUrl from "../actions/openUrl";
import "../styles/Error.scss";

const openIndexedDBWiki = () => {
  const url =
    browserInfo().name === "Chrome"
      ? "https://github.com/sienori/Tab-Session-Manager/wiki/IndexedDB-Error-for-Chrome"
      : "https://github.com/sienori/Tab-Session-Manager/wiki/IndexedDB-Error";
  openUrl(url);
};

const errorContent = {
  noConnection: (
    <div>
      <b>{browser.i18n.getMessage("errorLabel")}</b>
      <br />
      {browser.i18n.getMessage("noConnectionErrorLabel")}
    </div>
  ),
  indexedDB: (
    <div>
      <b>{browser.i18n.getMessage("errorLabel")}</b>
      <br />
      {browser.i18n.getMessage("indexedDBErrorLabel")}
      <br />
      <a onClick={openIndexedDBWiki}>{browser.i18n.getMessage("howToSolveLabel")}</a>
    </div>
  )
};

export default props => {
  if (!props.error.isError) return null;
  return <div className="error">{errorContent[props.error.type]}</div>;
};
