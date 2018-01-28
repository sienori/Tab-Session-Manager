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
                browser.tabs.update({
                    url: paramater.url
                }).catch(function () {
                    //失敗時
                    browser.tabs.update({
                        url: "replaced/replaced.html" +
                            "?state=open_faild" +
                            "&title=" + encodeURIComponent(paramater.title) +
                            "&url=" + encodeURIComponent(paramater.url) +
                            "&favIconUrl=" + encodeURIComponent(paramater.favIconUrl)
                    })
                })
            }

        })
    }
}
