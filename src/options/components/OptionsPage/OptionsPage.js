import React from "react";
import { HashRouter } from "react-router-dom";
import SideBar from "../SideBar/SideBar";
import ContentsArea from "../ContentsArea/ContentsArea";
import "./OptionsPage.scss";
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
