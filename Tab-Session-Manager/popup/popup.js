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
    showSessions();
    browser.storage.onChanged.addListener(getSessions);
}, 100);

let sessions = [];
let BeforeSessions = {};

function getSessions() {
    browser.storage.local.get(["sessions"], function (value) {
        if (value.sessions != undefined) sessions = value.sessions;
        else sessions = [];

        if (JSON.stringify(BeforeSessions) != JSON.stringify(sessions)) {
            //TODO:tempの変化でhtmlが更新されてしまう
            showSessions();
            displayChange();
        }
        BeforeSessions = sessions;
    });
}

window.document.getElementById("filter").addEventListener("change", displayChange);

function displayChange() {
    let filter = window.document.getElementById("filter").value;
    S.save({
        'filter': filter
    });
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

function sessionsHTML(i) {
    return '<div id=' + String(i) + ' class="session">' +
        '<div class=nameContainer>' +
        '<div class="renameButton"></div>' +
        '<div class="renameArea">' +
        '<div class=renameContainer>' +
        '<input class="renameInput" type="text">' +
        '<input class=renameSend type="button">' +
        '</div>' +
        '</div>' +
        '<div class="sessionName"></div>' +
        '</div>' +
        '<div class=dateContainer>' +
        '<span class="sessionDate"></span>' +
        '</div>' +
        '<div class=buttonContainer>' +
        '<span class="detail"></span>' +
        '<div class=removeOpenButton>' +
        '<span class="open">' + openLabel + '</span> ' +
        '<span class="remove">' + removeLabel + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="removeConfirm hidden"><span>' + removeConfirmLabel + '</span>' +
        '<div class=buttonContainer>' +
        '<span class="reallyRemove">' + removeLabel + '</span>' +
        '<span class="cancel">' + cancelLabel + '</span> ' +
        '</div></div> ' +
        '<div class="detailItems"></div>' +
        '</div>';
}

window.document.getElementById("sort").addEventListener("change", showSessions);

function showSessions() {
    sessionsArea = window.document.getElementById("sessionsArea");
    scrollPosition = sessionsArea.scrollTop;
    sessionsArea.innerHTML = "";
    sort = window.document.getElementById("sort").value
    S.save({
        'sort': sort
    })
    for (i = 0; i < Object.keys(sessions).length; i++) { //sessionごとに
        //sessionをソートオプションに応じて追加
        if (sort == "newest") sessionsArea.insertAdjacentHTML('afterbegin', sessionsHTML(i));
        else if (sort == "oldest") sessionsArea.insertAdjacentHTML('beforeend', sessionsHTML(i));

        session = window.document.getElementById(String(i));
        session.getElementsByClassName("sessionName")[0].innerText = sessions[i].name;

        date = moment(sessions[i].date);
        session.getElementsByClassName("sessionDate")[0].innerText = date.format(S.get().dateFormat);

        //tag
        session.dataset.tag = sessions[i].tag;

        //detail
        detail = session.getElementsByClassName("detail")[0]; //.parentElement;
        tabsNumber = sessions[i].tabsNumber;
        windowsNumber = Object.keys(sessions[i].windows).length;
        if (windowsNumber == 1) detail.innerText += windowsNumber + " " + windowLabel;
        else detail.innerText += windowsNumber + " " + windowsLabel;
        if (tabsNumber == 1) detail.innerText += " - " + tabsNumber + " " + tabLabel;
        else detail.innerText += " - " + tabsNumber + " " + tabsLabel;

    }
    sessionsArea.insertAdjacentHTML('afterbegin', '<div class="noSessionLabel hidden">' + noSessionLabel + '</div>');
    sessionsArea.scrollTop = scrollPosition;
}

function showDetail(e) {
    sessionNo = getParentSessionNo(e.target); //.parentElement.id;
    detail = window.document.getElementById(sessionNo).getElementsByClassName("detailItems")[0];
    if (detail.innerHTML == "") {
        let i = 0;
        for (let win in sessions[sessionNo].windows) {
            i++;
            detail.insertAdjacentHTML('beforeend', '<li class="windowContainer"><div class="windowIcon"></div><span class=windowTitle>' + windowLabel + " " + i + '</span></li>')

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

                let tabHtml = '<li class=tabContainer>' +
                    '<div class=fav style="background-image:url(' + tabFavIconUrl + ')"></div>' +
                    '<div class="tabTitle"><a href=' + tabUrl + '></a></div>' +
                    '</li>'

                detail.insertAdjacentHTML('beforeend', tabHtml);

                //tabTitleにhtmlタグが含まれている事があるので，innerTextで挿入
                let tabTitleElements = detail.getElementsByClassName('tabTitle');
                tabTitleElements[tabTitleElements.length - 1].getElementsByTagName('a')[0].innerText = tabTitle;
            }
        }
    } else {
        detail.innerHTML = "";
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
    sessionNo = getParentSessionNo(e.target); //.parentElement.parentElement.id;
    sessionName = window.document.getElementById(sessionNo).getElementsByClassName("sessionName")[0];
    renameArea = window.document.getElementById(sessionNo).getElementsByClassName("renameArea")[0];
    renameInput = renameArea.getElementsByClassName("renameInput")[0].value;

    sessions[sessionNo].name = renameInput;

    browser.storage.local.set({
        'sessions': sessions
    });
    renameArea.style.display = "none";
    sessionName.style.display = "block";
    showSessions();
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
    }
})
