//TODO: 分にする
var sessions = [];
var settings={}
var autoSaveTimerArray=new Array();

InitialNameValue=browser.i18n.getMessage("initialNameValue");

getSettings();
browser.storage.onChanged.addListener(getSettings);
function getSettings() {
    browser.storage.local.get(["sessions", "settings"], function (value) {
        if (value.sessions != undefined) sessions = value.sessions;
        else sessions = [];
        
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
        
        //オートセーブ
        if(settings.ifAutoSave) {
            clearInterval(autoSaveTimerArray .shift());
            autoSaveTimerArray.push(setInterval(autoSave, settings.autoSaveInterval*60*1000));
        }else {
            clearInterval(autoSaveTimerArray .shift());
        }
    });
}

function setSettings() {
    browser.storage.local.set({
        'sessions': sessions
    });
}

function saveSession(name, tag) {
    browser.tabs.query({}).then(function (tabs) {
        session = {};
        session.windows = {};
        session.tabsNumber = 0;
        session.name = name;
        session.date = new Date();
        session.tag = tag;

        for (let tab of tabs) {
            if (session.windows[tab.windowId] == undefined) session.windows[tab.windowId] = {};
            session.windows[tab.windowId][tab.id] = tab;
            session.tabsNumber++;
        }
        if(tag=="auto"){
            if(ifChangeAutoSave(session)) sessions.push(session);
        }else {
            sessions.push(session);
        }
        setSettings();
    })
}

//前回の自動保存からタブが変わっているか判定
function ifChangeAutoSave(session){
    let lastAutoNumber=-1;
    for (let i in sessions){
        if(sessions[i].tag=="auto")lastAutoNumber=i;
    }
    
    //自動保存が無ければtrue
    if(lastAutoNumber==-1) return true;
    
    let lastItems=[];
    for(let win in sessions[lastAutoNumber].windows){
        lastItems.push(win);
        for(let tab in sessions[lastAutoNumber].windows[win]){
            id=sessions[lastAutoNumber].windows[win][tab].id;
            url=sessions[lastAutoNumber].windows[win][tab].url;
            lastItems.push(id, url);
        }
    }
    
    let newItems=[]
    for(let win in session.windows){
        newItems.push(win);
        for(let tab in session.windows[win]){
            id=session.windows[win][tab].id;
            url=session.windows[win][tab].url;
            newItems.push(id, url);
        }
    }
    
    return lastItems.toString()!=newItems.toString();//前回保存時とタブが異なればtrue
}

function removeSession(number) {
    sessions.splice(number, 1);
    setSettings();
}

function openSession(session) {
    flag = 0;
    for (let win in session.windows) { //ウィンドウごと
        if (flag == 0 && !settings.ifOpenNewWindow) { //一つ目のウィンドウは現在のウィンドウに上書き
            removeTab().then(function (currentWindow) {
                makeTab(session, win, currentWindow[0]);
            });
            flag = 1;
        } else {
            browser.windows.create().then(function (currentWindow) {
                makeTab(session, win, currentWindow);
            })
        }
    }
}

//ウィンドウとタブを閉じてcurrentWindowを返す
function removeTab() {
    return new Promise(function (resolve, reject) {
        browser.windows.getAll({}).then(function (windows) {
            for (let win in windows) { //ウィンドウごとに
                if (windows[win].focused == false) { //非アクティブのウィンドウを閉じる
                    browser.windows.remove(windows[win].id);
                } else {
                    browser.tabs.query({
                        currentWindow: true
                    }).then(function (tabs) {
                        for (let tab of tabs) {
                            if (tab.index != 0) browser.tabs.remove(tab.id); //アクティブウィンドウのタブを閉じる
                        }
                    })
                }
            }
            browser.windows.getAll({
                populate: true
            }).then(function (currentWindow) {
                resolve(currentWindow);
            });
        });
    })
}

function makeTab(session, win, currentWindow) {
    for (let tab in session.windows[win]) { //タブごと
        property = session.windows[win][tab];

        //特殊ページは新しいタブに置き換える
        if (property.url == "about:newtab" || property.url == "about:config" || property.url == "about:addons" || property.url == "about:debugging") {
            property.url = null;
        }

        //新しく開いたウィンドウの1個目のタブを書き換える
        if (session.windows[win][tab].index == 0) {
            if (property.url == null) {
                browser.tabs.create({
                    active: property.active,
                    index: property.index,
                    pinned: property.pinned,
                    url: property.url,
                    windowId: currentWindow.id
                });
                browser.tabs.remove(currentWindow.tabs[0].id);
            } else {
                browser.tabs.update(currentWindow.tabs[0].id, {
                    active: property.active,
                    pinned: property.pinned,
                    url: property.url
                });
            }
        } else {
            browser.tabs.create({
                active: property.active,
                index: property.index,
                pinned: property.pinned,
                url: property.url,
                windowId: currentWindow.id
            });
        }
    }
}

function autoSave(){
    autoNumber=0;
    let firstAutoNumber;
    
    for (let i in sessions){
        if(sessions[i].tag=="auto"){
            autoNumber++;
            if(autoNumber==1) firstAutoNumber=i;
        }
    }
    if(autoNumber>settings.autoSaveLimit){
        removeSession(firstAutoNumber);
    }
    saveSession("auto saved", "auto");
    
}

browser.runtime.onMessage.addListener(function (request) {
    switch (request.message) {
        case "save":
            if(request.name==InitialNameValue) name="";
            else name=request.name;
            saveSession(name, "user");
            break;
        case "open":
            openSession(sessions[request.number]);
            break;
        case "remove":
            removeSession(request.number);
            break;
    }
});
