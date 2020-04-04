import browser from "webextension-polyfill";
import axios from "axios";
import log from "loglevel";
import { clientId } from "../credentials";
import { getSettings, setSettings } from "../settings/settings";

const logDir = "background/cloudAuth";

export const signInGoogle = async () => {
  log.log(logDir, "signInGoogle()");
  try {
    const { accessToken, expiresIn } = await getAuthTokens();
    const email = await getEmail(accessToken);
    setSettings("signedInEmail", email);
    setSettings("accessToken", accessToken);
    setTokenExpiration(expiresIn);
    setSettings("lastSyncTime", 0);
    setSettings("removedQueue", []);
    return true;
  } catch {
    return false;
  }
};

export const signOutGoogle = async () => {
  log.log(logDir, "signOutGoogle()");
  try {
    const accessToken = getSettings("accessToken");
    revokeToken(accessToken);
    setSettings("signedInEmail", "");
    setSettings("accessToken", "");
    setSettings("lastSyncTime", 0);
    setSettings("removedQueue", []);
    return true;
  } catch {
    return false;
  }
};

const getAuthTokens = async (email = "") => {
  const scopes = [
    "https://www.googleapis.com/auth/drive.appfolder",
    "https://www.googleapis.com/auth/userinfo.email"
  ];
  const redirectUri = browser.identity.getRedirectURL();
  const authURL =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${clientId}` +
    "&response_type=token" +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes.join(" "))}` +
    `${email && `&login_hint=${email}`}`;

  const redirectedURL = await browser.identity
    .launchWebAuthFlow({
      interactive: true,
      url: authURL
    })
    .catch(e => {
      log.error(logDir, "getAuthTokens()", e);
    });

  const params = new URL(redirectedURL.replace("#", "?")).searchParams;
  if (params.has("error")) {
    log.error(logDir, "getAuthCode()", params.get("error"));
    throw new Error();
  }
  return {
    accessToken: params.get("access_token"),
    expiresIn: params.get("expires_in")
  };
};

const getEmail = async accessToken => {
  const url = "https://www.googleapis.com/oauth2/v1/userinfo" + `?access_token=${accessToken}`;
  const response = await axios.get(url);
  return response.data.email;
};

const setTokenExpiration = async expirationSec => {
  const currentTimeMs = Date.now();
  setSettings("tokenExpiration", currentTimeMs + expirationSec * 1000);
};

export const refreshAccessToken = async () => {
  const currentAccessToken = getSettings("accessToken");
  const tokenExpiration = getSettings("tokenExpiration");
  if (Date.now() < tokenExpiration) return currentAccessToken;

  log.log(logDir, "refreshAccessToken()");
  const email = getSettings("signedInEmail");
  const { accessToken, expiresIn } = await getAuthTokens(email);
  setSettings("accessToken", accessToken);
  setTokenExpiration(expiresIn);
  return accessToken;
};

const revokeToken = async token => {
  let params = new URLSearchParams();
  params.append("token", token);
  await axios.post(`https://oauth2.googleapis.com/revoke`, params);
};
