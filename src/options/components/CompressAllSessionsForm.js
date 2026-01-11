import React, { useEffect, useState } from "react";
import browser from "webextension-polyfill";

const port = Math.random();

export default () => {
  const [status, setStatus] = useState({});

  useEffect(() => {
    const handleMessage = request => {
      if (request.port !== port || request.message !== "updateCompressStatus") return;
      setStatus(request.status);
    };

    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  });

  return (
    <div className="compressButton">
      <input
        type="button"
        value={browser.i18n.getMessage("compressLabel")}
        onClick={handleCompressClick}
      />
      <p className="caption">
        {status.status === "compressing" && (
          <>
            {browser.i18n.getMessage("compressingLabel")}
            <br />
            {`${status.count} / ${status.maxCount}`}
          </>
        )}
        {status.status === "complete" && (
          <>
            {browser.i18n.getMessage("compressionCompleteLabel")}
            <br />
            {`${(status.beforeSessionsSize / 1000 / 1000).toFixed(2)} MB → ${(status.afterSessionsSize / 1000 / 1000).toFixed(2)} MB`}
          </>
        )}
      </p>
    </div>
  );
};

const handleCompressClick = () => {
  const res = confirm(browser.i18n.getMessage("compressAllSessionsConfirmLabel"));
  if (res) browser.runtime.sendMessage({ message: "compressAllSessions", port: port });
};
