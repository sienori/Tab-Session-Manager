/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let S = new settingsObj;
S.initOptionsPage();

document.addEventListener('click', function (e) {
    switch (e.target.id) {
        case "save":
            save();
            break;
    }
});

function save(){
    S.saveOptionsPage();
}