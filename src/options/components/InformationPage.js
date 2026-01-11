import React, { useState, useEffect } from "react";
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

  const [sponsorsHeihgt, setSponsorsHeight] = useState();

  useEffect(() => {
    const setHeight = e => {
      if (e.data[0] !== "setSponsorsHeight") return;
      setSponsorsHeight(e.data[1]);
    };
    window.addEventListener("message", setHeight);
    return () => window.removeEventListener("message", setHeight);
  });

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
          <div>
            <a href={patreonLink} target="_blank">
              <img
                src="/icons/patreonButton.png"
                alt="Patreon"
                style={{ height: 44, marginRight: 20 }}
              />
            </a>
            <a href={paypalLink} target="_blank">
              <img src="/icons/paypalButton.png" alt="Paypal" />
            </a>
          </div>
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
        title={"sponsorsLabel"}
        captions={[""]}
        type={"none"}
        extraCaption={
          <iframe
            src="https://tab-session-manager.sienori.com/sponsors.html"
            style={{ height: sponsorsHeihgt, marginTop: 10 }}
          />
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
                href="https://addons.mozilla.org/firefox/addon/tab-session-manager/?src=optionpage"
                target="_blank"
              >
                {browser.i18n.getMessage("firefoxLabel")}
              </a>
              <span>　</span>
              <a
                href="https://chrome.google.com/webstore/detail/tab-session-manager/iaiomicjabeggjcfkbimgmglanimpnae"
                target="_blank"
              >
                {browser.i18n.getMessage("chromeLabel")}
              </a>
              <span>　</span>
              <a
                href="https://microsoftedge.microsoft.com/addons/detail/tab-session-manager/jkjjclfiflhpjangefhgfjhgfbhajadk"
                target="_blank"
              >
                {browser.i18n.getMessage("edgeLabel")}
              </a>
              <span>　</span>
              <a href="https://github.com/sienori/Tab-Session-Manager" target="_blank">
                GitHub
              </a>
              <span>　</span>
              <a href="https://tab-session-manager.sienori.com/privacy-policy" target="_blank">
                {browser.i18n.getMessage("privacyPolicyLabel")}
              </a>
            </p>
          </div>
        }
      />
    </div>
  );
};
