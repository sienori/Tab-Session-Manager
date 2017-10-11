labels = ["ifAutoSaveLabel", "ifAutoSaveWhenCloseLabel", "autoSaveIntervalLabel", "autoSaveLimitLabel", "autoSaveWhenCloseLimitLabel", "dateFormatLabel", "ifOpenNewWindowLabel", "ifSupportTstLabel"];
setLabel(labels);

function setLabel(labels) {
    for (let l of labels) {
        window.document.getElementById(l).innerHTML = browser.i18n.getMessage(l);
    }
}
window.document.getElementById("save").value = browser.i18n.getMessage("save");

var ifOpenNewWindow = document.getElementById("ifOpenNewWindow");
var ifAutoSave = document.getElementById("ifAutoSave");
var autoSaveInterval = document.getElementById("autoSaveInterval");
var autoSaveLimit = document.getElementById("autoSaveLimit");
var ifAutoSaveWhenClose = document.getElementById("ifAutoSaveWhenClose");
var autoSaveWhenCloseLimit = document.getElementById("autoSaveWhenCloseLimit");
var dateFormat = document.getElementById("dateFormat");
var ifSupportTst = document.getElementById("ifSupportTst");

settings = {};
//設定を読み込んで反映
browser.storage.local.get(["settings"], function (value) {
    
    //例:settings.ifAutoSave = value.settings.ifAutoSave;
    let settingItems = ["ifAutoSave", "autoSaveInterval", "autoSaveLimit", "ifAutoSaveWhenClose", "autoSaveWhenCloseLimit", "dateFormat", "ifOpenNewWindow", "ifSupportTst"];
    for (let i = 0; i < settingItems.length; i++) {
            settings[settingItems[i]] = value.settings[settingItems[i]];
    }

    ifAutoSave.checked = settings.ifAutoSave;
    autoSaveInterval.value = settings.autoSaveInterval;
    autoSaveLimit.value = settings.autoSaveLimit;
    ifAutoSaveWhenClose.checked = settings.ifAutoSaveWhenClose;
    autoSaveWhenCloseLimit.value = settings.autoSaveWhenCloseLimit;
    dateFormat.value = settings.dateFormat;
    ifOpenNewWindow.checked = settings.ifOpenNewWindow;
    ifSupportTst.checked = settings.ifSupportTst;

});

function save() {
    settings.ifAutoSave = ifAutoSave.checked;
    settings.autoSaveInterval = autoSaveInterval.value;
    settings.autoSaveLimit = autoSaveLimit.value;
    settings.ifAutoSaveWhenClose = ifAutoSaveWhenClose.checked;
    settings.autoSaveWhenCloseLimit = autoSaveWhenCloseLimit.value;
    settings.dateFormat = dateFormat.value;
    settings.ifOpenNewWindow = ifOpenNewWindow.checked;
    settings.ifSupportTst = ifSupportTst.checked;
    browser.storage.local.set({
        'settings': settings
    }, function () {});
}

document.addEventListener('click', function (e) {
    switch (e.target.id) {
        case "save":
            save();
            break;
    }
});
