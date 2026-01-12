import React from "react";
import browser from "webextension-polyfill";
import queryString from "query-string";
import OptionsContainer from "./OptionContainer";
import manifest from "src/manifest.json";

export default props => {
  const query = queryString.parse(props.location.search);

  const extensionVersion = manifest.version;
  const releaseLink = "https://github.com/JustNotesa/TabBoard-Fork-of-TabSessionManager/releases";
  const repoLink = "https://github.com/JustNotesa/TabBoard-Fork-of-TabSessionManager";

  return (
    <div className="contentsArea">
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
        captions={["forkSupportNotice"]}
        type={"none"}
      />
      <OptionsContainer
        title={""}
        captions={["forkContactNotice"]}
        type={"none"}
      />
      <hr />
      <OptionsContainer
        title={"sponsorsLabel"}
        captions={["forkSponsorNotice"]}
        type={"none"}
      />
      <hr />
      <OptionsContainer
        title={""}
        captions={["forkLinksNotice"]}
        type={"none"}
      />
    </div>
  );
};
