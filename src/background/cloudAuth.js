import browser from "webextension-polyfill";
import axios from "axios";
import log from "loglevel";
import { clientId, clientSecret, redirectUri } from "../credentials";
import { getSettings, setSettings } from "../settings/settings";

const logDir = "background/cloudAuth";

export const signInGoogle = async () => {
  log.log(logDir, "signInGoogle()");
  try {
    const { accessToken, expiresIn } = await getAuthTokens();
    setSettings("accessToken", accessToken);
    setTokenExpiration(expiresIn);
    setSettings("lastSyncTime", 0);
    return true;
  } catch (e) {
    return false;
  }
};

export const signOutGoogle = async () => {
  log.log(logDir, "signOutGoogle()");
  try {
    const accessToken = getSettings("accessToken");
    revokeToken(accessToken);
    setSettings("accessToken", "");
    setSettings("lastSyncTime", 0);
    return true;
  } catch {
    return false;
  }
};

const getAuthCode = async () => {
  const scopes = ["https://www.googleapis.com/auth/drive.appfolder"];
  const authURL =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${clientId}` +
    "&response_type=token" +
    `&redirect_uri=${redirectUri}` +
    `&scope=${encodeURIComponent(scopes.join(" "))}`;

  const redirectedURL = await browser.identity.launchWebAuthFlow({
    interactive: true,
    url: authURL
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

};

const setTokenExpiration = async expirationSec => {
  const currentTimeMs = Date.now();
  setSettings("tokenExpiration", currentTimeMs + expirationSec * 1000);
};

export const refreshAccessToken = async () => {
  const currentAccessToken = getSettings("accessToken");
  const tokenExpiration = getSettings("tokenExpiration");
  if (Date.now() < tokenExpiration) return currentAccessToken;

  const refreshToken = getSettings("refreshToken");
  const { accessToken, expiresIn } = await getAccessTokenByRefreshToken(refreshToken);
  setSettings("accessToken", accessToken);
  setTokenExpiration(expiresIn);
  return accessToken;
};

const revokeToken = async token => {
  let params = new URLSearchParams();
  params.append("token", token);
  await axios.post(`https://oauth2.googleapis.com/revoke`, params);
};
