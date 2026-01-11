import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";

const logDir = "common/tabGroups";

const saveTabGroupsExtensionId = "aghdiknflpelpkepifoplhodcnfildao";

const isFirefox = browserInfo().name == "Firefox";

export const isEnabledTabGroups = (browserInfo().name == "Chrome" && browserInfo().version >= 89) || (browserInfo().name == "Firefox" && browserInfo().version >= 139);

export const queryTabGroups = async (queryInfo = {}) => {
  if (isFirefox) {
    const tabGroups = await browser.tabGroups.query(queryInfo)
      .catch(e => {
        log.error(logDir, "getTabGroups", e);
        return [];
      });
    log.log(logDir, "getTabGroups", tabGroups);
    return tabGroups;
  } else {
    const message = {
      request: "query",
      queryInfo
    };

    const tabGroups = await browser.runtime.sendMessage(saveTabGroupsExtensionId, message)
      .catch(e => {
        log.error(logDir, "getTabGroups", e);
        return [];
      });
    log.log(logDir, "getTabGroups", tabGroups);
    return tabGroups;
  }
};

export const updateTabGroups = async (groupId, updateProperties) => {
  log.log(logDir, "updateTabGroups");
  const { title, color, collapsed } = updateProperties;

  if (isFirefox) {
    await browser.tabGroups.update(groupId, {
      title, color, collapsed
    });
  } else {
    const message = {
      request: "update",
      groupId: groupId,
      updateProperties: {
        title, color, collapsed
      }
    };
    browser.runtime.sendMessage(saveTabGroupsExtensionId, message);
  }
};