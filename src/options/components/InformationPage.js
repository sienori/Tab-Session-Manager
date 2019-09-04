import React from "react";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import queryString from "query-string";
import OptionsContainer from "./OptionContainer";
import manifest from "src/manifest.json";

export default props => {
  const query = queryString.parse(props.location.search);

  const extensionVersion = manifest.version;
  const isChrome = browserInfo().name == "Chrome";
  const paypalLink = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&no_shipping=1&business=sienori.firefox@gmail.com&item_name=Tab Session Manager ${
    isChrome ? "for Chrome " : ""
  }- Donation`;
  const patreonLink = "https://www.patreon.com/sienori";
  const email = `sienori.firefox+tsm${isChrome ? "fc" : ""}@gmail.com`;

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
            <a href="https://github.com/sienori/Tab-Session-Manager/releases" target="_blank">
              Version {extensionVersion}
            </a>
            <span>　</span>
            <a
              href="https://github.com/sienori/Tab-Session-Manager/blob/master/BACKERS.md"
              target="_blank"
            >
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
      <OptionsContainer title={"donationLabel"} captions={["donationCaptionLabel"]} type={"none"} />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <a href={patreonLink} target="_blank">
            <img
              src="https://c5.patreon.com/external/logo/become_a_patron_button.png"
              alt="Patreon"
            />
          </a>
        }
      />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <a href={paypalLink} target="_blank">
            <img
              src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-medium.png"
              alt="Paypal"
            />
          </a>
        }
      />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <div>
            <p className="caption">
              <a className="amazonUrl" href={browser.i18n.getMessage("amazonUrl")} target="_blank">
                {browser.i18n.getMessage("amazonTitleLabel")}
              </a>
            </p>
            <p className="caption">email: {email}</p>
          </div>
        }
      />
      <hr />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <div>
            <p>
              <a
                href={
                  browserInfo().name === "Firefox"
                    ? "https://addons.mozilla.org/firefox/addon/tab-session-manager/?src=optionpage"
                    : "https://chrome.google.com/webstore/detail/tab-session-manager/iaiomicjabeggjcfkbimgmglanimpnae"
                }
                target="_blank"
              >
                {browserInfo().name === "Firefox"
                  ? browser.i18n.getMessage("addonPageLabel")
                  : browser.i18n.getMessage("extensionPageLabel")}
              </a>
              <span>　</span>
              <a href="https://github.com/sienori/Tab-Session-Manager" target="_blank">
                GitHub
              </a>
            </p>
          </div>
        }
      />
    </div>
  );
};
