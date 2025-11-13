import React from "react";
import browser from "webextension-polyfill";
import queryString from "query-string";
import OptionsContainer from "./OptionContainer";
import manifest from "src/manifest.json";

export default props => {
  const query = queryString.parse(props.location.search);

  const extensionVersion = manifest.version;
  const releaseLink = "https://github.com/maximilianbottcher/tab-session-manager-gridview/releases";
  const repoLink = "https://github.com/maximilianbottcher/tab-session-manager-gridview";

  return (
    <div>
      <p className="contentTitle">{browser.i18n.getMessage("informationLabel")}</p>
      <hr />
      <OptionsContainer
        title={"extName"}
        captions={[""]}
        type={"none"}
        updated={query.action === "updated"}
        extraCaption={
          <p className="caption">
            <a href={releaseLink} target="_blank" rel="noreferrer">
              Version {extensionVersion}
            </a>
            <span>　</span>
            <a href={repoLink} target="_blank" rel="noreferrer">
              {browser.i18n.getMessage("backersLabel")}
            </a>
          </p>
        }
      />

      <OptionsContainer
        title={"licenseLabel"}
        captions={["Mozilla Public License, Version. 2.0"]}
        useRawCaptions={true}
        type={"none"}
      />
      <hr />
      <OptionsContainer
        title={"donationLabel"}
        captions={["donationCaptionLabel"]}
        type={"none"}
      />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <p className="caption">{browser.i18n.getMessage("forkSupportNotice")}</p>
        }
      />
      <OptionsContainer
        title={""}
        captions={["forkContactNotice"]}
        type={"none"}
      />
      <OptionsContainer
        title={"sponsorsLabel"}
        captions={["forkSponsorNotice"]}
        type={"none"}
      />
      <OptionsContainer
        title={""}
        captions={["forkLinksNotice"]}
        type={"none"}
        extraCaption={
          <div>
            <p>
              <a
                href="https://addons.mozilla.org/firefox/addon/tab-session-manager/?src=optionpage"
                target="_blank"
                rel="noreferrer"
              >
                {browser.i18n.getMessage("firefoxLabel")}
              </a>
              <span>　</span>
              <a
                href="https://chrome.google.com/webstore/detail/tab-session-manager/iaiomicjabeggjcfkbimgmglanimpnae"
                target="_blank"
                rel="noreferrer"
              >
                {browser.i18n.getMessage("chromeLabel")}
              </a>
              <span>　</span>
              <a
                href="https://microsoftedge.microsoft.com/addons/detail/tab-session-manager/jkjjclfiflhpjangefhgfjhgfbhajadk"
                target="_blank"
                rel="noreferrer"
              >
                {browser.i18n.getMessage("edgeLabel")}
              </a>
              <span>　</span>
              <a href="https://github.com/sienori/Tab-Session-Manager" target="_blank" rel="noreferrer">
                GitHub
              </a>
              <span>　</span>
              <a href="https://tab-session-manager.sienori.com/privacy-policy" target="_blank" rel="noreferrer">
                {browser.i18n.getMessage("privacyPolicyLabel")}
              </a>
            </p>
          </div>
        }
      />
    </div>
  );
};
