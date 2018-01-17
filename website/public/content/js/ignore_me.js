'use esversion: 6';

var repoId = '';
var writableRepos = [];
var availableApps;
var availableDevs;
var retryCnt = 0;
const authUrl = generateStUrl('hub');
const fetchReposUrl = generateStUrl('github/writeableRepos');
const updRepoUrl = generateStUrl('githubAuth/updateRepos');
const updFormUrl = generateStUrl('githubAuth/updateForm');
const doAppRepoUpdUrl = generateStUrl('ide/app/doRepoUpdates');
const doDevRepoUpdUrl = generateStUrl('ide/device/doRepoUpdates');
const smartappsListUrl = generateStUrl('ide/apps');
const appRepoChkUrl = generateStUrl('github/appRepoStatus?appId=');
const devRepoChkUrl = generateStUrl('github/deviceRepoStatus?deviceTypeId=');
const availableSaUrl = generateStUrl('api/smartapps/editable');
const availableDevsUrl = generateStUrl('api/devicetypes');

function generateStUrl(path) {
    return serverUrl + path;
}

const appsManifest = [{
        namespace: 'tonesto7',
        repoName: 'nest-manager',
        name: 'NST Manager',
        appName: 'Nest Manager',
        author: 'Anthony S.',
        description: 'This SmartApp is used to integrate your Nest devices with SmartThings and to enable built-in automations',
        category: 'Convenience',
        videoUrl: 'http://f.cl.ly/items/3O2L03471l2K3E3l3K1r/Zombie%20Kid%20Likes%20Turtles.mp4',
        photoUrl: 'https://raw.githubusercontent.com/tonesto7/nest-manager/master/Images/App/nst_manager_5.png',
        iconUrl: 'https://raw.githubusercontent.com/tonesto7/nest-manager/master/Images/App/nst_manager_5.png',
        manifestUrl: 'https://raw.githubusercontent.com/tonesto7/nest-manager/master/installerManifest.json'
    },
    {
        namespace: 'tonesto7',
        repoName: 'echosistant-alpha',
        name: 'EchoSistant Evolution',
        appName: 'EchoSistant5',
        author: 'EchoSistant Team',
        description: 'The Ultimate Voice Controlled Assistant Using Alexa Enabled Devices.',
        category: 'My Apps',
        videoUrl: 'http://f.cl.ly/items/3O2L03471l2K3E3l3K1r/Zombie%20Kid%20Likes%20Turtles.mp4',
        photoUrl: 'https://echosistant.com/es5_content/images/Echosistant_V5.png',
        iconUrl: 'https://echosistant.com/es5_content/images/Echosistant_V5.png',
        manifestUrl: 'https://raw.githubusercontent.com/BamaRayne/Echosistant/master/installerManifest.json'
    }
];

function makeRequest(url, method, message, appId = null, appDesc = null, contentType = null, responseType = null, allow500 = false) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        url += appId || '';
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (appId !== null && appDesc !== null) {
                        // console.log(xhr.response);
                        resolve({
                            response: xhr.response,
                            appId: appId,
                            appDesc: appDesc
                        });
                    } else {
                        resolve(xhr.response);
                    }
                } else if (xhr.status === 500 && allow500 === true) {
                    resolve(xhr.response);
                } else {
                    reject(Error(xhr.statusText));
                }
            }
        };
        xhr.onprogress = function() {
            // console.log('LOADING', xhr.readyState); // readyState will be 3
        };
        xhr.onerror = function() {
            if (appId !== null && appDesc !== null) {
                reject({
                    statusText: xhr.statusText,
                    appId: appId,
                    appDesc: appDesc
                });
            } else {
                reject(Error('XMLHttpRequest failed; error code:' + xhr.statusText));
            }
        };
        xhr.open(method, url, true);
        if (contentType !== null && responseType !== null) {
            xhr.setRequestHeader('Content-Type', contentType);
            xhr.responseType = responseType;
            if (message) {
                xhr.send(message);
            } else {
                xhr.send();
            }
        } else {
            xhr.send(message);
        }
    });
}

function getStAuth() {
    return new Promise(function(resolve, reject) {
        updLoaderText('Authenticating', 'Please Wait');
        makeRequest(authUrl, 'GET', null)
            .catch(function(err) {
                installError(err);
            })
            .then(function(response) {
                if (response !== undefined) {
                    $('#results').text('');
                    addResult('SmartThings Authentication', true);
                    resolve(true);
                }
                reject('Unauthorized');
            });
    });
}

function capitalize(value) {
    var regex = /(\b[a-z](?!\s))/g;
    return value ?
        value.replace(regex, function(v) {
            return v.toUpperCase();
        }) :
        '';
}

function addResult(str, good, type = '') {
    // $('#results').css({ display: 'none' });

    $('#listDiv').css({
        display: 'block'
    });
    $('#resultsTitle').css({
        display: 'block'
    });
    let s = "<li><span style='color: " + (good !== false ? '#25c225' : '#FF0000') + ";'>";
    s += "<i class='fa fa-" + (good !== false ? 'check' : 'exclamation') + "'></i>";
    s += '</span> ' + str + '</li>';
    switch (type) {
        case 'auth':
            $('#authResultUl').append(s);
            break;
        case 'app':
            $('#appResultUl').append(s);
            break;
        case 'device':
            $('#devResultUl').append(s);
            break;
        default:
            $('#resultUl').append(s);
            break;
    }
}

function installError(err, reload = true) {
    if (reload && sessionStorage.refreshCount < 7) {
        loaderFunc();
    } else {
        installComplete(err, true);
    }
}

function installComplete(text, red = false) {
    $('#loaderDiv').css({ display: 'none' });
    $('#finishedImg').removeClass('fa-exclamation-circle').addClass('fa-check').css({ display: 'block' });
    if (red) {
        $('#finishedImg').removeClass('fa-check').addClass('fa-exclamation-circle').css({ color: 'red' });
    }
    $('#actResultsDiv').css({ display: 'block' });
    $('#results').css({ display: 'block' }).html(text + '<br/><br/>Press Back/Done Now');
    updSectTitle('', true);
    sessionStorage.removeItem('appsDone');
    sessionStorage.removeItem('refreshCount');
}

function updSectTitle(str, hide = false) {
    $('#sectTitle').html(str).css({ display: hide ? 'none' : 'block' });
    $('#sectTitleHr').css({ display: hide ? 'none' : 'block' });
}

function updLoaderText(str1, str2) {
    $('#loaderText1').text(str1);
    $('#loaderText2').text(str2);
}

function buildRepoParamString(rdata) {
    let objs = [];
    objs.push('referringController=appIde');
    objs.push('referringAction=apps');
    // objs.push('defaultNamespace=' + repoData.namespace);
    objs.push('repos.id=0');
    objs.push('repos.owner=' + rdata.namespace);
    objs.push('repos.name=' + rdata.repoName);
    objs.push('branch=' + rdata.branch);
    for (let i in rdata) {
        objs.push('repos.id=' + rdata[i].id);
        if (rdata[i].owner !== undefined) {
            objs.push('repos.owner=' + rdata[i].owner);
        }
        objs.push('repos.name=' + rdata[i].name);
        objs.push('repos.branch=' + rdata[i].branch);
    }
    return objs.join('&');
}

function buildAppInstallParams(repoid, apps) {
    let objs = [];
    objs.push('id=' + repoid);
    for (let i in apps) {
        objs.push('added=' + apps[i]);
    }
    objs.push('publishUpdates=true');
    objs.push('execute=Execute+Update');
    return objs.join('&');
}

function processIntall(repoData) {
    retryCnt++;
    getStAuth().then(function(resp) {
        if (resp === true) {
            checkIdeForRepo(repoData.repoName, 'master')
                .catch(function(err) {
                    installError(err, false);
                })
                .then(function(resp) {
                    // console.log(resp);
                    if (resp === false) {
                        addRepoToIde(repoData.repoName, 'master')
                            .catch(function(err) {
                                installError(err, false);
                            })
                            .then(function(resp) {
                                // console.log(resp);
                                checkIdeForRepo(repoData.repoName, 'master')
                                    .catch(function(err) {
                                        installError(err, false);
                                    })
                                    .then(function(resp) {
                                        //   console.log(resp);
                                        if (resp === true && repoData) {
                                            processIntall(repoData);
                                        }
                                    });
                            });
                    } else {
                        addResult('Repo Exists: (' + repoData.repoName + ')', true);
                        let appItems = [];
                        appItems.push(repoData.smartApps.parent);
                        for (const ca in repoData.smartApps.children) {
                            appItems.push(repoData.smartApps.children[ca]);
                        }

                        console.log('appItems: ', appItems);
                        checkIfItemsInstalled(appItems, 'app')
                            .catch(function(err) {
                                installError(err, false);
                            })
                            .then(function(resp) {
                                // console.log('checkIfItemsInstalled: ', resp);
                                if (Object.keys(resp).length) {
                                    installAppsToIde(resp)
                                        .catch(function(err) {
                                            installError(err, false);
                                        })
                                        .then(function(resp) {
                                            // console.log('installAppsToIde: ', resp);
                                            if (resp === true) {
                                                if (repoData.deviceHandlers) {
                                                    let devItems = [];
                                                    devItems.push(repoData.deviceHandlers);
                                                    for (const dh in repoData.deviceHandlers) {
                                                        devItems.push(repoData.deviceHandlers[dh]);
                                                    }
                                                    checkIfItemsInstalled(devItems, 'app')
                                                        .catch(function(err) {
                                                            installError(err, false);
                                                        })
                                                        .then(function(resp) {
                                                            if (Object.keys(resp).length) {
                                                                installDevsToIde(resp)
                                                                    .catch(function(err) {
                                                                        installError(err, false);
                                                                    })
                                                                    .then(function(resp) {
                                                                        // console.log('installDevsToIde: ', resp);
                                                                        if (resp === true) {
                                                                            if (Object.keys(repoData.deviceHandlers).length) {
                                                                                installComplete('Installs are Complete!<br/>Everything is Good!');
                                                                            }
                                                                        }
                                                                    });
                                                            }
                                                        });
                                                } else {
                                                    installComplete('Installs are Complete!<br/>Everything is Good!');
                                                }
                                            }
                                        });
                                } else {
                                    installComplete('Installs are Complete!<br/>Everything is Good!');
                                }
                            });
                        // installAppToIde(repoData.smartApps.parent);
                        // for (const app in repoData.smartApps.children) {
                        //     installAppToIde(repoData.smartApps.children[app]);
                        // }
                    }
                });
        } else {
            if (retryCnt < 5) {
                processIntall();
            } else {
                installComplete('Authentication Issue!<br/>Make Sure you Signed In!', true);
            }
        }
    });
}

function installAppsToIde(appNames) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Beginning', 'Installs');
        // console.log('repoParams: ', repoParams);
        if (appNames) {
            let repoParams = buildAppInstallParams(repoId, appNames);
            makeRequest(doAppRepoUpdUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
                .catch(function(err) {
                    installError(err, false);
                    addResult(err + ' Install Apps IDE Issue', false);
                    installComplete('Error!<br/>Try Again Later!', true);
                    reject(err);
                })
                .then(function(resp) {
                    updLoaderText('Apps', 'Installed');
                    for (let i in appNames) {
                        addResult(i + ' App Installed/Published', true);
                    }
                    resolve(true);
                });
        }
    });
}

function installDevsToIde(devNames) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Beginning', 'Installs');
        // console.log('repoParams: ', repoParams);
        if (devNames) {
            let repoParams = buildAppInstallParams(repoId, devNames);
            makeRequest(doDevRepoUpdUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
                .catch(function(err) {
                    installError(err, false);
                    addResult(err + ' Install Devices IDE Issue', false);
                    installComplete('Error!<br/>Try Again Later!', true);
                    reject(err);
                })
                .then(function(resp) {
                    updLoaderText('Devices', 'Installed');
                    for (let i in devNames) {
                        addResult(i + ' Device Installed/Published', true);
                    }
                    resolve(true);
                });
        }
    });
}

function getAvailableAppsDevices(updDom = false) {
    return new Promise(function(resolve, reject) {
        // console.log('apps:', apps);
        let out = {};
        if (updDom) {
            updLoaderText('Loading Data', 'Please Wait');
        }
        makeRequest(availableSaUrl, 'GET', null)
            .catch(function(err) {
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                let fndApps = JSON.parse(resp);
                if (fndApps.length) {
                    availableApps = fndApps;
                    out['apps'] = fndApps;
                }
                makeRequest(availableDevsUrl, 'GET', null)
                    .catch(function(err) {
                        reject(err);
                    })
                    .then(function(resp) {
                        // console.log(resp);
                        let fndDevs = JSON.parse(resp);
                        if (fndDevs.length) {
                            availableDevs = fndDevs;
                            out['devices'] = fndDevs;
                        }
                    });
                resolve(out);
            });
    });
}

function checkRepoUpdateStatus(objId, type) {
    let url = '';
    switch (type) {
        case 'device':
            url = devRepoChkUrl;
            break;
        case 'app':
            url = appRepoChkUrl;
            break;
    }
    return new Promise(function(resolve, reject) {
        makeRequest(url + objId, 'GET', null)
            .catch(function(err) {
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                let data = JSON.parse(resp);
                if (data.length) {
                    resolve(data.hasDifference === true);
                }
                resolve(false);
            });
    });
}

function checkIdeForRepo(rname, branch) {
    return new Promise(function(resolve, reject) {
        let repoFound = false;
        updLoaderText('Checking', 'Repos');
        makeRequest(fetchReposUrl, 'GET', null)
            .catch(function(err) {
                installError(err, false);
                addResult(err + ' Check Repo Issue', false);
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                updLoaderText('Analyzing', 'Repos');
                let respData = JSON.parse(resp);
                writableRepos = respData;
                if (respData.length) {
                    for (let i in respData) {
                        // console.log(respData[i]);
                        if (respData[i].name === rname && respData[i].branch === branch) {
                            repoId = respData[i].id;
                            repoFound = true;
                        }
                    }
                }
                resolve(repoFound);
            });
    });
}

function checkIfItemsInstalled(itemObj, type) {
    let url = '';
    switch (type) {
        case 'device':
            url = availableDevsUrl;
            break;
        case 'app':
            url = availableSaUrl;
            break;
    }
    return new Promise(function(resolve, reject) {
        // console.log('apps:', apps);
        updLoaderText('Getting', capitalize(type));
        makeRequest(url, 'GET', null)
            .catch(function(err) {
                installError(err, false);
                addResult(err + ' Getting ' + capitalize(type) + ' Issue', false);
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                let itemsFnd = JSON.parse(resp);
                if (itemsFnd.length) {
                    if (type === 'device') {
                        availableDevs = itemsFnd;
                    } else {
                        availableApps = itemsFnd;
                    }
                    updLoaderText('Analyzing', capitalize(type));
                    for (let a in itemObj) {
                        for (let i in itemsFnd) {
                            // console.log('itemsFnd: ', itemsFnd[i].name, ' | requested ' + type + ': ' + itemObj[a].name);
                            if (itemsFnd[i].name === itemObj[a].name) {
                                addResult(itemObj[a].name + ' Exists Already', true);
                                delete itemObj[a];
                                break;
                            }
                        }
                    }
                }
                resolve(itemObj);
            });
    });
}

function getProjectManifest(url) {
    return new Promise(function(resolve, reject) {
        // console.log('apps:', apps);
        updLoaderText('Getting', 'Manifest');
        makeRequest(url, 'GET', null)
            .catch(function(err) {
                installError(err, false);
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                let mani = JSON.parse(resp);
                if (mani.name !== undefined) {
                    resolve(mani);
                }
                resolve(undefined);
            });
    });
}

function addRepoToIde(rname, branch) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Adding', 'Repo to ST');
        let repoParams = buildRepoParamString(writableRepos);
        // console.log('repoParams: ', repoParams);
        addResult('Repo Not Found - Adding to IDE', true);
        makeRequest(updRepoUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
            .catch(function(err) {
                installError(err, false);
                addResult(err + ' Add IDE Github Repo Issue', false);
                installComplete('Error!<br/>Try Again Later!', true);
                reject(err);
            })
            .then(function(resp) {
                console.log(resp);
                updLoaderText('Verifying', 'Repo');
                checkIdeForRepo(rname, 'master')
                    .catch(function(err) {
                        installError(err, false);
                        reject(err);
                    })
                    .then(function(resp) {
                        if (resp === true) {
                            addResult('Added Repo to IDE', true);
                            addResult('Verified Repo Added', true);
                        }
                        resolve(resp);
                    });
                resolve(false);
            });
    });
}

function buildAppList() {
    let html = '';
    if (appsManifest.length > 0) {

        html += '<div class="col-xs-12">';
        html += '   <form class="navbar-form m-2" role="search">';
        html += '       <div class="input-group add-on">';
        html += '           <div class="input-group-btn"> <button type="button" class="btn btn-outline-grey btn-rounded dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Category</button>';
        html += '               <div class="dropdown-menu" x-placement="bottom-start" style="position: absolute; transform: translate3d(6px, 52px, 0px); top: 0px; left: 0px; will-change: transform;">';
        html += '                   <a class="dropdown-item" href="#">My Apps</a>';
        html += '                   <a class="dropdown-item" href="#">Convenience</a>';
        html += '                   <a class="dropdown-item" href="#">Family</a>';
        html += '                   <a class="dropdown-item" href="#">Fun & Social</a>';
        html += '                   <a class="dropdown-item" href="#">Green Living</a>';
        html += '                   <a class="dropdown-item" href="#">Health & Wellness</a>';
        html += '                   <a class="dropdown-item" href="#">Mode Magic</a>';
        html += '                   <a class="dropdown-item" href="#">Pets</a>';
        html += '                   <a class="dropdown-item" href="#">Safety & Security</a>';
        html += '                   <a class="dropdown-item" href="#">SmartThings Lab</a>';
        html += '               </div>';
        html += '           </div>';
        html += '           <input class="form-control white-text" placeholder="Search" name="srch-term" id="srch-term" type="text">';
        html += '        <div class="input-group-btn">';
        html += '            <button class="btn btn-outline-grey btn-rounded waves-effect" type="submit"><i class="fa fa-search" aria-hidden="true"></i></button>';
        html += '        </div>';
        html += '    </div>';
        html += '</div>';
        html += '<div id=listDiv class="col-lg-12 mb-r dark">';
        html += '   <div class="listGroup">';
        for (let i in appsManifest) {
            let instApp = availableApps.filter(app => app.name.toString() === appsManifest[i].appName.toString());
            let appInstalled = instApp[0] !== undefined && instApp.length;
            let updAvail = false;
            if (appInstalled && instApp[0].id !== undefined) {
                checkRepoUpdateStatus(instApp[0].id, 'app').catch(function(err) {}).then(function(resp) {
                    if (resp === true) {
                        updAvail = true;
                    }
                });
            }
            if (instApp[0] !== undefined) {
                console.log('appInstalled: ' + appInstalled, 'instApp: ' + instApp[0].id);
            }
            html += '\n     <a href="#" id="' + appsManifest[i].repoName + '" onclick="appItemClicked(this)" class="list-group-item list-group-item-action flex-column align-items-start">';

            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n               <h6 class="h6-responsive"><img src="' + appsManifest[i].iconUrl + '" height="40" class="d-inline-block align-middle" alt=""> ' + appsManifest[i].name + '</h6>';
            html += '\n             </div>';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Author:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><em>' + appsManifest[i].author + '</em></small>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n         </div>';

            html += '\n         <div class="d-flex justify-content-start">';
            html += '\n             <p class="d-flex my-3 mx-6 justify-content-center"><small class="align-middle">' + appsManifest[i].description + '</small></p>';
            html += '\n         </div>';

            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Category:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><em>' + appsManifest[i].category + '</em></small>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += appInstalled || updAvail ? '\n                      <div class="d-flex flex-column justify-content-center align-items-center">\n<div class="d-flex flex-row">\n<small class="align-middle"><u><b>Category:</b></u></small>\n</div>\n<div class="d-flex flex-row">' : '';
            html += appInstalled && !updAvail ? '\n             <small-medium class="align-middle"><span class="badge green white-text align-middle">Installed</span></small-medium>' : '';
            html += appInstalled && updAvail ? '\n             <small-medium class="align-middle"><span class="badge green white-text align-middle">Update Avail.</span></small-medium>' : '';
            html += appInstalled || updAvail ? '\n</div>\n</div>' : '';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Installs:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><span class="badge badge-pill grey white-text align-middle">' + 20 + '</span></small>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n         </div>';
            html += '\n     </a>';
        }
        html += '\n   </div>';
        html += '\n</div>';
    }
    updSectTitle('Select an Item');
    $('#listContDiv').append(html);
    $('#listContDiv').css({ display: 'block' });
    $('#loaderDiv').css({ display: 'none' });
    $('#actResultsDiv').css({ display: 'none' });
    $('#appViewDiv').css({ display: 'none' });
    $('#homeBtn').click(function() {
        console.log(homeUrl);
        window.location.replace(homeUrl);
    });
    new WOW().init();
}

function createAppDevTableItem(objData, type, parent = false, idNum) {
    var appPub = type === 'device' || objData.published === true;
    var appOauth = objData.oAuth === true;
    var appOptional = objData.optional;
    var disabled = parent || appOptional === false ? ' disabled' : '';
    var checked = parent || appOptional === false ? ' checked' : '';

    let html = '';
    html += '\n        <tr>';
    html += '\n           <td class="align-middle">';
    html += '\n               <div class="d-flex flex-column justify-content-start my-0 form-check' + disabled + '">';
    html += '\n                   <div class="flex-column justify-content-start">';
    html += '\n                       <div class="d-flex flex-row">';
    html += '\n                           <input class="form-check-input align-middle" type="checkbox" value="" id="smartapp' + idNum + '"' + checked + disabled + '>';
    html += '\n                           <label class="form-check-label align-middle" for="smartapp' + idNum + '"><small class="align-middle">' + objData.name + '</small></label>';
    html += '\n                       </div>';
    html += '\n                   </div>';
    html += '\n              </div>';
    html += '\n           </td>';
    html += '\n           <td class="align-middle">';
    html += '\n               <small class="align-middle"><span class="badge grey white-text align-middle">v' + objData.version + '</span></small>';
    html += '\n           </td>';
    html += '\n           <td class="align-middle">';
    html += parent === true ? '\n               <small class="align-middle"><span class="badge badge-pill purple white-text align-middle">Parent</span></small>' : '';
    html += appPub === true ? '\n               <small class="align-middle"><span class="badge badge-pill green white-text align-middle">Publish</span></small>' : '';
    html += appOauth === true ? '\n               <small class="align-middle"><span class="badge badge-pill red white-text align-middle">OAuth</span></small>' : '';
    html += '\n           </td>';
    html += '\n       </tr>';

    return html;
}

function renderAppView(appName) {
    let html = '';
    var manifest;
    if (appsManifest.length > 0) {
        let appItem = appsManifest.filter(app => app.repoName === appName);
        console.log(appItem);
        // let instApp = availableApps.filter(app => app.name.toString() === appsManifest[i].appName.toString());
        let appInstalled = false; // (instApp[0] !== undefined && instApp.length);
        let updAvail = false;
        if (appInstalled && instApp[0].id !== undefined) {
            checkRepoUpdateStatus(instApp[0].id, 'app').catch(function(err) {}).then(function(resp) {
                if (resp === true) {
                    updAvail = true;
                }
            });
        }
        for (let i in appItem) {
            getProjectManifest(appItem[0].manifestUrl)
                .catch(function(err) {
                    installComplete('Error getting App Manifest', true);
                })
                .then(function(resp) {
                    console.log(resp);
                    manifest = resp;
                    // console.log('manifest: ', manifest);
                    if (manifest !== undefined && Object.keys(manifest).length) {
                        html += '\n<div class="col-lg-12 mb-r">';
                        updSectTitle('', true);
                        let cnt = 1;
                        html += '\n     <!--App Description Panel-->';
                        html += '\n     <div class="card card-body" style="background-color: transparent;">';
                        html += '\n        <div class="flex-row align-right">';
                        html += '\n           <button type="button" id="appCloseBtn" class="close white-text" aria-label="Close">';
                        html += '\n               <span aria-hidden="true">&times;</span>';
                        html += '\n           </button>';
                        html += '\n       </div>';
                        html += '\n       <div class="flex-row align-center">';
                        html += '\n           <img class="align-center" src="' + manifest.bannerUrl + '" style="width: 90%; height: auto; max-width: 300px; max-height: 100px;">';
                        html += '\n       </div>';
                        html += '\n       <small class="white-text"><b>Author:</b> ' + manifest.author + '</small>';
                        html += '\n       <div class="flex-column align-items-center">';
                        html += '\n           <div class="d-flex w-100 justify-content-center align-items-center">';
                        html += '\n               <p class="card-text">' + manifest.description + '</p>';
                        html += '\n           </div>';
                        html += '\n       </div>';
                        html += '\n     </div>';
                        html += '\n     <!--/.App Description Panel-->';

                        // Column 1 start

                        html += '\n<!--App Options Panel-->';
                        html += '\n<div class="card card-body" style="background-color: transparent;">';
                        html += '\n   <div class="row">';
                        html += '\n       <div class="' + (manifest.deviceHandlers.length ? 'col-sm-6' : 'col-sm-12') + ' mb-4">';
                        html += '\n           <h6 class="h6-responsive white-text"><u>SmartApps</u></h6>';
                        html += '\n           <div class="d-flex justify-content-center">';
                        html += '\n               <div class="d-flex justify-content-center align-items-center">';
                        html += '\n                   <table class="table table-sm">';
                        html += '\n                       <thead>';
                        html += '\n                           <tr>';
                        html += '\n                               <th><small class="align-middle"><u><b>Name:</b></u></small></th>';
                        html += '\n                               <th><small class="align-middle"><u><b>Version:</b></u></small></th>';
                        html += '\n                               <th><small class="align-middle"><u><b>Options:</b></u></small></th>';
                        html += '\n                           </tr>';
                        html += '\n                       </thead>';
                        html += '\n                       <tbody>';
                        // Start Here

                        html += createAppDevTableItem(manifest.smartApps.parent, 'app', true, cnt);
                        cnt++;

                        if (manifest.smartApps.children.length) {
                            for (const sa in manifest.smartApps.children) {
                                html += createAppDevTableItem(manifest.smartApps.children[sa], 'app', false, cnt);
                                cnt++;
                            }
                        }
                        html += '\n                       </tbody>';
                        html += '\n                   </table>';
                        html += '\n               </div>';
                        html += '\n           </div>';
                        html += '\n       </div>';

                        let devcnt = 1;
                        if (manifest.deviceHandlers.length) {
                            html += '\n       <div class="col-sm-6 mb-4">';
                            html += '\n           <h6 class="h6-responsive white-text"><u>Devices</u></h6>';
                            html += '\n           <div class="d-flex justify-content-center">';
                            html += '\n               <div class="d-flex justify-content-center align-items-center">';
                            html += '\n                   <table class="table table-sm">';
                            html += '\n                       <thead>';
                            html += '\n                           <tr>';
                            html += '\n                               <th><small class="align-middle"><u><b>Name:</b></u></small></th>';
                            html += '\n                               <th><small class="align-middle"><u><b>Version:</b></u></small></th>';
                            html += '\n                               <th><small class="align-middle"><u><b>Options:</b></u></small></th>';
                            html += '\n                           </tr>';
                            html += '\n                       </thead>';
                            html += '\n                       <tbody>';
                            html += '\n                       ';
                            for (const dh in manifest.deviceHandlers) {
                                html += createAppDevTableItem(manifest.deviceHandlers[dh], 'device', false, devcnt);
                                devcnt++;
                            }
                        }

                        // Stop Here
                        html += '\n                       </tbody>';
                        html += '\n                   </table>';
                        html += '\n               </div>';
                        html += '\n           </div>';
                        html += '\n       </div>';

                        html += '\n   </div>';
                        html += '\n</div>';
                        html += '\n<div class="d-flex flex-row justify-content-center">';
                        html += '\n    <button id="installBtn" type="button" class="btn btn-success">Install</button>';
                        html += '\n</div>';
                    }
                    html += '\n</div>';
                    $('#appViewDiv').append(html);
                    $('#listContDiv').css({ display: 'none' });
                    $('#loaderDiv').css({ display: 'none' });
                    $('#actResultsDiv').css({ display: 'none' });
                    $('#appViewDiv').css({ display: 'block' });
                    $('#appCloseBtn').click(function() {
                        console.log('appCloseBtn');
                        updSectTitle('Select an Item');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'block' });
                    });
                    $('#installBtn').click(function() {
                        updSectTitle('Install Progress');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'none' });
                        $('#loaderDiv').css({ display: 'block' });
                        $('#actResultsDiv').css({ display: 'block' });
                        processIntall(manifest);
                        // alert("I'm not ready to do this yet");
                    });
                    new WOW().init();
                });
        }
    }
}

function appItemClicked(appItem) {
    console.log('App Item Clicked: (' + appItem.id + ')');
    if (appItem.id) {
        renderAppView(appItem.id);
    }
}

function loaderFunc() {
    $('#results').text('Waiting for connection...');
    if (sessionStorage.refreshCount === undefined) {
        sessionStorage.refreshCount = '0';
    }
    sessionStorage.refreshCount = Number(sessionStorage.refreshCount) + 1;
    updSectTitle('App Details', true);
    // $('#loaderDiv').css({ display: 'block' });
    getStAuth()
        .catch(function(err) {
            if (err === 'Unauthorized') {
                installComplete('Your Auth Session Expired.  Please go back and sign in again', true);
            } else {
                installError(err, false);
            }
        })
        .then(function(resp) {
            if (resp === true) {
                getAvailableAppsDevices(true)
                    .catch(function(err) {
                        if (err === 'Unauthorized') {
                            installComplete('Your Auth Session Expired.  Please go back and sign in again', true);
                        }
                        installError(err, false);
                    })
                    .then(function(resp) {
                        if (resp && resp.apps && Object.keys(resp).length) {
                            buildAppList();
                        }
                    });
            }
        });
}

document.addEventListener('DOMContentLoaded', function() {
    loaderFunc();
});