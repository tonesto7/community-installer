'use esversion: 6';

var repoId = '';
var writableRepos = [];
var availableApps;
var availableDevs;
var currentManifest;
var retryCnt = 0;
const authUrl = generateStUrl('hub');
const fetchReposUrl = generateStUrl('github/writeableRepos');
const updRepoUrl = generateStUrl('githubAuth/updateRepos');
const updFormUrl = generateStUrl('githubAuth/updateForm');
const doAppRepoUpdUrl = generateStUrl('ide/app/doRepoUpdates');
const doAppRemoveUrl = generateStUrl('ide/app/delete/');
const doDevRepoUpdUrl = generateStUrl('ide/device/doRepoUpdates');
const doDevSettingUpdUrl = generateStUrl('ide/device/update');
const doAppSettingUpdUrl = generateStUrl('ide/app/update');
const smartappsListUrl = generateStUrl('ide/apps');
const appUpdChkUrl = generateStUrl('github/appRepoStatus?appId=');
const appUpdApplyUrl = generateStUrl('ide/app/updateOneFromRepo/');
const appUpdPubUrl = generateStUrl('ide/app/publishAjax/');
const devUpdChkUrl = generateStUrl('github/deviceRepoStatus?deviceTypeId=');
const devUpdApplyUrl = generateStUrl('ide/device/updateOneFromRepo/');
const devUpdPubUrl = generateStUrl('ide/device/publishAjax/');
const availableSaUrl = generateStUrl('api/smartapps/editable');
const availableDevsUrl = generateStUrl('api/devicetypes');

function generateStUrl(path) {
    return serverUrl + path;
}

const appsManifest = [{
        name: 'NST Manager',
        appName: 'Nest Manager',
        author: 'Anthony S.',
        description: 'This SmartApp is used to integrate your Nest devices with SmartThings and to enable built-in automations',
        category: 'Convenience',
        videoUrl: 'http://f.cl.ly/items/3O2L03471l2K3E3l3K1r/Zombie%20Kid%20Likes%20Turtles.mp4',
        photoUrl: 'https://raw.githubusercontent.com/tonesto7/nest-manager/master/Images/App/nst_manager_5.png',
        iconUrl: 'https://raw.githubusercontent.com/tonesto7/nest-manager/master/Images/App/nst_manager_5.png',
        manifestUrl: 'https://rawgit.com/tonesto7/nest-manager/master/installerManifest.json',
        repoName: 'nest-manager'
    },
    {
        name: 'EchoSistant Evolution',
        appName: 'EchoSistant5',
        author: 'Echosistant Team',
        description: 'The Ultimate Voice Controlled Assistant Using Alexa Enabled Devices.',
        category: 'My Apps',
        videoUrl: 'http://f.cl.ly/items/3O2L03471l2K3E3l3K1r/Zombie%20Kid%20Likes%20Turtles.mp4',
        photoUrl: 'https://echosistant.com/es5_content/images/Echosistant_V5.png',
        iconUrl: 'https://echosistant.com/es5_content/images/Echosistant_V5.png',
        manifestUrl: 'https://raw.githubusercontent.com/BamaRayne/Echosistant/master/installerManifest.json',
        repoName: 'echosistant-dev'
    }
];

function makeRequest(url, method, message, appId = null, appDesc = null, contentType = null, responseType = null, anyStatus = false) {
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
                } else if ((xhr.status === 500 || xhr.status === 302) && anyStatus === true) {
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
                    $('#results').html('');
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

function addResult(str, good, type = '', str2 = '') {
    $('#listDiv').css({
        display: 'block'
    });
    let s = '';
    if (['app', 'device', 'repo'].includes(type)) {
        s += '\n <li>';
        s += '\n     <div class="d-flex flex-row justify-content-between">';
        s += '\n         <div class="d-flex align-items-start flex-column">';
        s += '\n             <p class="mb-2"><span style="color: ' + (good !== false ? '#25c225' : '#FF0000') + ';"><i class="fa fa-' + (good !== false ? 'check' : 'exclamation') + '"></i></span> ' + str + ':</p>';
        s += '\n         </div>';

        s += '\n         <div class="d-flex align-items-end flex-column mt-1">';
        s += '\n             <span class="align-middle"><small><b><u>' + str2 + '</u></b></small></span>';
        s += '\n         </div>';
        s += '\n     </div>';
        s += '\n </li>';
    }
    switch (type) {
        case 'app':
            $('#appResultsTitle').css({ display: 'block' });
            $('#appResultUl').css({ display: 'block' }).append(s);
            break;
        case 'device':
            $('#devResultsTitle').css({ display: 'block' });
            $('#devResultUl').css({ display: 'block' }).append(s);
            break;
        case 'repo':
            $('#repoResultsTitle').css({ display: 'block' });
            $('#repoResultUl').css({ display: 'block' }).append(s);
            break;
        default:
            s = "<li><p><span style='color: " + (good !== false ? '#25c225' : '#FF0000') + ";'>";
            s += "<i class='fa fa-" + (good !== false ? 'check' : 'exclamation') + "'></i>";
            s += '</span> ' + str + '</p></li>';
            $('#ideResultsTitle').css({ display: 'block' });
            if (!checkListForDuplicate('#ideResultUl li', str)) {
                $('#ideResultUl').css({ display: 'block' }).append(s);
            }
            break;
    }
}

function checkListForDuplicate(element, str) {
    let items = [];
    $(element).each(function() {
        items.push($(this).text().trim());
    });
    return items.includes(str);
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
    $('#results').css({ display: 'block' }).html('<small>' + text + '</small>');
    $('#resultsDone').css({ display: 'block' });
    updSectTitle('', true);
    sessionStorage.removeItem('appsDone');
    sessionStorage.removeItem('refreshCount');
}

function updSectTitle(str, hide = false) {
    $('#sectTitle').html(str).css({ display: hide ? 'none' : 'block' });
    // $('#sectTitleHr').css({ display: hide ? 'none' : 'block' });
}

function updLoaderText(str1, str2) {
    $('#loaderText1').text(str1);
    $('#loaderText2').text(str2);
}

function buildRepoParamString(newRepo, existData) {
    let objs = [];
    objs.push('referringController=appIde');
    objs.push('referringAction=apps');
    // objs.push('defaultNamespace=' + repoData.namespace);
    objs.push('repos.id=0');
    objs.push('repos.owner=' + newRepo.repoOwner);
    objs.push('repos.name=' + newRepo.repoName);
    objs.push('repos.branch=' + newRepo.repoBranch);
    for (let i in existData) {
        objs.push('repos.id=' + existData[i].id);
        if (existData[i].owner !== undefined) {
            objs.push('repos.owner=' + existData[i].owner);
        }
        objs.push('repos.name=' + existData[i].name);
        objs.push('repos.branch=' + existData[i].branch);
    }
    return objs.join('&');
}

function buildInstallParams(repoid, items) {
    let objs = [];
    objs.push('id=' + repoid);
    for (let i in items) {
        objs.push('added=' + items[i].appUrl.toLowerCase());
    }
    objs.push('publishUpdates=true');
    objs.push('execute=Execute+Update');
    return objs.join('&');
}

function buildSettingParams(objData, item, repoId, repoData, objType) {
    let objs = [];
    objs.push('id=' + objData.id);
    if (repoId) {
        objs.push('gitRepo.id=' + repoId);
    }
    objs.push('name=' + objData.name);
    objs.push('author=' + objData.author);
    objs.push('namespace=' + repoData.namespace);
    objs.push('description=' + repoData.description);
    objs.push('iconUrl=' + objData.iconUrl);
    objs.push('iconX2Url=' + objData.iconX2Url);
    objs.push('iconX3Url=' + objData.iconX3Url);
    if (objType === 'app') {
        if (item.oAuth === true) {
            objs.push('oauthEnabled=true');
            objs.push('webServerRedirectUri=');
            objs.push('displayName=');
            objs.push('displayLink=');
        }
        if (item.appSettings.length) {
            for (const as in item.appSettings) {
                objs.push('smartAppSettings.name=' + as);
                objs.push('smartAppSettings.value=' + item.appSettings[as]);
            }
        }
        objs.push('photoUrls=');
        objs.push('videoUrls.0.videoUrl=');
        objs.push('videoUrls.0.thumbnailUrl=');
        objs.push('update=Update');
    }
    if (objType === 'device') {
        objs.push('_action_update=Update');
    }
    return objs.join('&');
}

function processIntall(repoData, selctd) {
    var allAppItems = [];
    allAppItems.push(repoData.smartApps.parent);
    for (const ca in repoData.smartApps.children) {
        if (selctd.smartapps.includes(repoData.smartApps.children[ca].name)) {
            allAppItems.push(repoData.smartApps.children[ca]);
        }
    }
    retryCnt++;
    getStAuth().then(function(resp) {
        if (resp === true) {
            checkIdeForRepo(repoData.repoName, repoData.repoBranch)
                .catch(function(err) {
                    installError(err, false);
                })
                .then(function(resp) {
                    console.log(resp);
                    if (resp === false) {
                        addRepoToIde(repoData)
                            .catch(function(err) {
                                installError(err, false);
                            })
                            .then(function(resp) {
                                // console.log(resp);
                                checkIdeForRepo(repoData.repoName, repoData.repoBranch, true)
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
                        let appItems = allAppItems;
                        // console.log('appItems: ', appItems);
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
                                                checkIfItemsInstalled(appItems, 'app', true)
                                                    .catch(function(err) {
                                                        installError(err, false);
                                                    })
                                                    .then(function(resp) {
                                                        updateAppSettings(repoData)
                                                            .catch(function(err) {
                                                                installError(err, false);
                                                            })
                                                            .then(function(resp) {
                                                                if (repoData.deviceHandlers && repoData.deviceHandlers.length) {
                                                                    let devItems = [];
                                                                    for (const dh in repoData.deviceHandlers) {
                                                                        if (selctd.devices.includes(repoData.deviceHandlers[dh].name)) {
                                                                            devItems.push(repoData.deviceHandlers[dh]);
                                                                        }
                                                                    }
                                                                    checkIfItemsInstalled(devItems, 'device')
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
                                                                                            checkIfItemsInstalled(devItems, 'device', true)
                                                                                                .catch(function(err) {
                                                                                                    installError(err, false);
                                                                                                })
                                                                                                .then(function(resp) {
                                                                                                    if (Object.keys(resp).length) {
                                                                                                        if (Object.keys(repoData.deviceHandlers).length) {
                                                                                                            installComplete('Install Process Completed!');
                                                                                                        }
                                                                                                    }
                                                                                                });
                                                                                        }
                                                                                    });
                                                                            } else {
                                                                                installComplete('Install Process Completed!');
                                                                            }
                                                                        });
                                                                } else {
                                                                    installComplete('Install Process Completed!');
                                                                }
                                                            });
                                                    });
                                            }
                                        });
                                } else if (repoData.deviceHandlers && repoData.deviceHandlers.length) {
                                    let devItems = [];
                                    for (const dh in repoData.deviceHandlers) {
                                        if (selctd.devices.includes(repoData.deviceHandlers[dh].name)) {
                                            devItems.push(repoData.deviceHandlers[dh]);
                                        }
                                    }
                                    checkIfItemsInstalled(devItems, 'device')
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
                                                            checkIfItemsInstalled(devItems, 'device', true)
                                                                .catch(function(err) {
                                                                    installError(err, false);
                                                                })
                                                                .then(function(resp) {
                                                                    if (Object.keys(resp).length) {
                                                                        if (Object.keys(repoData.deviceHandlers).length) {
                                                                            installComplete('Install Process Completed!');
                                                                        }
                                                                    }
                                                                });
                                                        }
                                                    });
                                            } else {
                                                installComplete('Install Process Completed!');
                                            }
                                        });
                                } else {
                                    installComplete('Install Process Completed!');
                                }
                            });
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

function addRepoToIde(repoData) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Adding', 'Repo to ST');
        let repoParams = buildRepoParamString(repoData, writableRepos);
        // console.log('repoParams: ', repoParams);
        addResult('(' + repoData.repoName + ')', true, 'repo', 'Not Added');
        makeRequest(updRepoUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
            .catch(function(err) {
                installError(err, false);
                addResult('Github Repo Issue', false, 'repo', err);
                installComplete('Error!<br/>Try Again Later!', true);
                reject(err);
            })
            .then(function(resp) {
                console.log(resp);
                updLoaderText('Verifying', 'Repo');
                checkIdeForRepo(repoData.repoName, repoData.repoBranch)
                    .catch(function(err) {
                        installError(err, false);
                        reject(err);
                    })
                    .then(function(resp) {
                        if (resp === true) {
                            addResult('(' + repoData.repoName + ')', true, 'repo', 'Repo Added');
                            addResult('(' + repoData.repoName + ')', true, 'repo', 'Repo Verified');
                        }
                        resolve(resp);
                    });
                resolve(false);
            });
    });
}

function checkRepoUpdateStatus(objId, type) {
    let url = '';
    switch (type) {
        case 'device':
            url = devUpdChkUrl;
            break;
        case 'app':
            url = appUpdChkUrl;
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

function checkIdeForRepo(rname, branch, secondPass = false) {
    return new Promise(function(resolve, reject) {
        let repoFound = false;
        updLoaderText('Checking', 'Repos');
        makeRequest(fetchReposUrl, 'GET', null)
            .catch(function(err) {
                installError(err, false);
                addResult('Checking Repo (' + rname + ')', false, 'repo', err);
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
                            if (!secondPass) {
                                addResult('Repo (' + rname + ')', true, 'repo', 'Already Added');
                            }
                            repoId = respData[i].id;
                            repoFound = true;
                        }
                    }
                }
                resolve(repoFound);
            });
    });
}

function installAppsToIde(appNames) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Beginning', 'Installs');
        // console.log('repoParams: ', repoParams);
        if (appNames) {
            updLoaderText('Installing', 'SmartApps');
            let repoParams = buildInstallParams(repoId, appNames);
            makeRequest(doAppRepoUpdUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
                .catch(function(err) {
                    installError(err, false);
                    addResult('Install IDE Apps', false, 'app', err);
                    installComplete('Error!<br/>Try Again Later!', true);
                    reject(err);
                })
                .then(function(resp) {
                    updLoaderText('Apps', 'Installed');
                    for (let i in appNames) {
                        addResult(appNames[i].name, true, 'app', 'Installed');
                    }
                    resolve(true);
                });
        }
    });
}

function updateAppCode(appId, appType) {
    if (appId && appType) {
        updLoaderText('Checking', appType);
        makeRequest(appUpd1Url, 'GET', null, appId, appType)
            .catch(function(errResp1) {
                installError(errResp1, false);
                addResult(errResp1.appDesc + ' Update Issue', false);
            })
            .then(function(stResp1) {
                // console.log(stResp1);
                var respData = JSON.parse(stResp1.response);
                if (respData.hasDifference === true) {
                    updLoaderText('Updating', stResp1.appDesc);
                    makeRequest(appUpd2Url, 'GET', null, stResp1.appId, stResp1.appDesc)
                        .catch(function(errResp2) {
                            installError(errResp2, false);
                            addResult(errResp2.appDesc + ' Update Issue', false);
                        })
                        .then(function(stResp2) {
                            if (!JSON.parse(stResp2.response).errors.length) {
                                updLoaderText('Compiling', stResp2.appDesc);
                                // console.log("stResp2(" + stResp2.appId + "):", JSON.parse(stResp2.response));
                                makeRequest(appUpd3Url, 'GET', null, stResp2.appId, stResp2.appDesc)
                                    .catch(function(errResp3) {
                                        addResult(errResp3.appDesc + ' Update Issue', false);
                                        installError(errResp3, false);
                                    })
                                    .then(function(stResp3) {
                                        // console.log("stResp3(" + stResp3.appId + "):", JSON.parse(stResp3.response));
                                        addResult(stResp3.appDesc + ' was Updated', true);
                                    });
                            }
                        });
                } else {
                    addResult(stResp4.appDesc + ' is Up-to-Date', true);
                    devsDone.push(stResp4.appDesc);
                    sessionStorage.setItem('devsDone', devsDone);
                    if (devsDone.length === Object.keys(devIds).length) {
                        installComplete('Updates are Complete!<br/>Everything is Good!');
                    }
                }
            });
    }
}

function updateDeviceCode(devId, devType) {
    if (devId && devType) {
        makeRequest(devUpd1Url, 'GET', null, devId, devType)
            .catch(function(errResp4) {
                installError(errResp4, false);
                addResult(errResp4.appDesc + ' Update Issue', false);
            })
            .then(function(stResp4) {
                // console.log(stResp4);
                var respData = JSON.parse(stResp4.response);
                if (respData.hasDifference === true) {
                    updLoaderText('Updating', stResp4.appDesc);
                    makeRequest(devUpd2Url, 'GET', null, stResp4.appId, stResp4.appDesc)
                        .catch(function(errResp5) {
                            installError(errResp5, false);
                            addResult(errResp5.appDesc + ' Update Issue', false);
                        })
                        .then(function(stResp5) {
                            if (!JSON.parse(stResp5.response).errors.length) {
                                updLoaderText('Compiling', stResp5.appDesc);
                                // console.log("stResp5(" + stResp5.appId + "):", JSON.parse(stResp5.response));
                                makeRequest(devUpd3Url, 'GET', null, stResp5.appId, stResp5.appDesc)
                                    .catch(function(errResp6) {
                                        addResult(errResp6.appDesc + ' Update Issue', false);
                                        installError(errResp6, false);
                                    })
                                    .then(function(stResp6) {
                                        // console.log("stResp6(" + stResp6.appId + "):", JSON.parse(stResp6.response));
                                        addResult(stResp6.appDesc + ' was Updated', true);
                                        devsDone.push(stResp6.appDesc);
                                        sessionStorage.setItem('devsDone', devsDone);
                                        if (devsDone.length === Object.keys(devIds).length) {
                                            installComplete('Updates are Complete!<br/>Everything is Good!');
                                        }
                                    });
                            }
                        });
                } else {
                    addResult(stResp4.appDesc + ' is Up-to-Date', true);
                    devsDone.push(stResp4.appDesc);
                    sessionStorage.setItem('devsDone', devsDone);
                    if (devsDone.length === Object.keys(devIds).length) {
                        installComplete('Updates are Complete!<br/>Everything is Good!');
                    }
                }
            });
    }
}

function removeAppsFromIde(appNames) {
    return new Promise(function(resolve, reject) {
        let allAppItems = [];
        for (const ca in appNames.smartApps.children) {
            allAppItems.push(appNames.smartApps.children[ca]);
        }
        allAppItems.push(appNames.smartApps.parent);
        updLoaderText('Beginning', 'Removal');
        // console.log('repoParams: ', repoParams);
        if (allAppItems) {
            for (const i in allAppItems) {
                let appId = availableApps.filter(app => app.name === allAppItems[i].name);
                if (appId.length && appId[0] && appId[0].id) {
                    makeRequest(doAppRemoveUrl + appId[0].id, 'GET', null)
                        .catch(function(err) {
                            installError(err, false);
                            addResult('App Removal Issue', false, 'app', err);
                            installComplete('Error!<br/>Try Again Later!', true);
                            reject(err);
                        })
                        .then(function(resp) {
                            updLoaderText('Apps', 'Removed');
                            addResult(allAppItems[i].name, true, 'app', 'App Removed');
                            installComplete('Removals are Complete!<br/>Everything is Good!');
                        });
                } else {
                    installComplete('Removals are Complete!<br/>Everything is Good!');
                }
            }
        } else {
            installComplete('Removals are Complete!<br/>Everything is Good!');
        }
    });
}

function updateAppSettings(repoData) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Modifying', 'Settings');
        var allAppItems = [];
        allAppItems.push(repoData.smartApps.parent);
        for (const ca in repoData.smartApps.children) {
            allAppItems.push(repoData.smartApps.children[ca]);
        }
        let updApps = allAppItems.filter(app => app.oAuth === true);
        if (updApps.length) {
            for (const i in updApps) {
                let appList = availableApps.filter(app => app.name === updApps[i].name);
                if (appList.length) {
                    for (const al in appList) {
                        let appParams = buildSettingParams(appList[al], updApps[i], repoId, repoData, 'app');
                        makeRequest(doAppSettingUpdUrl, 'POST', appParams, null, null, 'application/x-www-form-urlencoded', 'text/html,application/xhtml+xml,application/xml;', true)
                            .catch(function(err) {
                                installError(err, false);
                                addResult('App Settings Update', false, 'app', err);
                                installComplete('Error!<br/>Try Again Later!', true);
                                reject(err);
                            })
                            .then(function(resp) {
                                // updLoaderText('Apps', 'Installed');
                                for (let i in updApps) {
                                    addResult(updApps[i].name, true, 'app', 'OAuth Enabled');
                                }
                                if (i + 1 === updApps.length) {
                                    resolve(true);
                                }
                            });
                    }
                } else {
                    resolve(true);
                }
            }
        } else {
            resolve(true);
        }
    });
}

function installDevsToIde(devNames) {
    return new Promise(function(resolve, reject) {
        updLoaderText('Beginning', 'Installs');
        // console.log('repoParams: ', repoParams);
        if (devNames) {
            updLoaderText('Installing', 'Devices');
            let repoParams = buildInstallParams(repoId, devNames);
            makeRequest(doDevRepoUpdUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
                .catch(function(err) {
                    installError(err, false);
                    addResult('Install Devices Issue', false, 'device', err);
                    installComplete('Error!<br/>Try Again Later!', true);
                    reject(err);
                })
                .then(function(resp) {
                    updLoaderText('Devices', 'Installed');
                    for (let i in devNames) {
                        addResult(devNames[i].name, true, 'device', 'Installed');
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

function checkIfItemsInstalled(itemObj, type, secondPass = false) {
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
        updLoaderText('Getting', capitalize(type) + ' Data');
        makeRequest(url, 'GET', null)
            .catch(function(err) {
                installError(err, false);
                addResult('Getting ' + capitalize(type) + 's Issue', false, type, err);
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
                                if (!secondPass) {
                                    addResult(itemObj[a].name, true, type, 'Already Installed');
                                }
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

function findAppMatch(srchStr, data) {
    if (srchStr === undefined) {
        return data;
    }
    if (srchStr.length >= 3) {
        return data.filter(appItem => JSON.stringify(appItem).toString().toLowerCase().includes(srchStr.toLowerCase()));
    } else {
        return data;
    }
}

function searchForApp(evtSender) {
    let srchVal = $('#appSearchBox').val();
    console.log('AppSearch Event (' + evtSender + '): ' + srchVal);
    buildAppList(srchVal);
}

function buildAppList(filterStr = undefined) {
    let html = '';
    let appData = findAppMatch(filterStr, appsManifest);
    currentManifest = appData;
    html += '\n           <div class="d-flex flex-row justify-content-center align-items-center">';
    html += '\n               <div class="d-flex w-100 flex-column m-2">';
    html += '\n                <form>';
    html += '\n                   <div class="input-group md-form form-sm form-2 mb-0">';
    html += '\n                       <input id="appSearchBox" class="form-control grey-border white-text" type="text" placeholder="Search" aria-label="Search">';
    html += '\n                       <span class="input-group-addon waves-effect grey lighten-3" id="searchBtn"><a><i class="fa fa-search text-grey" aria-hidden="true"></i></a></span>';
    html += '\n                   </div>';
    html += '\n                </form>';
    html += '\n               </div>';
    html += '\n           </div>';
    if (appData.length > 0) {
        html += '\n<div id=listDiv class="clearfix">';
        html += '\n   <div class="listGroup">';
        html += '\n       <div class="card card-body card-outline p-2 mb-0" style="background-color: transparent;">';
        html += '\n           <table class="table table-sm mb-0">';
        html += '\n               <tbody>';

        for (let i in appData) {
            let instApp = availableApps.filter(app => app.name.toString() === appData[i].appName.toString());
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
                // console.log('appInstalled: ' + appInstalled, 'instApp: ' + instApp[0].id);
            }
            html += '\n   <tr style="border-bottom-style: hidden; border-top-style: hidden;">';
            html += '\n   <td class="py-1">';
            html += '\n     <a href="#" id="' + appData[i].repoName + '" onclick="appItemClicked(this)" class="list-group-item list-group-item-action flex-column align-items-start p-2" style="border-radius: 20px;">';

            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <div class="d-flex justify-content-start align-items-center">';
            html += '\n                         <h6 class="h6-responsive"><img src="' + appData[i].iconUrl + '" height="40" class="d-inline-block align-middle" alt=""> ' + appData[i].name + '</h6>';
            html += '\n                     </div>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Author:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle" style="font-size: 12px;"><em>' + appData[i].author + '</em></small>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n         </div>';

            html += '\n         <div class="d-flex justify-content-start align-items-center my-3" style="border-style: inset; border: 1px solid grey; border-radius: 5px;">';
            html += '\n             <p class="d-flex m-2 justify-content-center"><small class="align-middle">' + appData[i].description + '</small></p>';
            html += '\n         </div>';

            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Category:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><em>' + appData[i].category + '</em></small>';
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
            html += '\n   </td>';
            html += '\n   </tr>';
        }
        html += '\n            </table>';
        html += '\n         </tbody>';
        html += '\n      </div>';
        html += '\n   </div>';
        html += '\n</div>';
    } else {
        html += '\n  <h6>No Items Found</h6>';
    }

    updSectTitle('Select an Item');
    $('#listContDiv').html('').html(html);
    $('#listContDiv').css({ display: 'block' });
    $('#loaderDiv').css({ display: 'none' });
    $('#actResultsDiv').css({ display: 'none' });
    $('#appViewDiv').css({ display: 'none' });

    $('#appSearchBox').keypress(function(e) {
        if (e.which === 13) {
            searchForApp('KeyPress');
            return false;
        }
    });
    $('#searchBtn').click(function() {
        searchForApp('Clicked');
    });
    scrollToTop();
    new WOW().init();
}

function createAppDevTable(items, areDevices = false, type) {
    let html = '';
    if (items.length) {
        html += '\n   <div class="col-xs-12 ' + (areDevices ? 'col-md-6' : 'col-sm-12') + ' mb-2 p-0">';
        html += '\n       <h6 class="h6-responsive white-text"><u>' + (type === 'app' ? 'SmartApps' : 'Devices') + '</u></h6>';
        html += '\n       <div class="d-flex justify-content-center">';
        html += '\n           <div class="d-flex w-100 justify-content-center align-items-center mx-4">';
        html += '\n               <table class="table table-sm table-bordered">';
        html += '\n                   <thead>';
        html += '\n                       <tr>';
        html += '\n                           <th style="border: 1px solid grey;"><div class="text-center"><small class="align-middle">Name:</small></div></th>';
        html += '\n                           <th style="border: 1px solid grey;"><div class="text-center"><small class="align-middle">Version:</small></div></th>';
        html += '\n                           <th style="border: 1px solid grey;"><div class="text-center"><small class="align-middle">IDE Options:</small></div></th>';
        html += '\n                       </tr>';
        html += '\n                   </thead>';
        html += '\n                   <tbody>';
        let cnt = 0;
        for (const item in items) {
            var appPub = type === 'device' || items[item].published === true;
            var appOauth = items[item].oAuth === true;
            var appOptional = items[item].optional !== false;
            var parent = items[item].isParent === true;
            var child = items[item].isChild === true;
            var disabled = parent || !appOptional ? ' disabled' : '';
            var checked = parent || !appOptional ? ' checked' : '';
            var itemId = type === 'device' ? 'device' + cnt : 'smartapp' + cnt;

            html += '\n                   <tr>';
            html += '\n                      <td class="align-middle py-0" style="border: 1px solid grey">';
            html += '\n                         <div class="d-flex flex-column ml-2">';
            html += '\n                             <div class="d-flex flex-column justify-content-start my-1 form-check' + disabled + '">';
            html += '\n                                 <div class="flex-column justify-content-start">';
            html += '\n                                     <div class="d-flex flex-row">';
            html += '\n                                          <input class="form-check-input align-middle" type="checkbox" value="" id="' + itemId + '"' + checked + disabled + '>';
            html += '\n                                          <label class="form-check-label align-middle" for="' + itemId + '"><small id="' + itemId + 'name" class="align-middle">' + items[item].name + '</small></label>';
            html += '\n                                     </div>';
            html += '\n                                 </div>';
            html += '\n                             </div>';
            html += '\n                         </div>';
            html += '\n                     </td>';
            html += '\n                     <td class="align-middle" style="border: 1px solid grey">';
            html += '\n                         <div class="d-flex flex-column align-items-center">';
            html += '\n                                   <small class="align-middle"><span class="badge grey white-text align-middle">v' + items[item].version + '</span></small>';
            html += '\n                               </div>';
            html += '\n                           </td>';
            html += '\n                           <td class="align-middle py-0" style="border: 1px solid grey">';
            html += '\n                               <div class="d-flex flex-column align-items-center">';
            html += parent === true ? '\n                 <small style="margin: 2px auto;"><span class="badge blue white-text">Parent App</span></small>' : '';
            html += child === true ? '\n                  <small style="margin: 2px auto;"><span class="badge purple white-text">Child App</span></small>' : '';
            html += appPub === true ? '\n                 <small style="margin: 2px auto;"><span class="badge green white-text">Publishing</span></small>' : '';
            html += appOauth === true ? '\n               <small style="margin: 2px auto;"><span class="badge orange white-text">Enable OAuth</span></small>' : '';
            html += '\n                               </div>';
            html += '\n                           </td>';
            html += '\n                      </tr>';
            cnt++;
        }
        html += '\n                </tbody>';
        html += '\n            </table>';
        html += '\n       </div>';
        html += '\n   </div>';
        html += '\n</div>';
    }
    return html;
}

function renderAppView(appName) {
    let html = '';
    var manifest;
    if (appsManifest.length > 0) {
        let appItem = appsManifest.filter(app => app.repoName === appName);
        // console.log(appItem);
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
                    // console.log(resp);
                    manifest = resp;
                    // console.log('manifest: ', manifest);
                    if (manifest !== undefined && Object.keys(manifest).length) {
                        html += '\n    <div id="appViewCard" class="p-0 mb-0" style="background-color: transparent;">';
                        updSectTitle('', true);
                        let cnt = 1;
                        html += '\n     <!--App Description Panel-->';
                        html += '\n     <div class="card card-body card-outline p-1 mb-2" style="background-color: transparent;">';
                        html += '\n        <div class="flex-row align-right mr-1 mt-1">';
                        html += '\n           <button type="button" id="appCloseBtn" class="close white-text" aria-label="Close">';
                        html += '\n               <span aria-hidden="true">&times;</span>';
                        html += '\n           </button>';
                        html += '\n       </div>';
                        html += '\n       <div class="flex-row align-center mt-0 mb-1">';
                        html += '\n           <img class="align-center" src="' + manifest.bannerUrl + '" style="height: auto; max-height: 75px;">';
                        html += '\n       </div>';
                        html += '\n       <div class="flex-row align-center m-3">';
                        html += '\n           <small class="white-text"><b>Author:</b> ' + manifest.author + '</small>';
                        html += '\n           <div class="flex-column align-items-center">';
                        html += '\n               <div class="d-flex w-100 justify-content-center align-items-center">';
                        html += '\n                   <p class="card-text">' + manifest.description + '</p>';
                        html += '\n               </div>';
                        html += '\n           </div>';
                        html += '\n       </div>';
                        html += '\n     </div>';
                        html += '\n     <!--/.App Description Panel-->';
                        html += '\n     <!--Repo Description Panel-->';
                        html += '\n     <div class="card card-body card-outline px-1 py-3 mb-2" style="background-color: transparent;">';
                        html += '\n         <div class="flex-row align-center mt-0 mb-1">';
                        html += '\n             <h6 class="h6-responsive white-text"><u>GitHub Details</u></h6>';
                        html += '\n         </div>';
                        html += '\n         <div class="d-flex justify-content-between align-items-center mx-5 px-2">';
                        html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
                        html += '\n                 <div class="d-flex flex-row">';
                        html += '\n                     <small class="align-middle"><b>Repo Name:</b></small>';
                        html += '\n                 </div>';
                        html += '\n                 <div class="d-flex flex-row">';
                        html += '\n                     <small class="align-middle"><em>' + manifest.repoName + '</em></small>';
                        html += '\n                 </div>';
                        html += '\n             </div>';
                        html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
                        html += '\n                 <div class="d-flex flex-row">';
                        html += '\n                     <small class="align-middle"><b>Branch:</b></small>';
                        html += '\n                 </div>';
                        html += '\n                 <div class="d-flex flex-row">';
                        html += '\n                     <small class="align-middle"><em>' + manifest.repoBranch + '</em></small>';
                        html += '\n                 </div>';
                        html += '\n             </div>';
                        html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
                        html += '\n                 <div class="d-flex flex-row">';
                        html += '\n                     <small class="align-middle"><b>Owner:</b></small>';
                        html += '\n                 </div>';
                        html += '\n                 <div class="d-flex flex-row">';
                        html += '\n                     <small class="align-middle"><em>' + manifest.repoOwner + '</em></small>';
                        html += '\n                 </div>';
                        html += '\n             </div>';
                        html += '\n         </div>';
                        html += '\n     </div>';
                        html += '\n     <!--/.Repo Description Panel-->';

                        html += '\n     <!--App Options Panel-->';
                        html += '\n     <div class="card card-body card-outline px-1 py-3 mb-2" style="background-color: transparent;">';
                        html += '\n         <div class="row">';
                        // Start Here

                        let apps = [];
                        manifest.smartApps.parent['isParent'] = true;
                        apps.push(manifest.smartApps.parent);
                        if (manifest.smartApps.children.length) {
                            for (const sa in manifest.smartApps.children) {
                                manifest.smartApps.children[sa]['isChild'] = true;
                                apps.push(manifest.smartApps.children[sa]);
                            }
                        }
                        html += createAppDevTable(apps, manifest.deviceHandlers.length, 'app');

                        let devs = [];
                        if (manifest.deviceHandlers.length) {
                            for (const dh in manifest.deviceHandlers) {
                                devs.push(manifest.deviceHandlers[dh]);
                            }
                        }
                        html += createAppDevTable(devs, true, 'device');
                        html += '\n      </div>';
                        html += '\n  </div>';
                        // Stop Here
                        html += '\n  <div class="card card-body card-outline p-1 mb-2" style="background-color: transparent;">';
                        html += '\n       <div class="flex-row align-right mr-1 mt-1">';
                        html += '\n           <div class="d-flex flex-column justify-content- align-items-center">';
                        html += '\n               <button id="installBtn" type="button" class="btn btn-success" style="border-radius: 40px;">Install</button>';
                        // html += '\n               <button id="removeBtn" type="button" class="btn btn-danger" style="border-radius: 40px;">Remove</button>';
                        html += '\n           </div>';
                        html += '\n       </div>';
                        html += '\n  </div>';
                        html += '\n</div>';
                        html += '\n<div class="clearfix"></div>';
                    }
                    // html += '\n</div>';
                    $('#appViewDiv').append(html);
                    $('#listContDiv').css({ display: 'none' });
                    $('#loaderDiv').css({ display: 'none' });
                    $('#actResultsDiv').css({ display: 'none' });
                    $('#appViewDiv').css({ display: 'block' });
                    let appViewCard = $('#appViewCard');
                    if (appViewCard.height() > 390) {
                        appViewCard.height(appViewCard.height() + 50 + 'px');
                    }
                    $('#appCloseBtn').click(function() {
                        console.log('appCloseBtn');
                        updSectTitle('Select an Item');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'block' });
                        buildAppList();
                    });
                    $('#installBtn').click(function() {
                        var selected = {};
                        selected['smartapps'] = [];
                        selected['devices'] = [];
                        $('#appViewCard input:checked').each(function() {
                            let itemName = $(this).attr('id');
                            if (itemName.startsWith('smartapp')) {
                                selected['smartapps'].push($('#' + $(this).attr('id') + 'name').text());
                            }
                            if (itemName.startsWith('device')) {
                                selected['devices'].push($('#' + $(this).attr('id') + 'name').text());
                            }
                        });
                        console.log('checked: ', selected);
                        updSectTitle('Install Progress');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'none' });
                        $('#loaderDiv').css({ display: 'block' });
                        $('#actResultsDiv').css({ display: 'block' });
                        scrollToTop();
                        processIntall(manifest, selected);
                    });
                    $('#removeBtn').click(function() {
                        updSectTitle('Removal Progress');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'none' });
                        $('#loaderDiv').css({ display: 'block' });
                        $('#actResultsDiv').css({ display: 'block' });
                        scrollToTop();
                        removeAppsFromIde(manifest);
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

function scrollToTop() {
    $(document).ready(function() {
        $(this).scrollTop(0);
    });
}

function loaderFunc() {
    $('#results').html('<small>Waiting for connection...</small>');
    if (sessionStorage.refreshCount === undefined) {
        sessionStorage.refreshCount = '0';
    }
    scrollToTop();
    sessionStorage.refreshCount = Number(sessionStorage.refreshCount) + 1;
    updSectTitle('App Details', true);
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
    updateHeadHtml();
    buildCoreHtml();
    loaderFunc();
});