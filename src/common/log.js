import log from "loglevel";
import { getSettings } from "src/settings/settings";

export const overWriteLogLevel = () => {
  const originalFactory = log.methodFactory;
  log.methodFactory = (methodName, logLevel, loggerName) => {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    return (logDir, ...args) => {
      rawMethod(`[${methodName}]`, `${logDir}:`, ...args);
    };
  };
};

export const updateLogLevel = () => {
  const isDebugMode = getSettings("isDebugMode");
  if (isDebugMode) log.enableAll();
  else log.disableAll();
};
