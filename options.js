var options;

function initDefaultSettings(){
    // None right now
    // Use below code if needed later:
    //if (options['imdb-enabled'] == null) options['imdb-enabled'] = true;
}

// Load from storage
async function load() {
    options = await browser.storage.sync.get().then(function (storedSettings) {
        return storedSettings;
    });
    // Init default settings
    initDefaultSettings();

    set();
}

function save() {
    browser.storage.sync.set(options);
}

function set() {
    Object.keys(options).forEach(key => {
        var element = document.querySelector('#' + key);
        if (element != null) {
            switch (typeof (options[key])) {
                case ('boolean'):
                    element.checked = options[key];
                    break;
                case ('string'):
                    element.value = options[key];
                    break;
            }
            checkSubIDToDisable(element);

            if (element.getAttribute("permission") != null) {
                checkPermission(element);
            }
        }
    })
}

async function checkPermission(element) {
    // Check for Permissions
    let permissionsToRequest = { origins: [element.getAttribute("permission")] };
    var response = await browser.permissions.contains(permissionsToRequest);

    var div = element.parentNode.parentNode.querySelector(".div-request-permission");
    if (div != null) {
        if (response == true && element.checked == true) {
            // Permission exists and setting is enabled
            div.setAttribute("style", "display:none;");
        } else if (response == false && element.checked == true) {
            // Permission does NOT exist and setting is enabled
            div.setAttribute("style", "display:block;");
        } else {
            div.setAttribute("style", "display:none;");
        }
    }

    // Check for content scripts
    let id = element.getAttribute("contentScriptID");
    let scripts = await browser.scripting.getRegisteredContentScripts();
    scripts = scripts.map((script) => script.id);
    response = (scripts.includes(id));

    div = element.parentNode.parentNode.querySelector(".div-request-contentscript");
    if (div != null) {
        if (response == true && element.checked == true) {
            // Permission exists and setting is enabled
            div.setAttribute("style", "display:none;");
        } else if (response == false && element.checked == true) {
            // Permission does NOT exist and setting is enabled
            div.setAttribute("style", "display:block;");
        } else {
            div.setAttribute("style", "display:none;");
        }
    }
}

function checkSubIDToDisable(element) {
    if (element.getAttribute("subid") != null) {
        var target = document.querySelector("#" + element.getAttribute("subid"));
        var targetValue = element.getAttribute("subidvalue");

        if (targetValue != null) {
            if (element.value == targetValue) {
                target.className = target.className.replace("disabled", "");
            } else {
                target.className += " disabled";
            }
        } else {
            if (element.checked) {
                target.className = target.className.replace("disabled", "");
            } else {
                target.className += " disabled";
            }
        }
    }
}


// On change, save
document.addEventListener('change', event => {
    if (event.target.id == "importpicker") {
        validateImportButton();
    } else {
        changeSetting(event);
    }
});

async function changeSetting(event) {
    switch (event.target.type) {
        case ('checkbox'):
            options[event.target.id] = event.target.checked;
            break;
        default:
            options[event.target.id] = event.target.value;
            break;
    }
    checkSubIDToDisable(event.target);

    save();

    if (event.target.getAttribute("permission") != null) {
        let permissionsToRequest = { origins: [event.target.getAttribute("permission")] };
        if (event.target.getAttribute("permissionBrowser") != null) {
            permissionsToRequest = { origins: [event.target.getAttribute("permission")], permissions: [event.target.getAttribute("permissionBrowser")] };
        }

        if (event.target.checked == true) {
            const response = await browser.permissions.request(permissionsToRequest);

            if (response != true) {
                event.target.checked = false;
                options[event.target.id] = event.target.checked;
                save();
            }
        } else {
            browser.permissions.remove(permissionsToRequest);
            checkPermission(event.target); // this will hide the "missing permission" if it's showing
        }
        checkSubIDToDisable(event.target);

        if (event.target.getAttribute('contentScript') != null) {
            const response = await registerContentScript(event.target);

            if (response != true) {
                event.target.checked = false;
                options[event.target.id] = event.target.checked;
                save();
            }
        }
    }
}

// Request permission if missing
document.addEventListener('click', event => {
    if (event.target.getAttribute("class") != null && event.target.getAttribute("class") == "request-permission" && event.target.getAttribute("permissionTarget") != null) {
        requestPermission(event);
    }
    if (event.target.getAttribute("class") != null && event.target.getAttribute("class") == "request-contentscript" && event.target.getAttribute("permissionTarget") != null) {
        var target = document.querySelector("#" + event.target.getAttribute("permissionTarget"));
        registerContentScript(target);
    }

    switch (event.target.id) {
        case "export":
            exportSettings();
            break;
        case "import":
            importSettings();
            break;
        case "reset":
            resetSettings();
            break;
    }
});

async function requestPermission(event) {
    // Get the element that has the permission
    var permissionTarget = document.querySelector("#" + event.target.getAttribute("permissionTarget"));
    // Make sure it has the permission
    if (permissionTarget.getAttribute("permission") != null) {
        // Get the permission from the element that has it
        var permission = permissionTarget.getAttribute("permission");
        let permissionsToRequest = { origins: [permission] };

        // Request the permission
        const response = await browser.permissions.request(permissionsToRequest);
        if (response == true) {
            event.target.parentNode.setAttribute("style", "display:none;");
        }
    }
}

async function registerContentScript(target) {
    var id = target.getAttribute('contentScriptID');
    var js = target.getAttribute('contentScript');
    var match = target.getAttribute('permission');

    if (target.checked) {
        // Register
        const script = {
            id: id,
            js: [js],
            matches: [match],
        };

        try {
            await browser.scripting.registerContentScripts([script]);
        } catch (err) {
            console.error(`failed to register content scripts: ${err}`);
            return false;
        }

        var request = target.parentNode.parentNode.querySelector('.div-request-contentscript');
        if (request != null) {
            request.setAttribute("style", "display:none;");
        }
    } else {
        // Unregister
        try {
            await browser.scripting.unregisterContentScripts({
                ids: [id],
            });
        } catch (err) {
            console.error(`failed to unregister content scripts: ${err}`);
            return false;
        }
    }

    return true;
}

// On load, load
document.addEventListener('DOMContentLoaded', event => {
    load();
    //validateImportButton();
});

function validateImportButton() {
    const importPicker = document.querySelector("#importpicker");
    const importButton = document.querySelector("#import");

    importButton.disabled = (importPicker.value == "");
}

async function exportSettings() {
    // Create JSON
    var settings = await browser.storage.sync.get().then(function (storedSettings) {
        if (storedSettings["convert-ratings"] === true) {
            storedSettings["convert-ratings"] = "5";
        }
        return storedSettings;
    });

    const userdata = {
        timeStamp: Date.now(),
        version: browser.runtime.getManifest().version,
        settings: settings
    }

    const timeOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };

    var url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(userdata, null, '  '));
    var date = (new Date).toLocaleDateString('ja-JP', timeOptions);
    var filename = 'letterboxd-extras-backup-' + date + '.json';

    // Download
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename || '');
    a.setAttribute('type', 'text/plain');
    a.dispatchEvent(new MouseEvent('click'));
}

async function importSettings() {
    const importPicker = document.querySelector("#importpicker");

    // Make sure file is selected
    if (importPicker.files.length == 0) {
        window.alert("No file selected.")
        return;
    }

    // Get file and read the contents
    const selectedFile = importPicker.files[0];
    const content = await readFileAsText(selectedFile);
    
    var json;
    var error = "";
    try {
        json = JSON.parse(content);
    } catch(err) {
        error = "File is not valid JSON."
    }

    if (json != null){
        // Validate file contents
        if (json.timeStamp == null || json.version == null || json.settings == null){
            error = "File is not a valid Letterboxd Extras backup."
        }
        if (json.version != null && versionCompare(json.version, browser.runtime.getManifest().version, {lexicographical: false, zeroExtend: true}) > 0){
            error = "Backup is from a newer version (" + json.version + ") than the current add-on (" + browser.runtime.getManifest().version + "). Please update before importing settings."
        }
    }

    if (error != ""){
        window.alert("Invalid file: " + error + "\n\nThe import could not be completed");
        return;
    }

    // Read timestamp from file
    const date = (new Date(json.timeStamp)).toLocaleDateString(window.navigator.language);

    // Confirmation Popup
    if (!window.confirm("Your settings will be overwritten with data backed up on " + date + ".\n\nOverwrite all settings with data from file?")) {
        return;
    }

    options = json.settings;
    set();
    save();

    window.alert("Your settings have been restored from file")
}

async function resetSettings(){
    // Confirmation Popup
    if (!window.confirm("Your settings will be reset.\n\nReset all settings to default?")) {
        return;
    }

    options = {};
    initDefaultSettings();
    save();
    set();
}

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            resolve(e.target.result); // Resolve the promise with file content
        };
        
        reader.onerror = function(e) {
            reject(e); // Reject the promise if an error occurs
        };
        
        reader.readAsText(file);
    });
}

// https://gist.github.com/TheDistantSea/8021359
function versionCompare(v1, v2, options) {
    var lexicographical = options && options.lexicographical,
        zeroExtend = options && options.zeroExtend,
        v1parts = v1.split('.'),
        v2parts = v2.split('.');

    function isValidPart(x) {
        return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
    }

    if (zeroExtend) {
        while (v1parts.length < v2parts.length) v1parts.push("0");
        while (v2parts.length < v1parts.length) v2parts.push("0");
    }

    if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length == i) {
            return 1;
        }

        if (v1parts[i] == v2parts[i]) {
            continue;
        }
        else if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        else {
            return -1;
        }
    }

    if (v1parts.length != v2parts.length) {
        return -1;
    }

    return 0;
}