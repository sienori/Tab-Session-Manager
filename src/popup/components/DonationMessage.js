import React from "react";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import "../styles/donationMessage.scss";

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
          <img
            src="https://c5.patreon.com/external/logo/become_a_patron_button.png"
            alt="Patreon"
          />
        </a>
        <a href={paypalUrl} target="_blank">
          <img
            src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-medium.png"
            alt="Paypal"
          />
        </a>
      </div>
    </div>
  );
};
