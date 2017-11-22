/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let title = location.href.split('?tst_title=').slice(1).join('?').split('&tst_url')[0];
let url = location.href.split('&tst_url=').slice(1).join('?');

document.title = decodeURI(title);
document.getElementsByClassName("replacedUrl")[0].innerText = decodeURI(url);
document.getElementById("replacedPageMessage").innerText = browser.i18n.getMessage("replacedPageMessage");
