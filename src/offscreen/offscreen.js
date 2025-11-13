import browser from "webextension-polyfill";

let downloadCounter = 0;

const waitForDownloadLimit = async (limit) => {
    while (downloadCounter > limit) {
        return new Promise(resolve => setTimeout(() => {
            resolve(waitForDownloadLimit(limit));
        }, 100));
    }
}

const createObjectURL = async sessions => {
    downloadCounter++;
    await waitForDownloadLimit(5);

    return URL.createObjectURL(
        new Blob([JSON.stringify(sessions, null, "  ")], {
            type: "application/json"
        })
    );
}

const revokeObjectURL = downloadUrl => {
    downloadCounter--;
    URL.revokeObjectURL(downloadUrl);
}

const captureTabScreenshot = async ({ tabId, windowId, format = "png" }) => {
    try {
        // If a specific tab was requested ensure it is highlighted in the target window
        if (windowId !== undefined && windowId !== null) {
            await browser.windows.update(windowId, { focused: true }).catch(() => { });
        }
        const dataUrl = await browser.tabs.captureTab(tabId, { format });
        return { success: true, dataUrl };
    } catch (error) {
        console.error("offscreen_captureTab failed", error);
        return {
            success: false,
            error: error?.message || String(error)
        };
    }
};

const onMessageListener = async (request, sender, sendResponse) => {
    switch (request.message) {
        case "offscreen_createObjectUrl":
            return await createObjectURL(request.sessions);
        case "offscreen_revokeObjectUrl":
            return revokeObjectURL(request.downloadUrl);
        case "offscreen_captureTab":
            return await captureTabScreenshot(request);
    }

    // backgroundやpopup宛のメッセージとの混信を防ぐ
    const empty = new Promise(resolve => {
        setTimeout(() => {
            return resolve("");
        }, 1000);
    });
    return empty;
}

browser.runtime.onMessage.addListener(onMessageListener);
