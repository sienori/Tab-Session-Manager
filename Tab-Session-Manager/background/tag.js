/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

async function addTag(id, tag) {
    let session = await Sessions.get(id).catch(() => {});
    if (session == undefined) return;

    const beginningAndEndSpaces = /(^( |　)*)|(( |　)*$)/g;
    const multipleSpaces = /( )+/g;
    tag = tag.replace(beginningAndEndSpaces, '');
    tag = tag.replace(multipleSpaces, ' ');

    const isNotEqual = (value) => {
        return value != tag
    }
    const reservedTag = ['regular', 'winClose', 'temp', '_displayAll', '_user', '_auto', browser.i18n.getMessage('regularSaveSessionName'), browser.i18n.getMessage('winCloseSessionName')];
    const currentTags = session.tag;
    if (!reservedTag.every(isNotEqual)) return;
    if (!currentTags.every(isNotEqual)) return;

    const onlySpaces = /^( |　)*$/;
    if (onlySpaces.test(tag)) return;

    session.tag.push(tag);
    updateSession(session);
}

async function removeTag(id, tag) {
    let session = await Sessions.get(id).catch(() => {});
    if (session == undefined) return;

    const isNotEqual = (value) => {
        return value != tag
    }
    const currentTags = session.tag;
    if (currentTags.every(isNotEqual)) return;

    session.tag = session.tag.filter((element) => {
        return element != tag;
    });

    updateSession(session);
}

//指定されたタグを含むセッションを新しい順に取得
async function getSessionsByTag(tag, needKeys = null) {
    const newestSort = (a, b) => {
        return moment(b.date).unix() - moment(a.date).unix();
    }
    const isIncludesTag = (element, index, array) => {
        return element.tag.includes(tag);
    }

    let sessions = await Sessions.getAll(needKeys).catch([]);
    sessions = sessions.filter(isIncludesTag);
    sessions.sort(newestSort);

    return sessions;
}
