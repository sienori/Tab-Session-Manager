/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//TODO: remove確認 絞込みの状態を保持 セッションはありません←tempのため表示されない

labels = ["displayAllLabel", "displayUserLabel", "displayAutoLabel", "newestLabel", "oldestLabel", "save"];
setLabel(labels);

function setLabel(labels) {
    for (let l of labels) {
        window.document.getElementById(l).innerHTML = browser.i18n.getMessage(l);
    }
}
window.document.getElementById("saveName").placeholder = browser.i18n.getMessage("initialNameValue")
openLabel = browser.i18n.getMessage("open");
removeLabel = browser.i18n.getMessage("remove");
windowLabel = browser.i18n.getMessage("windowLabel");
windowsLabel = browser.i18n.getMessage("windowsLabel");
tabLabel = browser.i18n.getMessage("tabLabel");
tabsLabel = browser.i18n.getMessage("tabsLabel");
noSessionLabel = browser.i18n.getMessage("noSessionLabel");

let S = new settingsObj()
S.init();

var sessions = [];
getSessions();
showSessions();
browser.storage.onChanged.addListener(getSessions);

function getSessions() {
    browser.storage.local.get(["sessions"], function (value) {
        if (value.sessions != undefined) sessions = value.sessions;
        else sessions = [];

        //既存の要素数と異なるとき描画
        sessionsNumber = Object.keys(sessions).length;
        displaiedNumber = window.document.getElementById("sessionsArea").childElementCount;
        if (sessionsNumber != displaiedNumber) showSessions();

        displayChange();
    });
}

function displayChange() {
    if (window.document.getElementById("displayAll").checked) {
        items = document.getElementsByClassName("session");
        for (let i of items) {
            i.style.display = "block";
        }
    } else if (window.document.getElementById("displayUser").checked) {
        items = document.getElementsByClassName("user");
        for (let i of items) {
            i.style.display = "block";
        }
        items = document.getElementsByClassName("auto");
        for (let i of items) {
            i.style.display = "none";
        }
    } else if (window.document.getElementById("displayAuto").checked) {
        items = document.getElementsByClassName("auto");
        for (let i of items) {
            i.style.display = "block";
        }
        items = document.getElementsByClassName("user");
        for (let i of items) {
            i.style.display = "none";
        }
    }
}

function sessionsHTML(i) {
    return '<div id=' + String(i) + ' class="session">' +
        '<div class="renameButton"></div>' +
        '<div class="renameArea">' +
        '<input class="renameInput" type="text">' +
        '<input class=renameSend type="button">' +
        '</div>' +
        '<div class="sessionName"></div>' +
        '<span class="detail"></span><br>' +
        '<span class="detailItems"></span>' +
        '<span class="sessionDate"></span>' +
        '<span class="remove">' + removeLabel + '</span>' +
        '<span class="open">' + openLabel + '</span> ' +
        '</div>';
}

window.document.getElementById("sort").addEventListener("change", showSessions);

function showSessions() {
    sessionsArea = window.document.getElementById("sessionsArea");
    scrollPosition = sessionsArea.scrollTop;
    if (Object.keys(sessions).length == 0) {
        sessionsArea.innerHTML = noSessionLabel;
    } else {
        sessionsArea.innerHTML = "";
        for (i = 0; i < Object.keys(sessions).length; i++) { //sessionごとに
            //sessionをソートオプションに応じて追加
            sort = window.document.getElementById("sort").value
            if (sort == "newest") sessionsArea.insertAdjacentHTML('afterbegin', sessionsHTML(i));
            else if (sort == "oldest") sessionsArea.insertAdjacentHTML('beforeend', sessionsHTML(i));

            session = window.document.getElementById(String(i));
            session.getElementsByClassName("sessionName")[0].innerText = sessions[i].name;

            date = moment(sessions[i].date);
            session.getElementsByClassName("sessionDate")[0].innerText = date.format(S.get().dateFormat);

            //tag
            for (let t of sessions[i].tag.split(" ")) {
                session.classList.add(t);
            }

            //detail
            detail = session.getElementsByClassName("detail")[0]; //.parentElement;
            tabsNumber = sessions[i].tabsNumber;
            windowsNumber = Object.keys(sessions[i].windows).length;
            if (windowsNumber == 1) detail.innerText += windowsNumber + windowLabel;
            else detail.innerText += windowsNumber + windowsLabel;
            if (tabsNumber == 1) detail.innerText += " " + tabsNumber + tabLabel;
            else detail.innerText += " " + tabsNumber + tabsLabel;

        }
    }
    sessionsArea.scrollTop = scrollPosition;
}

function showDetail(e) {
    sessionNo = e.target.parentElement.id;
    detail = window.document.getElementById(sessionNo).getElementsByClassName("detailItems")[0];
    if (detail.innerHTML == "") {
        i = 0;
        for (let win in sessions[sessionNo].windows) {
            i++;
            detail.insertAdjacentHTML('beforeend', '<li class="windows">' + windowLabel + i + '</li>')

            let sortedTabs = [];
            for (let tab in sessions[sessionNo].windows[win]) {
                sortedTabs[sessions[sessionNo].windows[win][tab].index] = sessions[sessionNo].windows[win][tab].id;
            }

            for (let tab of sortedTabs) {
                tabTitle = sessions[sessionNo].windows[win][tab].title;
                tabUrl = sessions[sessionNo].windows[win][tab].url;
                tabFavIconUrl = sessions[sessionNo].windows[win][tab].favIconUrl;
                if (tabFavIconUrl == undefined) tabFavIconUrl = "/icons/favicon.png";

                detail.insertAdjacentHTML('beforeend', '<div class="fav"></div><div class="tabs"><a></a></div>');

                a = detail.getElementsByTagName("a");
                a[a.length - 1].href = tabUrl;
                a[a.length - 1].innerText = tabTitle;

                tabs = detail.getElementsByClassName("tabs");
                //tabs[tabs.length-1].insertAdjacentText=("afterbegin",tabTitle);

                arr = detail.getElementsByClassName("fav");
                arr[arr.length - 1].style.backgroundImage = "url(" + tabFavIconUrl + ")";
            }
        }
    } else {
        detail.innerHTML = "";
    }
}

function rename(e) {
    sessionNo = e.target.parentElement.id;
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
    sessionNo = e.target.parentElement.parentElement.id;
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

window.document.addEventListener('click', function (e) {
    //console.log(e.target);
    switch (e.target.id) {
        case "displayAll":
        case "displayUser":
        case "displayAuto":
            displayChange();
            break;
        case "setting":
            browser.runtime.openOptionsPage();
            break;
        case "saveName":
            clickSaveInput();
            break;
    }
    switch (e.target.className) {
        case "save":
            if (window.document.getElementById("saveName").value == "") name = "";
            else name = window.document.getElementById("saveName").value;
            browser.runtime.sendMessage({
                message: "save",
                name: name
            });
            window.document.getElementById("saveName").value = "";
            break;
        case "open":
            browser.runtime.sendMessage({
                message: "open",
                number: parseInt(e.target.parentElement.id)
            });
            break;
        case "remove":
            browser.runtime.sendMessage({
                message: "remove",
                number: parseInt(e.target.parentElement.id)
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
