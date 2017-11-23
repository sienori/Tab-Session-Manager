/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let paramater = returnReplaceParamater(location.href);

document.title = paramater.title;
document.getElementsByClassName("title")[0].innerText = paramater.title;
document.getElementsByClassName("replacedUrl")[0].innerText = paramater.url;
document.head.insertAdjacentHTML('beforeend', '<link rel = "shortcut icon" href =' + paramater.favIconUrl + '>');

if (paramater.state == "open_faild") {
    document.getElementsByClassName("replacedPageMessage")[0].innerText = browser.i18n.getMessage("replacedPageMessage");
}

function returnReplaceParamater(url) {
    let paramater = {};
    let paras = url.split('?')[1].split('&');
    for (let p of paras) {
        paramater[p.split('=')[0]] = decodeURIComponent(p.split('=')[1]);
    }
    return paramater;
}
