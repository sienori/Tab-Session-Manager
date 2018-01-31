/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function returnReplaceParamater(url) {
    let paramater = {};
    if (url.indexOf(browser.runtime.getURL("replaced/replaced.html")) === 0) {
        paramater.isReplaced = true;
        let paras = url.split('?')[1].split('&');
        for (let p of paras) {
            paramater[p.split('=')[0]] = decodeURIComponent(p.split('=')[1]);
        }
    } else {
        paramater.isReplaced = false;
    }

    return paramater;
}

function returnReplaceURL(state, title, url, favIconUrl) {

    let retUrl = "replaced/replaced.html" +
        "?state=" + encodeURIComponent(state) +
        "&title=" + encodeURIComponent(title) +
        "&url=" + encodeURIComponent(url) +
        "&favIconUrl=" + encodeURIComponent(favIconUrl);

    //Reader mode
    if (url.substr(0, 17) == 'about:reader?url=') {
        retUrl = "replaced/replaced.html" +
            "?state=" + encodeURIComponent(state) +
            "&title=" + encodeURIComponent(title) +
            "&url=" + url.substr(17) +
            "&favIconUrl=" + encodeURIComponent(favIconUrl) +
            "&openInReaderMode=true";
    }

    return retUrl;
}

function replacePage() {
    if (!IsOpeningSession) {
        browser.tabs.query({
            active: true,
            currentWindow: true
        }).then(function (info) {
            if (info[0].status != "complete") {
                setTimeout(replacePage, 500);
            }
            let paramater = returnReplaceParamater(info[0].url);
            if (paramater.isReplaced && paramater.state == "redirect") {
                browser.tabs.update(info[0].id, {
                    url: paramater.url
                }).then(() => {
                    if (paramater.openInReaderMode == "true") {
                        toggleReaderMode(info[0].id);
                    }
                }).catch(function () {
                    browser.tabs.update(info[0].id, {
                        url: returnReplaceURL('open_faild', paramater.title, paramater.url, paramater.favIconUrl)
                    })
                })
            }

        })
    }

}

function toggleReaderMode(id) {
    browser.tabs.get(id).then((info) => {
        if (info.status != 'complete') {
            setTimeout(() => {
                toggleReaderMode(id);
            }, 500);
            return;
        }
        if (info.isArticle) browser.tabs.toggleReaderMode(id);
    })
}
