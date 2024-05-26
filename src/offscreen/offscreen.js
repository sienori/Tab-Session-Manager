import browser from "webextension-polyfill";

const createObjectURL = sessions => {
    return URL.createObjectURL(
        new Blob([JSON.stringify(sessions, null, "  ")], {
            type: "application/json"
        })
    );
}

const revokeObjectURL = downloadUrl => {
    URL.revokeObjectURL(downloadUrl);
}

const onMessageListener = async (request, sender, sendResponse) => {
    switch (request.message) {
        case "offscreen_createObjectUrl":
            return createObjectURL(request.sessions);
        case "offscreen_revokeObjectUrl":
            return revokeObjectURL(request.downloadUrl);
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