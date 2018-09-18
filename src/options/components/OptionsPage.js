import React from "react";
import { HashRouter } from "react-router-dom";
import SideBar from "./SideBar";
import ContentsArea from "./ContentsArea";
import "../styles/OptionsPage.scss";

export default () => {
  return (
    <HashRouter hashType="noslash">
      <div className="optionsPage">
        <SideBar />
        <ContentsArea />
      </div>
    </HashRouter>
  );
};
