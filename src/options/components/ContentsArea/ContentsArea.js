import React from "react";
import { Route, Switch } from "react-router-dom";
import SettingsPage from "../SettingsPage/SettingsPage";
import SessionsPage from "../SessionsPage/SessionsPage";
import InformationPage from "../InformationPage/InformationPage";
import "./ContentsArea.scss";

export default () => (
  <div className="contentsArea">
    <Switch>
      <Route path="/settings" component={SettingsPage} />
      <Route path="/sessions" component={SessionsPage} />
      <Route path="/information" component={InformationPage} />
      <Route component={SettingsPage} />
    </Switch>
  </div>
);
