import React, { Component } from "react";
import browser from "webextension-polyfill";
import queryString from "query-string";
import { updateLogLevel, overWriteLogLevel } from "src/common/log";
import { initSettings, resetAllSettings, handleSettingsChange, exportSettings, importSettings, getSettings, setSettings } from "src/settings/settings";
import defaultSettings from "src/settings/defaultSettings";
import CategoryContainer from "./CategoryContainer";
import OptionContainer from "./OptionContainer";
import BackupSetupModal from "./BackupSetupModal";

export default class SettingsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isInit: false,
      shouldShowBackupModal: false
    };
    this.sectionTarget = "";
    this.init();
  }

  async init() {
    await initSettings();
    overWriteLogLevel();
    updateLogLevel();
    this.sectionTarget = this.getSectionFromProps(this.props);
    const shouldShowBackupModal = getSettings("shouldPromptBackupFolder") !== false;
    this.setState({ isInit: true, shouldShowBackupModal });
    this.scrollToSection();
    browser.storage.local.onChanged.addListener(handleSettingsChange);
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.isInit && this.state.isInit) {
      this.sectionTarget = this.getSectionFromProps(this.props);
      this.scrollToSection();
    }

    if (this.state.isInit && prevProps.location?.search !== this.props.location?.search) {
      this.sectionTarget = this.getSectionFromProps(this.props);
      this.scrollToSection();
    }
  }

  getSectionFromProps = props => {
    const query = queryString.parse(props?.location?.search || "");
    if (query.section) return query.section;
    return getSettings("pendingOptionsSection") || "";
  };

  scrollToSection = () => {
    if (!this.sectionTarget) return;
    requestAnimationFrame(() => {
      const selector = `[data-settings-section="${this.sectionTarget}"]`;
      const element = document.querySelector(selector);
      if (element && typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setSettings("pendingOptionsSection", "");
      }
    });
  };

  render() {
    const settingsContent = (
      <ul>
        {defaultSettings.map((category, index) => (
          <CategoryContainer {...category} key={index} />
        ))}
        <CategoryContainer {...additionalCategory} />
      </ul>
    );

    return (
      <div>
        {this.state.shouldShowBackupModal && (
          <BackupSetupModal onClose={() => this.setState({ shouldShowBackupModal: false })} />
        )}
        <p className="contentTitle">{browser.i18n.getMessage("settingsLabel")}</p>
        <hr />
        {this.state.isInit ? settingsContent : ""}
      </div>
    );
  }
}

const additionalCategory = {
  category: "",
  elements: [
    {
      id: "importSettings",
      title: "importSettingsLabel",
      captions: ["importSettingsCaptionLabel"],
      type: "file",
      accept: ".json",
      value: "importSaveButtonLabel",
      onChange: importSettings
    },
    {
      id: "exportSettings",
      title: "exportSettingsLabel",
      captions: ["exportSettingsCaptionLabel"],
      type: "button",
      value: "exportButtonLabel",
      onClick: async () => {
        await exportSettings();
      }
    },
    {
      id: "resetSettings",
      title: "resetSettingsLabel",
      captions: ["resetSettingsCaptionLabel"],
      type: "button",
      value: "resetSettingsButtonLabel",
      onClick: async () => {
        await resetAllSettings();
        location.reload(true);
      }
    }
  ]
};
