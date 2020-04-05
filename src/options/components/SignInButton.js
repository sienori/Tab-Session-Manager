import React, { Component } from "react";
import browser from "webextension-polyfill";
import { getSettings } from "src/settings/settings";

export default class SignInButton extends Component {
  constructor(props) {
    super(props);
    const signdInEmail = getSettings("signedInEmail");
    this.state = { shouldSignIn: !signdInEmail };
  }

  handleSignInClick = async () => {
    const permissions = { origins: ["https://www.googleapis.com/"] };
    const isGranted = await browser.permissions.request(permissions);
    if (!isGranted) return;

    const isSucceeded = await browser.runtime.sendMessage({
      message: "signInGoogle"
    });
    if (isSucceeded) this.setState({ shouldSignIn: !this.state.shouldSignIn });
  };

  handleSignOutClick = async () => {
    const isSucceeded = await browser.runtime.sendMessage({
      message: "signOutGoogle"
    });
    if (isSucceeded) this.setState({ shouldSignIn: !this.state.shouldSignIn });
  };

  render() {
    const signInButton = (
      <a
        style={{ cursor: "pointer" }}
        onClick={this.handleSignInClick}
        title={browser.i18n.getMessage("signInLabel")}
      >
        <img src="/icons/google_signin.png" alt={browser.i18n.getMessage("signInLabel")} />
      </a>
    );
    const signOutButton = (
      <input
        type="button"
        value={browser.i18n.getMessage("signOutLabel")}
        onClick={this.handleSignOutClick}
      />
    );

    return this.state.shouldSignIn ? signInButton : signOutButton;
  }
}
