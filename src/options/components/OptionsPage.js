import React from "react";
import { HashRouter } from "react-router-dom";
import { initSettings, getSettings } from "../../settings/settings";
import SideBar from "./SideBar";
import ContentsArea from "./ContentsArea";
import ScrollToTop from "./ScrollToTop";
import "../styles/OptionsPage.scss";

const setupTheme = async () => {
  await initSettings();
  document.body.dataset.theme = getSettings("theme");

  browser.storage.onChanged.addListener((changes) => {
    if (changes.Settings.newValue.theme === changes.Settings.oldValue.theme) return;

    document.body.dataset.theme = changes.Settings.newValue.theme;
    document.body.classList.add("transition");
    setTimeout(() => document.body.classList.remove("transition"), 1000);
  });
};

export default () => {
  setupTheme();
  return (
    <HashRouter hashType="noslash">
      <ScrollToTop>
        <div className="optionsPage">
          <SideBar />
          <ContentsArea />
        </div>
      </ScrollToTop>
    </HashRouter>
  );
};
