import React from "react";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import "../styles/DonationMessage.scss";

export default props => {
  const isChrome = browserInfo().name == "Chrome";
  const patreonUrl = "https://www.patreon.com/sienori";
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&no_shipping=1&business=sienori.firefox@gmail.com&item_name=Tab Session Manager ${
    isChrome ? "for Chrome " : ""
  }- Donation`;

  return (
    <div className="donationMessage">
      <p>{browser.i18n.getMessage("donationCaptionLabel").replace(/<br>/g, "\n")}</p>
      <div className="buttons">
        <a href={patreonUrl} target="_blank">
          <img src="/icons/patreonButton.png" alt="Patreon" />
        </a>
        <a href={paypalUrl} target="_blank">
          <img src="/icons/paypalButton.png" alt="Paypal" />
        </a>
      </div>
    </div>
  );
};
