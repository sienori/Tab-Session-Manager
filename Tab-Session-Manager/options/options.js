labels = ["ifAutoSaveLabel", "autoSaveIntervalLabel", "autoSaveLimitLabel", "dateFormatLabel", "ifOpenNewWindowLabel"];
setLabel(labels);
function setLabel(labels) {
    for (let l of labels) {
        window.document.getElementById(l).innerHTML = browser.i18n.getMessage(l);
    }
}
window.document.getElementById("save").value = browser.i18n.getMessage("save");

var ifAutoSave = document.getElementById("ifAutoSave");
var autoSaveInterval = document.getElementById("autoSaveInterval");
var autoSaveLimit = document.getElementById("autoSaveLimit");
var dateFormat = document.getElementById("dateFormat");
var ifOpenNewWindow = document.getElementById("ifOpenNewWindow");




settings = {};
//設定を読み込んで反映
browser.storage.local.get(["settings"], function (value) {
    if (value.settings == undefined) {
        settings.ifAutoSave = true;
        settings.autoSaveInterval = 15;
        settings.autoSaveLimit = 50;
        settings.dateFormat = "YYYY.MM.DD HH:mm:ss";
        settings.ifOpenNewWindow=true;
    } else {
        settings.ifAutoSave = value.settings.ifAutoSave;
        settings.autoSaveInterval = value.settings.autoSaveInterval;
        settings.autoSaveLimit = value.settings.autoSaveLimit;
        settings.dateFormat = value.settings.dateFormat;
        settings.ifOpenNewWindow=value.settings.ifOpenNewWindow;
    }

    ifAutoSave.checked = settings.ifAutoSave;
    autoSaveInterval.value = settings.autoSaveInterval;
    autoSaveLimit.value = settings.autoSaveLimit;
    dateFormat.value = settings.dateFormat;
    ifOpenNewWindow.checked=settings.ifOpenNewWindow;
});

function save() {
    settings.ifAutoSave = ifAutoSave.checked;
    settings.autoSaveInterval = autoSaveInterval.value;
    settings.autoSaveLimit = autoSaveLimit.value;
    settings.dateFormat = dateFormat.value;
    settings.ifOpenNewWindow=ifOpenNewWindow.checked;
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
