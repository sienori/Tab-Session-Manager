/* Copyright (c) 2017-2018 Sienori All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Labels = {};
let S = new settingsObj();

S.init().then(async() => {
    setLabels();
    S.labelSet();
    document.body.style.width = S.get().popupWidth + "px";
    document.body.style.height = S.get().popupHeight + "px";

    //セッション名の省略
    if (S.get().truncateTitle) {
        const stylesheet = document.styleSheets.item(0);
        stylesheet.insertRule(".sessionName span { white-space:nowrap; }", stylesheet.cssRules.length);
    }

    if (S.get().filter != undefined) document.getElementById('filter').value = S.get().filter;
    if (S.get().sort != undefined) document.getElementById('sort').value = S.get().sort;

    //タブタイトルを表示
    window.document.getElementById("saveName").value = await getCurrentTabName();

    const keys = ['id', 'name', 'date', 'tag', 'tabsNumber', 'windowsNumber'];
    const sessions = await getSessions(null, keys);
    showSessions(sessions);

    browser.runtime.onMessage.addListener(changeSessions);
    window.document.getElementById("filter").addEventListener("change", filterChange);
    window.document.getElementById("sort").addEventListener("change", sortChange);
});

async function setLabels() {
    labels = ['initialNameValue', 'winCloseSessionName', 'regularSaveSessionName', 'displayAllLabel', 'displayUserLabel', 'displayAutoLabel', 'settingsLabel', 'open', 'remove', 'windowLabel', 'windowsLabel', 'tabLabel', 'tabsLabel', 'noSessionLabel', 'removeConfirmLabel', 'cancelLabel', 'renameLabel', 'exportButtonLabel', 'openInNewWindowLabel', 'openInCurrentWindowLabel', 'addToCurrentWindowLabel', 'saveOnlyCurrentWindowLabel', 'addTagLabel', 'removeTagLabel', 'donateWithPaypalLabel'];

    for (let i of labels) {
        Labels[i] = browser.i18n.getMessage(i);
    }

    window.document.getElementById("saveName").placeholder = Labels.initialNameValue;
    window.document.getElementById("winCloseSessionName").innerText = Labels.winCloseSessionName;
    window.document.getElementById("regularSaveSessionName").innerText = Labels.regularSaveSessionName;
    window.document.getElementById("setting").title = Labels.settingsLabel;
    window.document.getElementsByClassName("saveOnlyCurrentWindow")[0].innerText = Labels.saveOnlyCurrentWindowLabel;
    document.getElementById('donate').title = Labels.donateWithPaypalLabel;
}

async function getCurrentTabName() {
    let tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!S.get().ifSavePrivateWindow && tabs[0].incognito) {
        tabs = await browser.tabs.query({
            active: true,
        });

        tabs = tabs.filter((element) => {
            return !element.incognito;
        });

        const tabTitle = (tabs[0] != undefined) ? tabs[0].title : '';
        return await tabTitle;

    } else {
        return await tabs[0].title;
    }
}

async function getSessions(id = null, needKeys = null) {
    const sessions = await browser.runtime.sendMessage({
        message: "getSessions",
        id: id,
        needKeys: needKeys
    });
    return sessions;
}

async function changeSessions(request, sender, sendResponse) {
    const deleteSession = id => {
        const sessionsArea = document.getElementById('sessionsArea');
        const session = document.getElementById(id);
        sessionsArea.removeChild(session);
    }

    let sessions = [];

    switch (request.message) {
        case 'saveSession':
            sessions.push(await getSessions(request.id));
            showSessions(sessions, false);
            break;
        case 'updateSession':
            sessions.push(await getSessions(request.id));
            deleteSession(request.id);
            showSessions(sessions, false);
            break;
        case 'deleteSession':
            deleteSession(request.id);
            updateFilterItems();
            break;
        case 'deleteAll':
            const keys = ['id', 'name', 'date', 'tag', 'tabsNumber', 'windowsNumber'];
            sessions = await getSessions(null, keys);
            showSessions(sessions);
            break;
    }
}

function getAllTags() {
    const sessions = document.getElementsByClassName('session');
    let count = {
        all: 0,
        user: 0,
        auto: 0,
        regular: 0,
        winClose: 0,
        tags: []
    };

    let tagsCount = {};
    for (let session of sessions) {
        let tags = session.dataset.tag.slice(2, -2);
        tags = tags.split('","');

        count.all++;
        if (tags.includes('regular')) {
            count.auto++;
            count.regular++;
        } else if (tags.includes('winClose')) {
            count.auto++;
            count.winClose++;
        } else {
            count.user++;
        }

        for (let tag of tags) {
            if (tag == 'regular' || tag == 'winClose' || tag == '') continue;
            if (tag == 'temp') {
                count.all--;
                count.auto--;
                count.winClose--;
                continue;
            }

            tagsCount[tag] = tagsCount[tag] || 0;
            tagsCount[tag]++;
        }
    }

    for (let tag in tagsCount) {
        count.tags.push({
            name: tag,
            count: tagsCount[tag]
        })
    }

    const alphabeticallySort = (a, b) => {
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    }

    count.tags.sort(alphabeticallySort);

    return count;
}

function updateFilterItems() {
    const filter = document.getElementById('filter');
    const count = getAllTags();

    let options = '';
    options += `
        <option value="_displayAll">${Labels.displayAllLabel} [${count.all}]</option>
        <option value="_auto">${Labels.displayAutoLabel} [${count.auto}]</option>
        <option value="winClose">${Labels.winCloseSessionName} [${count.winClose}]</option>
        <option value="regular">${Labels.regularSaveSessionName} [${count.regular}]</option>
        <option value="_user">${Labels.displayUserLabel} [${count.user}]</option>`;

    for (let tag of count.tags) {
        options += `<option value="${sanitaize.encode(tag.name)}">${sanitaize.encode(tag.name)} [${tag.count}]</option>`;
    }

    filter.innerHTML = options;

    let filterValues = [];
    for (let option of filter.getElementsByTagName('option')) {
        filterValues.push(option.value);
    }

    const currentFilterValue = S.get().filter;
    filter.value = (filterValues.includes(currentFilterValue)) ? currentFilterValue : '_displayAll';
}

function filterChange() {
    const filter = window.document.getElementById("filter").value;

    if (S.get().filter != filter) {
        S.save({
            'filter': filter
        });
        const sessionsArea = window.document.getElementById("sessionsArea");
        sessionsArea.scrollTo(0, 0);
    }

    let showSessionsCount = 0;
    const sessionItems = document.getElementsByClassName("session");

    for (let item of sessionItems) {
        const tags = item.dataset.tag.slice(2, -2).split('","');

        let isShow = false;
        switch (filter) {
            case '_displayAll':
                isShow = true;
                break;
            case '_user':
                isShow = (!tags.includes('regular') && !tags.includes('winClose'));
                break;
            case '_auto':
                isShow = (tags.includes('regular') || tags.includes('winClose'));
                break;
            default:
                isShow = (tags.includes(filter));
                break;
        }
        if (tags.includes('temp')) isShow = false;

        if (isShow) {
            item.classList.remove('hidden');
            showSessionsCount++;
        } else {
            item.classList.add('hidden');
        }
    }
    const noSessionLabel = document.getElementsByClassName('noSessionLabel')[0];
    if (showSessionsCount == 0) noSessionLabel.classList.remove('hidden');
    else noSessionLabel.classList.add('hidden');
}

function sortChange() {
    const sessionsArea = document.getElementById("sessionsArea");
    const sort = document.getElementById("sort").value;

    if (S.get().sort != sort) {
        S.save({
            'sort': sort
        });
        sessionsArea.scrollTo(0, 0);
    }

    const newestSort = (a, b) => {
        return b.date - a.date;
    }
    const alphabeticallySort = (a, b) => {
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    }
    //名前の無いセッションを最後に，同じ名前なら新しい順に
    const namelessSort = (a, b) => {
        if (a.name == "" && b.name != "") return 1;
        else if (a.name != "" && b.name == "") return -1;
        else if (a.name == b.name) return newestSort(a, b);
    }

    const sessionItems = document.getElementsByClassName('session');
    let sortArray = [];
    for (let item of sessionItems) {
        const id = item.id;
        const name = item.dataset.name;
        const date = item.dataset.date;
        const tags = item.dataset.tag.slice(2, -2).split('","');

        const session = {
            id: id,
            name: name,
            date: date,
            tag: tags
        };
        sortArray.push(session);
    }

    switch (sort) {
        case "newest":
            sortArray.sort(newestSort);
            break;
        case "oldest":
            sortArray.sort(newestSort);
            sortArray.reverse();
            break;
        case "aToZ":
            sortArray.sort(alphabeticallySort);
            sortArray.sort(namelessSort);
            break;
        case "zToA":
            sortArray.sort(alphabeticallySort);
            sortArray.reverse();
            sortArray.sort(namelessSort);
            break;
    }

    let order = 0;
    for (let session of sortArray) {
        order++;
        document.getElementById(session.id).style.order = order;
    }
}

const sanitaize = {
    encode: (str) => {
        str = str || '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    decode: (str) => {
        str = str || '';
        return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&');
    }
};

function sessionsHTML(info) {
    const detail = `${info.windowsNumber} ${(info.windowsNumber==1)?Labels.windowLabel:Labels.windowsLabel} - ${info.tabsNumber} ${(info.tabsNumber==1)?Labels.tabLabel:Labels.tabsLabel}`;
    const dataTag = `'["${info.tag.map(sanitaize.encode).join('","')}"]'`;
    let tags = '';

    for (let tag of info.tag) {
        let tagText = tag;
        switch (tag) {
            case 'winClose':
                tagText = Labels.winCloseSessionName;
                break;
            case 'regular':
                tagText = Labels.regularSaveSessionName;
                break;
        }
        tags += `<div class=tag data-tag='${sanitaize.encode(tag)}'>
                    <span>${sanitaize.encode(tagText)}</span>
                    <div class=removeTagButton title="${Labels.removeTagLabel}">
                        <svg><use xlink:href="#plusSvg"></use></svg>
                    </div>
                </div>`
    }

    return `<div id=${info.id} class="session" data-tag=${dataTag} data-date="${info.date}" data-name="${sanitaize.encode(info.sessionName)}">
        <div class=topContainer>
            <div class=nameContainer>
                <div class="renameArea">
                    <div class=renameContainer>
                        <input class="renameInput" type="text">
                        <div class=renameSend type="button">
                            <svg>
                                <use xlink:href="#checkSvg"></use>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="sessionName">
                    <span>${sanitaize.encode(info.sessionName)}</span>
                </div>
            </div>
            <div class=menuContainer>
                <div class=menuIcon>
                    <svg>
                        <use xlink:href="#menuSvg"></use>
                    </svg>
                </div>
                <div class="popupMenu hidden">
                    <ul>
                    <li class=renameButton>${Labels.renameLabel}</li>
                    <li class=exportButton>${Labels.exportButtonLabel}</li>
                    <hr>
                    <li class=openInNewWindow>${Labels.openInNewWindowLabel}</li>
                    <li class=openInCurrentWindow>${Labels.openInCurrentWindowLabel}</li>
                    <li class=addToCurrentWindow>${Labels.addToCurrentWindowLabel}</li>
                    </ul>
                </div>
            </div>
        </div>
        <div class=dateContainer>
            <div class=tagsContainer>
                <div class="tag addTagButton" title="${Labels.addTagLabel}">
                    <svg>
                        <use xlink:href="#plusSvg"></use>
                    </svg>
                    <div class="addTagContainer">
                        <input class=addTagInput type=text placeholder="${Labels.addTagLabel}">
                        <div class=addTagSend>
                            <svg>
                                <use xlink:href="#checkSvg"></use>
                            </svg>
                        </div>
                    </div>
                </div>
                ${tags}
            </div>
            <span class="sessionDate">${sanitaize.encode(info.formatedDate)}</span>
        </div>
        <div class=buttonContainer>
            <span class="detail">${detail}</span>
            <div class=removeOpenButton>
                <span class="open">${Labels.open}</span>
                <span class="remove">${Labels.remove}</span>
            </div>
        </div>
        <div class="removeConfirm hidden">
            <span>${Labels.removeConfirmLabel}</span>
            <div class=buttonContainer>
                <span class="reallyRemove">${Labels.remove}</span>
                <span class="cancel">${Labels.cancelLabel}</span>
            </div>
        </div>
        <div class="detailItems hidden"></div>
    </div>`;
}

function showSessions(sessions, isInit = true) {
    if (sessions == undefined) return;
    const sessionsArea = window.document.getElementById("sessionsArea");
    if (isInit) {
        sessionsArea.innerHTML = "";
        sessionsArea.insertAdjacentHTML('afterbegin', `<div class="noSessionLabel hidden">${Labels.noSessionLabel}</div>`);
    }

    for (let session of sessions) {
        const date = moment(session.date);
        const info = {
            sessionName: session.name,
            formatedDate: date.format(S.get().dateFormat),
            date: date.valueOf(),
            tag: session.tag,
            tabsNumber: session.tabsNumber,
            windowsNumber: session.windowsNumber,
            id: session.id
        }
        sessionsArea.insertAdjacentHTML('afterbegin', sessionsHTML(info));
    }
    updateFilterItems();
    filterChange();
    sortChange();
}

async function showDetail(e) {
    const sessionId = getParentSessionId(e.target);
    const detail = window.document.getElementById(sessionId).getElementsByClassName("detailItems")[0];
    const session = await getSessions(sessionId);
    if (session == undefined) return;

    if (detail.classList.contains("hidden")) {
        detail.innerHTML = "";
        let i = 0;
        for (let win in session.windows) {
            i++;
            detail.insertAdjacentHTML('beforeend',
                `<ul class="windowContainer">
                    <li class="windowTitleContainer hidden">
                        <div class="windowIcon"></div>
                        <span class=windowTitle>${Labels.windowLabel} ${i}</span>
                    </li>
                </ul>`);

            const windowContainer = detail.getElementsByClassName("windowContainer")[i - 1];

            let sortedTabs = [];
            for (let tab in session.windows[win]) {
                sortedTabs[session.windows[win][tab].index] = session.windows[win][tab].id;
            }

            for (let tab of sortedTabs) {
                const tabTitle = session.windows[win][tab].title;
                const tabUrl = session.windows[win][tab].url;
                let tabFavIconUrl = session.windows[win][tab].favIconUrl;

                if (tabFavIconUrl == undefined || tabFavIconUrl.match(/^chrome:\/\//))
                    tabFavIconUrl = "/icons/favicon.png";
                const tabHtml =
                    `<li class="tabContainer hidden">
                        <div class=fav style="background-image:url(${sanitaize.encode(tabFavIconUrl)})"></div>
                        <div class=tabTitle><a href=${sanitaize.encode(tabUrl)}>
                            ${sanitaize.encode(tabTitle)}
                        </a></div>
                    </li>`;

                windowContainer.insertAdjacentHTML('beforeend', tabHtml);

                replaseImageUrl(tabFavIconUrl, sessionId, i);
            }
        }
        //クラスを付け替えてアニメーションさせるために必要なディレイ
        setTimeout(() => {
            detail.classList.remove("hidden");
            for (let li of detail.getElementsByTagName("li")) {
                li.classList.remove("hidden");
            }
        }, 10);
    } else {
        for (let li of detail.getElementsByTagName("li")) {
            li.classList.add("hidden");
        }
        detail.classList.add("hidden");
    }
}

function replaseImageUrl(url, sessionId, win) {
    const favElements = document.getElementById(sessionId).getElementsByClassName("windowContainer")[win - 1].getElementsByClassName("fav");
    const favElement = favElements[favElements.length - 1];
    let img = new Image();
    img.src = url;
    img.onerror = function () {
        favElement.style.backgroundImage = "url(/icons/favicon.png)";
    }
}

function rename(e) {
    const sessionId = getParentSessionId(e.target);
    const sessionName = window.document.getElementById(sessionId).getElementsByClassName("sessionName")[0];
    const renameArea = window.document.getElementById(sessionId).getElementsByClassName("renameArea")[0];

    renameArea.getElementsByClassName("renameInput")[0].value = sessionName.innerText;
    if (renameArea.style.display == "none" || renameArea.style.display == "") {
        renameArea.style.display = "block";
        sessionName.style.display = "none";

        const renameInput = renameArea.getElementsByClassName('renameInput')[0];
        renameInput.focus();
        renameInput.select();

    } else {
        renameArea.style.display = "none";
        sessionName.style.display = "block";
    }
}

function renameSend(e) {
    sessionId = getParentSessionId(e.target);
    sessionName = window.document.getElementById(sessionId).getElementsByClassName("sessionName")[0];
    renameArea = window.document.getElementById(sessionId).getElementsByClassName("renameArea")[0];
    renameInput = renameArea.getElementsByClassName("renameInput")[0].value;

    sessionName.innerText = renameInput;

    browser.runtime.sendMessage({
        message: "rename",
        id: sessionId,
        name: renameInput
    });

    renameArea.style.display = "none";
    sessionName.style.display = "block";

}

function showAddTagArea(e) {
    const sessionId = getParentSessionId(e.target);
    const tagsContainer = document.getElementById(sessionId).getElementsByClassName('tagsContainer')[0];
    const addTagButton = document.getElementById(sessionId).getElementsByClassName('addTagButton')[0];
    const addTagInput = document.getElementById(sessionId).getElementsByClassName('addTagInput')[0];

    if (addTagButton.classList.contains('showInput')) {
        tagsContainer.style.height = tagsContainer.clientHeight + "px";
        tagsContainer.style.height = calcTagsHeight(tagsContainer, true) + "px";
        addTagButton.classList.remove('showInput');
    } else {
        tagsContainer.style.height = tagsContainer.clientHeight + "px";
        tagsContainer.style.height = calcTagsHeight(tagsContainer, false) + "px";
        addTagButton.classList.add('showInput');

        //アニメーション中にフォーカスすると一瞬レイアウトが崩れる
        setTimeout(() => {
            addTagInput.focus();
        }, 300);
    }
}

function calcTagsHeight(tagsContainer, reverse) {
    const tags = tagsContainer.getElementsByClassName('tag');
    const width = tagsContainer.offsetWidth;
    const height = tags[0].offsetHeight + 2; //+margin

    let sumWidth;
    if (reverse) sumWidth = 0;
    else sumWidth = width;

    let sumHeight = height;

    for (let tag of tags) {
        if (tag.classList.contains('addTagButton')) continue;
        sumWidth += tag.offsetWidth;

        if (sumWidth > width) {
            sumWidth = tag.offsetWidth;
            sumHeight += height;
        }
    }
    return sumHeight;
}

function addTagSend(e) {
    const sessionId = getParentSessionId(e.target);
    const tagInput = document.getElementById(sessionId).getElementsByClassName('addTagInput')[0];

    showAddTagArea(e);
    browser.runtime.sendMessage({
        message: "addTag",
        id: sessionId,
        tag: tagInput.value
    });

    tagInput.value = '';
}

function removeTagSend(e) {
    const sessionId = getParentSessionId(e.target);
    const tag = e.target.parentElement.dataset.tag;

    browser.runtime.sendMessage({
        message: "removeTag",
        id: sessionId,
        tag: tag
    });
}

let firstClick = true;

function clickSaveInput() {
    if (firstClick) {
        const textarea = window.document.getElementById("saveName");
        textarea.select();
        firstClick = false;
    }
}

function showRemoveConfirm(e) {
    let sessionId = getParentSessionId(e.target);
    let confirmElement = document.getElementById(sessionId).getElementsByClassName("removeConfirm")[0];
    let removeElement = document.getElementById(sessionId).getElementsByClassName("remove")[0];
    if (confirmElement.classList.contains("hidden")) {
        confirmElement.classList.remove("hidden");
        removeElement.innerText = Labels.cancelLabel;
    } else {
        confirmElement.classList.add("hidden");
        removeElement.innerText = Labels.remove;
    }
}

function showPopupMenu(e) {
    const sessionId = getParentSessionId(e.target);
    const popupMenu = document.getElementById(sessionId).getElementsByClassName("popupMenu")[0];
    if (popupMenu.classList.contains("hidden")) {
        popupMenu.classList.remove("hidden");

        //クリックしたセッション以外のポップアップを非表示
        const sessionElements = document.getElementsByClassName("session");
        for (let i of sessionElements) {
            if (i.id != sessionId) {
                i.getElementsByClassName("popupMenu")[0].classList.add("hidden");
            }
        }

    } else {
        popupMenu.classList.add("hidden");
    }
}

function showSaveOptionPopup(e) {
    const popupMenu = document.getElementById("saveArea").getElementsByClassName("popupMenu")[0];

    if (popupMenu.classList.contains("hidden")) {
        popupMenu.classList.remove("hidden");
    } else {
        popupMenu.classList.add("hidden");
    }
}

function hideAllPopupMenu(e) {

    const isInMenuContainer = (element, className) => {
        while (true) {
            element = element.parentElement;
            if (!element.parentElement) {
                return false;
            }
            if (element.className == "menuContainer") {
                element.getElementsByClassName("popup")
                return true;
            }

        }
    }

    if (!e.target.classList.contains("menuIcon") && !(e.target.id == "saveOptionButton")) {
        const popupMenus = document.getElementsByClassName("popupMenu");
        for (let i of popupMenus) {
            i.classList.add("hidden");
        }
    }
}

function getParentSessionId(element) {
    while (true) {
        element = element.parentElement;
        if (element.id != "") {
            let sessionId = element.id;
            return sessionId;
        }
    }
}

function openUrl(url, title = '') {
    browser.tabs.create({
        url: url
    }).catch(() => {
        browser.tabs.create({
            url: `../replaced/replaced.html?state=open_faild&title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
        }).catch(() => {});
    });
}

window.document.addEventListener('click', async function (e) {
    hideAllPopupMenu(e);
    switch (e.target.id) {
        case "setting":
            browser.runtime.openOptionsPage();
            break;
        case "saveName":
            clickSaveInput();
            break;
        case "saveButton":
            save();
            break;
        case "saveOptionButton":
            showSaveOptionPopup(e);
            break;
        case "donate":
            const url = 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&no_shipping=1&business=sienori.firefox@gmail.com&item_name=Tab Session Manager - Donation'
            openUrl(url);
            break;
    }
    switch (e.target.className) {
        case "open":
            sendOpenMessage(e, "default");
            break;
        case "remove":
        case "cancel":
            showRemoveConfirm(e);
            break;
        case "reallyRemove":
            browser.runtime.sendMessage({
                message: "remove",
                id: getParentSessionId(e.target)
            });
            break;
        case "detail":
            showDetail(e);
            break;
        case "renameButton":
            rename(e);
            break;
        case "renameSend":
            renameSend(e);
            break;
        case "menuIcon":
            showPopupMenu(e);
            break;
        case "openInCurrentWindow":
            sendOpenMessage(e, "openInCurrentWindow");
            break;
        case "openInNewWindow":
            sendOpenMessage(e, "openInNewWindow");
            break;
        case "addToCurrentWindow":
            sendOpenMessage(e, "addToCurrentWindow");
            break;
        case "saveOnlyCurrentWindow":
            save("saveOnlyCurrentWindow");
            break;
        case "exportButton":
            browser.runtime.onMessage.removeListener(changeSessions);
            const sessionId = getParentSessionId(e.target);
            browser.tabs.create({
                url: `../options/options.html#sessions?action=export&id=${sessionId}`
            });
            window.close();
            break;
        case "addTagSend":
            addTagSend(e);
            break;
        case "removeTagButton":
            removeTagSend(e);
            break;
    }
    if (e.target.classList.contains('addTagButton')) showAddTagArea(e);
})

window.document.addEventListener('keypress', (e) => {
    if (e.key == 'Enter') {
        if (e.target.id == 'saveName') {
            save();
        } else if (e.target.className == 'renameInput') {
            renameSend(e);
        } else if (e.target.className == 'addTagInput') {
            addTagSend(e);
        }
    }
})

async function sendOpenMessage(e, property) {
    const id = getParentSessionId(e.target);
    let openSession = await getSessions(id);
    if (openSession == undefined) return;

    browser.runtime.sendMessage({
        message: "open",
        session: openSession,
        property: property
    });
}

function save(property = "default") {
    const name = window.document.getElementById("saveName").value;

    browser.runtime.sendMessage({
        message: "save",
        name: name,
        property: property
    });
    window.document.getElementById("saveName").value = "";
}
