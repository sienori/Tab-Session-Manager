import browser from "webextension-polyfill";
import log from "loglevel";

const logDir = "common/tabGroups";

// const saveTabGroupsExtensionId = "aghdiknflpelpkepifoplhodcnfildao";

export const queryTabGroups = async (queryInfo = {}) => {
  /*
  const message = {
    request: "query",
    queryInfo
  };

  const tabGroups = await browser.runtime.sendMessage(saveTabGroupsExtensionId, message)
    .catch(e => {
      log.error(logDir, "getTabGroups", e);
      return [];
    });
  */
  const tabGroups = await browser.tabs.query(queryInfo);
  log.log(logDir, "getTabGroups", tabGroups);
  return tabGroups;
};

export const updateTabGroups = async (groupId, updateProperties) => {
  log.log(logDir, "updateTabGroups");
  /*
  const { title, color, collapsed } = updateProperties;
  const message = {
    request: "update",
    groupId: groupId,
    updateProperties: {
      title, color, collapsed
    }
  };
  browser.runtime.sendMessage(saveTabGroupsExtensionId, message);

   */

  await browser.tabs.update(groupId, updateProperties)
};
