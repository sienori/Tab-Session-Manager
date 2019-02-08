import React from "react";
import { Route, Switch } from "react-router-dom";
import browserInfo from "browser-info";
import SettingsPage from "./SettingsPage";
import SessionsPage from "./SessionsPage";
import KeyboardShortcutsPage from "./KeyboardShortcutsPage";
import InformationPage from "./InformationPage";
import "../styles/ContentsArea.scss";

const isValidShortcuts = browserInfo().name == "Firefox" && browserInfo().version >= 60;

export default () => (
  <div className="contentsArea">
    <Switch>
      <Route path="/settings" component={SettingsPage} />
      <Route path="/sessions" component={SessionsPage} />
      {isValidShortcuts && <Route path="/shortcuts" component={KeyboardShortcutsPage} />}
      <Route path="/information" component={InformationPage} />
      <Route component={SettingsPage} />
    </Switch>
  </div>
);
