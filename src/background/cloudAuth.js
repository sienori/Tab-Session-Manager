import browser from "webextension-polyfill";
import axios from "axios";
import log from "loglevel";
import { clientId, clientSecret, redirectUri } from "../credentials";
import { getSettings, setSettings } from "../settings/settings";

const logDir = "background/cloudSync";

export const signInGoogle = async () => {
  log.log(logDir, "signInGoogle()");
  try {
    const accessCode = await getAuthCode();
    const { accessToken, expiresIn, refreshToken } = await getAuthTokensByCode(accessCode);
    setSettings("accessToken", accessToken);
    setTokenExpiration(expiresIn);
    if (refreshToken) setSettings("refreshToken", refreshToken);
    return true;
  } catch (e) {
    return false;
  }
};

export const signOutGoogle = async () => {
  log.log(logDir, "signOutGoogle()");
  try {
    const accessToken = await refreshAccessToken();
    revokeToken(accessToken);
    setSettings("accessToken", "");
    setSettings("refreshToken", "");
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
    "&access_type=offline" +
    "&response_type=code" +
    `&redirect_uri=${redirectUri}` +
    `&scope=${encodeURIComponent(scopes.join(" "))}`;

  const redirectedURL = await launchWebAuthFlow(authURL);
  const params = new URL(redirectedURL).searchParams;
  if (params.has("error")) {
    log.error(logDir, "getAuthCode()", params.get("error"));
    throw new Error();
  }
  return params.get("code");
};

const getAuthTokensByCode = async code => {
  let params = new URLSearchParams();
  params.append("code", code);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("redirect_uri", redirectUri);
  params.append("grant_type", "authorization_code");

  const authResponse = await axios.post("https://oauth2.googleapis.com/token", params).catch(e => {
    log.error(logDir, "getAuthTokensByCode()", e.response.data);
    throw new Error();
  });

  return {
    accessToken: authResponse.data.access_token,
    expiresIn: authResponse.data.expires_in,
    refreshToken: authResponse.data.refresh_token
  };
};

const launchWebAuthFlow = async url => {
  const authWindow = await browser.windows.create({
    url: url,
    width: 500,
    height: 700
  });
  const authTab = authWindow.tabs[0];

  return new Promise((resolve, reject) => {
    const handleRedirect = (tabId, changeInfo, tab) => {
      removeListeners();
      browser.windows.remove(authWindow.id);
      resolve(changeInfo.url);
    };

    const handleRemove = (tabId, removeInfo) => {
      if (tabId != authTab.id) return;
      removeListeners();
      reject();
    };

    const removeListeners = () => {
      browser.tabs.onUpdated.removeListener(handleRedirect);
      browser.tabs.onRemoved.removeListener(handleRemove);
    };

    browser.tabs.onUpdated.addListener(handleRedirect, {
      urls: [redirectUri + "*"],
      properties: ["status"],
      windowId: authWindow.id,
      tabId: authTab.id
    });
    browser.tabs.onRemoved.addListener(handleRemove);
  });
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

const getAccessTokenByRefreshToken = async refreshToken => {
  let params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "authorization_code");

  const authResponse = await axios.post("https://oauth2.googleapis.com/token", params).catch(e => {
    log.error(logDir, "getAccessTokenByRefreshToken()", e.response.data);
    throw new Error();
  });

  return {
    accessToken: authResponse.data.access_token,
    expiresIn: authResponse.data.expires_in
  };
};

const revokeToken = async token => {
  let params = new URLSearchParams();
  params.append("token", token);
  await axios.post(`https://oauth2.googleapis.com/revoke`, params);
};
