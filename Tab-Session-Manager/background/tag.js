/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function addTag(id, tag) {
    const sessionNo = getSessionNo(id);
    if (sessionNo == -1) return;

    const beginningAndEndSpaces = /(^( |　)*)|(( |　)*$)/g;
    const multipleSpaces = /( )+/g;
    tag = tag.replace(beginningAndEndSpaces, '');
    tag = tag.replace(multipleSpaces, ' ');

    const isNotEqual = (value) => {
        return value != tag
    }
    const reservedTag = ['regular', 'winClose', 'temp', '_displayAll', '_user', '_auto', browser.i18n.getMessage('regularSaveSessionName'), browser.i18n.getMessage('winCloseSessionName')];
    const currentTags = sessions[sessionNo].tag;
    if (!reservedTag.every(isNotEqual)) return;
    if (!currentTags.every(isNotEqual)) return;

    const onlySpaces = /^( |　)*$/;
    if (onlySpaces.test(tag)) return;

    sessions[sessionNo].tag.push(tag);
    setStorage();
}

function removeTag(id, tag) {
    const sessionNo = getSessionNo(id);
    if (sessionNo == -1) return;

    const isNotEqual = (value) => {
        return value != tag
    }
    const currentTags = sessions[sessionNo].tag;
    if (currentTags.every(isNotEqual)) return;

    sessions[sessionNo].tag = sessions[sessionNo].tag.filter((element) => {
        return element != tag;
    });

    setStorage();
}
