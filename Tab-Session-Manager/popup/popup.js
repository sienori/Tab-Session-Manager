/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Labels = {};
const setLabels = async() => {
    labels = ['initialNameValue', 'winCloseSessionName', 'regularSaveSessionName', 'displayAllLabel', 'displayUserLabel', 'displayAutoLabel', 'settingsLabel', 'open', 'remove', 'windowLabel', 'windowsLabel', 'tabLabel', 'tabsLabel', 'noSessionLabel', 'removeConfirmLabel', 'cancelLabel', 'renameLabel', 'exportButtonLabel', 'openInNewWindowLabel', 'openInCurrentWindowLabel', 'addToCurrentWindowLabel', 'saveOnlyCurrentWindowLabel', 'addTagLabel', 'removeTagLabel'];

    for (let i of labels) {
        Labels[i] = browser.i18n.getMessage(i);
    }

    window.document.getElementById("saveName").placeholder = Labels.initialNameValue;
    window.document.getElementById("saveName").value = await getCurrentTabName();
    window.document.getElementById("winCloseSessionName").innerText = Labels.winCloseSessionName;
    window.document.getElementById("regularSaveSessionName").innerText = Labels.regularSaveSessionName;
    window.document.getElementById("setting").title = Labels.settingsLabel;
    window.document.getElementsByClassName("saveOnlyCurrentWindow")[0].innerText = Labels.saveOnlyCurrentWindowLabel;
}
setLabels();

function getCurrentTabName() {
    return new Promise((resolve, reject) => {
        browser.tabs.query({
            active: true,
            currentWindow: true
        }).then((tabs) => {
            resolve(tabs[0].title);
        })
    });
}

let S = new settingsObj();

S.init().then(function () {
    S.labelSet();
    if (S.get().filter != undefined) document.getElementById('filter').value = S.get().filter;
    if (S.get().sort != undefined) document.getElementById('sort').value = S.get().sort;
});


//storageが大きいと表示に時間がかかる場合があるためディレイ
setTimeout(() => {
    getSessions();
    browser.storage.onChanged.addListener(changeSessions);
}, 100);

let sessions = [];

function getSessions() {
    browser.storage.local.get(["sessions"], function (value) {
        if (value.sessions != undefined) sessions = value.sessions;
        else sessions = [];
        showSessions();
    });
}

function changeSessions(changes, areaName) {
    if (Object.keys(changes)[0] == "sessions") {
        sessions = changes.sessions.newValue;

        let diffSessions = changes.sessions.newValue.filter((element, index, array) => {
            return JSON.stringify(element) != JSON.stringify(changes.sessions.oldValue[index]);
        });

        const tempOnly = (element) => {
            return element.tag.includes('temp');
        }

        const isSessionsRemoved = () => {
            return changes.sessions.newValue.length < changes.sessions.oldValue.length;
        }

        //temp以外が更新された時，またはセッションが削除された時
        if (!diffSessions.every(tempOnly) || isSessionsRemoved()) {
            showSessions();
        }
    }
}

window.document.getElementById("filter").addEventListener("change", filterChange);

function filterChange() {
    const sessionsArea = window.document.getElementById("sessionsArea");
    let filter = window.document.getElementById("filter").value;
    if (S.get().filter != filter) {
        S.save({
            'filter': filter
        });
        sessionsArea.scrollTo(0, 0);
    }
    let sessionItems = document.getElementsByClassName("session");
    let noSessionLabel = document.getElementsByClassName('noSessionLabel')[0];
    let showSessionsCount = 0;
    for (let item of sessionItems) {
        let tags = item.dataset.tag.split(' ');

        if (tags.includes('temp')) {
            item.classList.add('hidden');
            continue;
        }

        if (tags.includes(filter) || filter == "displayAll") {
            item.classList.remove('hidden');
            showSessionsCount++;
        } else {
            item.classList.add('hidden');
        }
    }
    if (showSessionsCount == 0) {
        noSessionLabel.classList.remove('hidden');
    } else {
        noSessionLabel.classList.add('hidden');
    }
}

window.document.getElementById("sort").addEventListener("change", sortChange);

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

    let sortArray = sessions.map((currentValue, index) => {
        let rObj = {};
        rObj.name = currentValue.name;
        rObj.id = index;
        rObj.date = moment(currentValue.date).unix();
        return rObj;
    });

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
    for (let i in sessions) {
        const order = sortArray.findIndex((element) => {
            return element.id == i;
        });
        document.getElementById(i).style.order = order;
    }
}

const sanitaize = {
    encode: (str) => {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    decode: (str) => {
        return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&');
    }
};

function sessionsHTML(i, info) {
    const detail = `${info.windowsNumber} ${(info.windowsNumber==1)?Labels.windowLabel:Labels.windowsLabel} - ${info.tabsNumber} ${(info.tabsNumber==1)?Labels.tabLabel:Labels.tabsLabel}`;

    const dataTag = `'["${info.tag.map(sanitaize.encode).join('","')}"]'`;

    let tags = '';
    for (let tag of info.tag) {
        let tagText = tag;
        switch (tag) {
            case 'user':
            case 'auto':
                continue;
                break;
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

    return `<div id=${String(i)} class="session" data-tag=${dataTag} data-id="${info.id}">
        <div class=topContainer>
            <div class=nameContainer>
                <div class="renameButton"></div>
                <div class="renameArea">
                    <div class=renameContainer>
                        <input class="renameInput" type="text">
                        <input class=renameSend type="button">
                    </div>
                </div>
                <div class="sessionName">${info.sessionName}</div>
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
            <span class="sessionDate">${sanitaize.encode(info.sessionDate)}</span>
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

function showSessions() {
    const sessionsArea = window.document.getElementById("sessionsArea");
    sessionsArea.innerHTML = "";
    sessionsArea.insertAdjacentHTML('afterbegin', `<div class="noSessionLabel hidden">${Labels.noSessionLabel}</div>`);

    for (let i in sessions) {
        const date = moment(sessions[i].date);
        const info = {
            sessionName: sessions[i].name,
            sessionDate: date.format(S.get().dateFormat),
            tag: sessions[i].tag,
            tabsNumber: sessions[i].tabsNumber,
            windowsNumber: Object.keys(sessions[i].windows).length,
            id: sessions[i].id
        }
        sessionsArea.insertAdjacentHTML('afterbegin', sessionsHTML(i, info));
    }
    filterChange();
    sortChange();
}

function showDetail(e) {
    sessionNo = getParentSessionNo(e.target); //.parentElement.id;
    detail = window.document.getElementById(sessionNo).getElementsByClassName("detailItems")[0];
    if (detail.classList.contains("hidden")) {
        detail.innerHTML = "";
        let i = 0;
        for (let win in sessions[sessionNo].windows) {
            i++;
            detail.insertAdjacentHTML('beforeend',
                `<ul class="windowContainer">
                    <li class="windowTitleContainer hidden">
                        <div class="windowIcon"></div>
                        <span class=windowTitle>${Labels.windowLabel} ${i}</span>
                    </li>
                </ul>`);

            let sortedTabs = [];
            for (let tab in sessions[sessionNo].windows[win]) {
                sortedTabs[sessions[sessionNo].windows[win][tab].index] = sessions[sessionNo].windows[win][tab].id;
            }

            for (let tab of sortedTabs) {
                let tabTitle = sessions[sessionNo].windows[win][tab].title;
                let tabUrl = sessions[sessionNo].windows[win][tab].url;
                tabFavIconUrl = sessions[sessionNo].windows[win][tab].favIconUrl;

                if (tabFavIconUrl == undefined || tabFavIconUrl.match(/^chrome:\/\//))
                    tabFavIconUrl = "/icons/favicon.png";

                let tabHtml =
                    `<li class="tabContainer hidden">
                        <div class=fav style="background-image:url(${tabFavIconUrl})"></div>
                        <div class=tabTitle><a href=${tabUrl}></a></div>
                    </li>`;

                detail.getElementsByClassName("windowContainer")[i - 1].insertAdjacentHTML('beforeend', tabHtml);

                replaseImageUrl(tabFavIconUrl, sessionNo, i);

                //tabTitleにhtmlタグが含まれている事があるので，innerTextで挿入
                let tabTitleElements = detail.getElementsByClassName('tabTitle');
                tabTitleElements[tabTitleElements.length - 1].getElementsByTagName('a')[0].innerText = tabTitle;
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

function replaseImageUrl(url, sessionNo, win) {
    const favElements = document.getElementById(sessionNo).getElementsByClassName("windowContainer")[win - 1].getElementsByClassName("fav");
    const favElement = favElements[favElements.length - 1];
    let img = new Image();
    img.src = url;
    img.onerror = function () {
        favElement.style.backgroundImage = "url(/icons/favicon.png)";
    }
}

function rename(e) {
    sessionNo = getParentSessionNo(e.target);
    sessionName = window.document.getElementById(sessionNo).getElementsByClassName("sessionName")[0];
    renameArea = window.document.getElementById(sessionNo).getElementsByClassName("renameArea")[0];

    renameArea.getElementsByClassName("renameInput")[0].value = sessionName.innerText;
    if (renameArea.style.display == "none" || renameArea.style.display == "") {
        renameArea.style.display = "block";
        sessionName.style.display = "none";
    } else {
        renameArea.style.display = "none";
        sessionName.style.display = "block";
    }
}

function renameSend(e) {
    sessionNo = getParentSessionNo(e.target);
    sessionName = window.document.getElementById(sessionNo).getElementsByClassName("sessionName")[0];
    renameArea = window.document.getElementById(sessionNo).getElementsByClassName("renameArea")[0];
    renameInput = renameArea.getElementsByClassName("renameInput")[0].value;

    sessions[sessionNo].name = renameInput;
    sessionName.innerText = renameInput;

    browser.runtime.sendMessage({
        message: "rename",
        sessionNo: sessionNo,
        name: renameInput
    }).then(() => {
        showSessions();
    });

    renameArea.style.display = "none";
    sessionName.style.display = "block";

}

function showAddTagArea(e) {
    const sessionNo = getParentSessionNo(e.target);
    const tagsContainer = document.getElementById(sessionNo).getElementsByClassName('tagsContainer')[0];
    const addTagButton = document.getElementById(sessionNo).getElementsByClassName('addTagButton')[0];
    const addTagInput = document.getElementById(sessionNo).getElementsByClassName('addTagInput')[0];

    if (addTagButton.classList.contains('showInput')) {
        addTagButton.classList.remove('showInput');
    } else {
        addTagButton.classList.add('showInput');
        setTimeout(() => {
            addTagInput.focus();
        }, 200);
    }
}

function addTagSend(e) {
    const sessionId = getParentSessionId(e.target);
    const sessionNo = getParentSessionNo(e.target);
    const tagInput = document.getElementById(sessionNo).getElementsByClassName('addTagInput')[0];

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
    let sessionNo = getParentSessionNo(e.target);
    let confirmElement = document.getElementById(sessionNo).getElementsByClassName("removeConfirm")[0];
    let removeElement = document.getElementById(sessionNo).getElementsByClassName("remove")[0];
    if (confirmElement.classList.contains("hidden")) {
        confirmElement.classList.remove("hidden");
        removeElement.innerText = Labels.cancelLabel;
    } else {
        confirmElement.classList.add("hidden");
        removeElement.innerText = Labels.remove;
    }
}

function showPopupMenu(e) {
    const sessionNo = getParentSessionNo(e.target);
    const popupMenu = document.getElementById(sessionNo).getElementsByClassName("popupMenu")[0];
    if (popupMenu.classList.contains("hidden")) {
        popupMenu.classList.remove("hidden");

        //クリックしたセッション以外のポップアップを非表示
        const sessionElements = document.getElementsByClassName("session");
        for (let i of sessionElements) {
            if (i.id != sessionNo) {
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

function getParentSessionNo(element) {
    while (true) {
        element = element.parentElement;
        if (element.id != "") {
            let sessionNo = element.id;
            return sessionNo;
        }
    }
}

function getParentSessionId(element) {
    while (true) {
        element = element.parentElement;
        if (element.id != "") {
            let sessionId = element.dataset.id;
            return sessionId;
        }
    }
}

window.document.addEventListener('click', function (e) {
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
                number: parseInt(getParentSessionNo(e.target))
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
            const sessionNo = getParentSessionNo(e.target);
            browser.tabs.create({
                url: `../options/options.html#sessions?action=export&id=${sessions[sessionNo].id}`
            });
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

function sendOpenMessage(e, property) {
    browser.runtime.sendMessage({
        message: "open",
        number: parseInt(getParentSessionNo(e.target)),
        property: property
    });
}

function save(property = "default") {
    if (window.document.getElementById("saveName").value == "") name = "";
    else name = window.document.getElementById("saveName").value;
    browser.runtime.sendMessage({
        message: "save",
        name: name,
        property: property
    });
    window.document.getElementById("saveName").value = "";
}
