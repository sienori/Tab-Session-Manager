/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.document.getElementById("saveName").placeholder = browser.i18n.getMessage("initialNameValue");
window.document.getElementById("winCloseSessionName").innerText = browser.i18n.getMessage("winCloseSessionName");
window.document.getElementById("regularSaveSessionName").innerText = browser.i18n.getMessage("regularSaveSessionName");

openLabel = browser.i18n.getMessage("open");
removeLabel = browser.i18n.getMessage("remove");
windowLabel = browser.i18n.getMessage("windowLabel");
windowsLabel = browser.i18n.getMessage("windowsLabel");
tabLabel = browser.i18n.getMessage("tabLabel");
tabsLabel = browser.i18n.getMessage("tabsLabel");
noSessionLabel = browser.i18n.getMessage("noSessionLabel");
removeConfirmLabel = browser.i18n.getMessage("removeConfirmLabel");
cancelLabel = browser.i18n.getMessage("cancelLabel");

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
            return element.tag.split(' ').includes('temp');
        }

        //temp以外の更新のとき
        if (!diffSessions.every(tempOnly)) {
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


function sessionsHTML(i, info) {
    const detail = `${info.windowsNumber} ${(info.windowsNumber==1)?windowLabel:windowsLabel} - ${info.tabsNumber} ${(info.tabsNumber==1)?tabLabel:tabsLabel}`;

    return `<div id=${String(i)} class="session" data-tag="${info.tag}">
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
                    <li class=renameButton>Rename</li>
                </div>
            </div>
        </div>
        <div class=dateContainer>
            <span class="sessionDate">${info.sessionDate}</span>
        </div>
        <div class=buttonContainer>
            <span class="detail">${detail}</span>
            <div class=removeOpenButton>
                <span class="open">${openLabel}</span>
                <span class="remove">${removeLabel}</span>
            </div>
        </div>
        <div class="removeConfirm hidden">
            <span>${removeConfirmLabel}</span>
            <div class=buttonContainer>
                <span class="reallyRemove">${removeLabel}</span>
                <span class="cancel">${cancelLabel}</span>
            </div>
        </div>
        <div class="detailItems"></div>
    </div>`;
}

function showSessions() {
    const sessionsArea = window.document.getElementById("sessionsArea");
    sessionsArea.innerHTML = "";
    sessionsArea.insertAdjacentHTML('afterbegin', `<div class="noSessionLabel hidden">${noSessionLabel}</div>`);

    for (let i in sessions) {
        const date = moment(sessions[i].date);
        const info = {
            sessionName: sessions[i].name,
            sessionDate: date.format(S.get().dateFormat),
            tag: sessions[i].tag,
            tabsNumber: sessions[i].tabsNumber,
            windowsNumber: Object.keys(sessions[i].windows).length
        }
        sessionsArea.insertAdjacentHTML('afterbegin', sessionsHTML(i, info));
    }
    filterChange();
    sortChange();
}

function showDetail(e) {
    sessionNo = getParentSessionNo(e.target); //.parentElement.id;
    detail = window.document.getElementById(sessionNo).getElementsByClassName("detailItems")[0];
    if (detail.innerHTML == "") {
        let i = 0;
        for (let win in sessions[sessionNo].windows) {
            i++;
            detail.insertAdjacentHTML('beforeend',
                `<ul class="windowContainer">
                    <li class="windowTitleContainer">
                        <div class="windowIcon"></div>
                        <span class=windowTitle>${windowLabel} ${i}</span>
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
                    `<li class=tabContainer>
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
    } else {
        detail.innerHTML = "";
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

function clickSaveInput() {
    saveInput = window.document.getElementById("saveName");
    if (saveInput.value == browser.i18n.getMessage("initialNameValue")) {
        saveInput.value = "";
        saveInput.style.color = "#333";
    } else {

    }
}

function showRemoveConfirm(e) {
    let sessionNo = getParentSessionNo(e.target);
    let confirmElement = document.getElementById(sessionNo).getElementsByClassName("removeConfirm")[0];
    let removeElement = document.getElementById(sessionNo).getElementsByClassName("remove")[0];
    if (confirmElement.classList.contains("hidden")) {
        confirmElement.classList.remove("hidden");
        //removeElement.classList.add("hidden");
        removeElement.innerText = cancelLabel;
    } else {
        confirmElement.classList.add("hidden");
        //removeElement.classList.remove("hidden");
        removeElement.innerText = removeLabel;
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

function hideAllPopupMenu(e) {

    const isInMenuContainer = (element) => {
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

    if (!isInMenuContainer(e.target)) {
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
    }
    switch (e.target.className) {
        case "open":
            browser.runtime.sendMessage({
                message: "open",
                number: parseInt(getParentSessionNo(e.target))
            });
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
    }
})

window.document.addEventListener('keypress', (e) => {
    if (e.key == 'Enter') {
        if (e.target.id == 'saveName') {
            save();
        } else if (e.target.className == 'renameInput') {
            renameSend(e);
        }
    }
})

function save() {
    if (window.document.getElementById("saveName").value == "") name = "";
    else name = window.document.getElementById("saveName").value;
    browser.runtime.sendMessage({
        message: "save",
        name: name
    });
    window.document.getElementById("saveName").value = "";
}
