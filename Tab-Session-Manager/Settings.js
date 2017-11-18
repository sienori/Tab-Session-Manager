/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//初回起動時にオプションページを表示して設定を初期化
//Display option page at initial startup and initialize settings
/*
browser.runtime.onInstalled.addListener(function(){
    browser.runtime.openOptionsPage();
});
*/
function settingsObj() {};
(function () {

    //オプションページを書き換え，設定の初期化
    //Rewrite option page, initialize setting
    settingsObj.prototype.initOptionsPage = function () {
        return new Promise(function (resolve, reject) {
            labelSet();
            getSettingsByHtml();
            overRideSettingsByStorage().then(function () {
                overRideHtml();
                saveSettings();
                resolve();
            });
        })
    };
    //オプションページから設定を保存
    //Save settings from options page
    settingsObj.prototype.saveOptionsPage = function () {
        return new Promise(function (resolve, reject) {
            getSettingsByHtml();
            saveSettings().then(function () {
                resolve();
            });
        })
    };
    //設定を初期化
    //Initialize setting
    settingsObj.prototype.init = function () {
        return new Promise(function (resolve, reject) {
            getSettings().then(function () {
                resolve(Settings);
            })
        })
    }
    //設定を返す
    //return settings
    settingsObj.prototype.get = function () {
        return Settings;
    };
    //受け取ったオブジェクトを保存
    //Save the received object
    settingsObj.prototype.save = function (settings) {
        return new Promise(function (resolve, reject) {
            for (let i in settings) {
                Settings[i] = settings[i];
            }
            saveSettings().then(function () {
                resolve();
            });
        })
    };
    //設定を削除
    //Delete settings
    settingsObj.prototype.clear = function (setting) {
        return new Promise(function (resolve, reject) {
            delete Settings[setting];
            saveSettings().then(function () {
                resolve();
            })
        })
    }
    //全ての設定を削除
    //Delete all settings
    settingsObj.prototype.clearAll = function () {
        return new Promise(function (resolve, reject) {
            Settings = new settingsObj();
            saveSettings().then(function () {
                resolve();
            })
        })
    }

    //let Settings = new settingsObj();
    let Settings = {};
    //S = new settingsObj(); //外部から呼び出し Call from outside

    //spanやoptionのid，buttonのclassに"Label"が含まれるときi18nから値を取得して書き換え
    //When "label" is included in span and option id, button class Retrieve the value from i18n and rewrite it
    function labelSet() {
        /*
                //span idにLableが含まれていたら
                let spans = document.getElementsByTagName("span");
                for (let i in spans) {
                    if (spans[i].id == undefined || spans[i].id.indexOf("Label") == -1) continue;
                    let label = browser.i18n.getMessage(spans[i].id);
                    if (label == "") continue;
                    spans[i].innerHTML = label;
                }

                //p idにLableが含まれていたら
                let p = document.getElementsByTagName("p");
                for (let i in p) {
                    if (p[i].id == undefined || p[i].id.indexOf("Label") == -1) continue;
                    let label = browser.i18n.getMessage(p[i].id);
                    if (label == "") continue;
                    p[i].innerHTML = label;
                }
        */
        //span,p: idかclassにLabelが含まれていたら
        textLabelSet("p");
        textLabelSet("span");

        function textLabelSet(tagName) {
            let items = document.getElementsByTagName(tagName);
            for (let i of items) {
                let label;
                if (i.id != undefined && i.id.indexOf("Label") != -1) {
                    label = browser.i18n.getMessage(i.id);
                } else if (i.className != undefined && i.className.indexOf("Label") != -1) {
                    let classNames = i.className.split(' ');
                    let labelName;
                    for (let n in classNames) {
                        if (classNames[n].indexOf("Label") != -1) {
                            labelName = classNames[n];
                            break;
                        }
                    }
                    label = browser.i18n.getMessage(labelName);
                } else {
                    continue;
                }
                i.innerHTML = label;
            }
        }

        //button, submit, text classにLabelが含まれていたら
        let inputs = document.getElementsByTagName("input");
        for (let i in inputs) {
            if (inputs[i].id == undefined || inputs[i].className.indexOf("Label") == -1) continue;
            let classNames = inputs[i].className.split(' ');
            let labelName;
            for (let n in classNames) {
                if (classNames[n].indexOf("Label") != -1) labelName = classNames[n];
            }
            let label = browser.i18n.getMessage(labelName);
            if (label == "") continue;

            switch (inputs[i].type) {
                case "button":
                case "submit":
                    inputs[i].value = label;
                    break;
                case "text":
                    inputs[i].placeholder = label;
            }
        }

        //options idにLabelが含まれていたら
        let options = document.getElementsByTagName("option");
        for (let i in options) {
            if (options[i].id == undefined || options[i].id.indexOf("Label") == -1) continue;
            let label = browser.i18n.getMessage(options[i].id);
            if (label == "") continue;

            options[i].innerHTML = label;
        }
    }

    //storageからSettingsの項目を取得して存在しない物をSettingsに上書き
    //Retrieve the Settings item from storage and overwrite Settings that do not exist
    function overRideSettingsByStorage() {
        return new Promise(function (resolve, reject) {
            browser.storage.local.get("Settings", function (value) {

                for (let i in Settings) {
                    if (value.Settings != undefined && value.Settings[i] != undefined) {
                        Settings[i] = value.Settings[i];
                    }
                }
                for (let i in value.Settings) {
                    if (Settings[i] == undefined) Settings[i] = value.Settings[i];
                }
                resolve();
            })
        })
    }

    //オプションページにSettingsを反映
    //Reflect Settings on option page
    function overRideHtml() {
        let inputs = document.getElementsByTagName("input");
        for (let i in inputs) {
            if (inputs[i].id == undefined) continue;
            if (inputs[i].className != undefined && inputs[i].className.indexOf("noSetting") != -1) continue;

            switch (inputs[i].type) {
                case "text":
                case "number":
                case "search":
                case "tel":
                case "url":
                case "email":
                case "password":
                case "datetime":
                case "month":
                case "week":
                case "time":
                case "datetime-local":
                case "range":
                case "color":
                    inputs[i].value = Settings[inputs[i].id];
                    break;
                case "checkbox":
                    inputs[i].checked = Settings[inputs[i].id];
                    break;
                case "radio":
                    if (Settings[inputs[i].name] == inputs[i].value) {
                        inputs[i].checked = true;
                    }
                    break;
            }
        }
        let textareas = document.getElementsByTagName("textarea");
        for (let i in textareas) {
            if (textareas[i].id == undefined) continue;
            if (textareas[i].className != undefined && textareas[i].className.indexOf("noSetting") != -1) continue;
            textareas[i].value = Settings[textareas[i].id];
        }

        let selects = document.getElementsByTagName("select");
        for (let i in selects) {
            if (selects[i].id == undefined) continue;
            if (selects[i].className != undefined && inputs[i].className.indexOf("noSetting") != -1) continue;

            selects[i].value = Settings[selects[i].id];
        }
    }

    //オプションページから設定の値を取得
    //Get setting value from option page
    function getSettingsByHtml() {
        let inputs = document.getElementsByTagName("input");

        for (let i in inputs) {
            if (inputs[i].id == undefined) continue;
            if (inputs[i].className != undefined && inputs[i].className.indexOf("noSetting") != -1) continue;

            switch (inputs[i].type) {
                case "text":
                case "number":
                case "search":
                case "tel":
                case "url":
                case "email":
                case "password":
                case "datetime":
                case "month":
                case "week":
                case "time":
                case "datetime-local":
                case "range":
                case "color":
                    Settings[inputs[i].id] = inputs[i].value;
                    break;
                case "checkbox":
                    Settings[inputs[i].id] = inputs[i].checked;
                    break;
                case "radio":
                    if (inputs[i].checked == true) {
                        Settings[inputs[i].name] = inputs[i].value;
                    }
                    break;
            }
        }

        let textareas = document.getElementsByTagName("textarea");
        for (let i in textareas) {
            if (textareas[i].id == undefined) continue;
            if (textareas[i].className != undefined && textareas[i].className.indexOf("noSetting") != -1) continue;
            Settings[textareas[i].id] = textareas[i].value;
        }

        let selects = document.getElementsByTagName("select");
        for (let i in selects) {
            if (selects[i].id == undefined) continue;
            if (selects[i].className != undefined && selects[i].className.indexOf("noSetting") != -1) continue;

            Settings[selects[i].id] = selects[i].value;
        }
    }

    //ストレージが変更されたらget
    browser.storage.onChanged.addListener(getSettings);

    function getSettings() {
        return new Promise(function (resolve, reject) {
            browser.storage.local.get("Settings", function (value) {
                Settings = value.Settings;
                resolve(Settings);
            });
        })
    }

    function saveSettings() {
        return new Promise(function (resolve, reject) {
            browser.storage.local.set({
                'Settings': Settings
            }).then(function () {
                resolve(Settings);
            });
        })
    }

}());
