var scriptVersion = '1.0.205a';
var scriptVerDate = '2/05/2018';

var repoId = '';
var writableRepos = [];
var availableApps;
var availableDevs;
var currentManifest;
var metricsData;
var retryCnt = 0;
var refreshCount;
const authUrl = generateStUrl('hub');
const fetchReposUrl = generateStUrl('github/writeableRepos');
const updRepoUrl = generateStUrl('githubAuth/updateRepos');
const updFormUrl = generateStUrl('githubAuth/updateForm');
const doAppRepoUpdUrl = generateStUrl('ide/app/doRepoUpdates');
const doAppRemoveUrl = generateStUrl('ide/app/delete/');
const doDevRemoveUrl = generateStUrl('ide/device/delete/');
const doDevRepoUpdUrl = generateStUrl('ide/device/doRepoUpdates');
const doDevSettingUpdUrl = generateStUrl('ide/device/update');
const doAppSettingUpdUrl = generateStUrl('ide/app/update');

const appUpdChkUrl = generateStUrl('github/appRepoStatus?appId=');
const appUpdApplyUrl = generateStUrl('ide/app/updateOneFromRepo/');
const appUpdPubUrl = generateStUrl('ide/app/publishAjax/');
const devUpdChkUrl = generateStUrl('github/deviceRepoStatus?deviceTypeId=');
const devUpdApplyUrl = generateStUrl('ide/device/updateOneFromRepo/');
const devUpdPubUrl = generateStUrl('ide/device/publishAjax/');
const availableSaUrl = generateStUrl('api/smartapps/editable');
const availableDevsUrl = generateStUrl('ide/devices');

var appManifests;

function generateStUrl(path) {
    return serverUrl + path;
}

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

function cleanString(str) {
    if (str) {
        return str === undefined ? '' : str.replace(/[^a-zA-Z0-9 ]/gi, ' ').replace(/\s{2,}/gi, ' ').trim();
    }
}

function cleanIdName(name) {
    return name.toString().replace(/ /g, '_');
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
    if (reload && parseInt(localStorage.getItem('refreshCount')) < 7) {
        setTimeout(loaderFunc, 1000);
    } else {
        if (err === 'Unauthorized') {
            installComplete('Your Auth Session Expired.  Please go back and sign in again', true);
        } else {
            installComplete(err, true);
        }
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
    $('#resultsHomeBtn').css({ display: 'block' });
    updSectTitle('', true);
    localStorage.removeItem('refreshCount');
    scrollToTop();
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

function buildInstallParams(repoid, items, type) {
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
                                            processIntall(repoData, selctd);
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
                                                                if (resp && repoData.deviceHandlers && repoData.deviceHandlers.length) {
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
                processIntall(repoData, selctd);
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
        addResult('Repo (' + repoData.repoName + ')', true, 'repo', 'Not Added');
        makeRequest(updRepoUrl, 'POST', repoParams, null, null, 'application/x-www-form-urlencoded', '', true)
            .catch(function(err) {
                installError(err, false);
                addResult('Github Repo Issue', false, 'repo', err);
                installComplete('Error!<br/>Try Again Later!', true);
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                updLoaderText('Verifying', 'Repo');
                checkIdeForRepo(repoData.repoName, repoData.repoBranch)
                    .catch(function(err) {
                        installError(err, false);
                        reject(err);
                    })
                    .then(function(resp) {
                        if (resp === true) {
                            addResult('Repo (' + repoData.repoName + ')', true, 'repo', 'Added');
                            addResult('Repo (' + repoData.repoName + ')', true, 'repo', 'Verified');
                        }
                        resolve(resp);
                    });
                resolve(false);
            });
    });
}

function checkItemUpdateStatus(objId, type) {
    return new Promise(function(resolve, reject) {
        let url = type === 'device' ? devUpdChkUrl : appUpdChkUrl;
        makeRequest(url + objId, 'GET', null)
            .catch(function(err) {
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                let data = JSON.parse(resp);
                if (data.hasDifference === true) {
                    resolve(true);
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
            let repoParams = buildInstallParams(repoId, appNames, 'apps');
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

function removeAppsFromIde(appNames, selctd) {
    return new Promise(function(resolve, reject) {
        var allAppItems = [];
        for (const ca in appNames.smartApps.children) {
            if (selctd.smartapps.includes(appNames.smartApps.children[ca].name)) {
                allAppItems.push(appNames.smartApps.children[ca]);
            }
        }
        if (selctd.smartapps.includes(appNames.smartApps.parent.name)) {
            allAppItems.push(appNames.smartApps.parent);
        }
        var allDevItems = [];
        for (const dh in appNames.deviceHandlers) {
            if (selctd.devices.includes(appNames.deviceHandlers[dh].name)) {
                allDevItems.push(appNames.deviceHandlers[dh]);
            }
        }
        updLoaderText('Beginning', 'Removal');
        // console.log('repoParams: ', repoParams);
        if (allAppItems) {
            for (const da in availableApps) {
                for (const i in allAppItems) {
                    if (availableApps[da].name === allAppItems[i].name) {
                        makeRequest(doAppRemoveUrl + availableApps[da].id, 'GET', null)
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
                    }
                }
            }
        }

        if (allDevItems) {
            for (const i in allDevItems) {
                for (const da in availableDevs) {
                    if (availableDevs[da].name.trim() === allDevItems[i].name.trim()) {
                        makeRequest(doDevRemoveUrl + availableDevs[da].id, 'GET', null)
                            .catch(function(err) {
                                installError(err, false);
                                addResult('Device Removal Issue', false, 'device', err);
                                installComplete('Error!<br/>Try Again Later!', true);
                                reject(err);
                            })
                            .then(function(resp) {
                                updLoaderText('Devices', 'Removed');
                                addResult(allDevItems[i].name, true, 'device', 'Device Removed');
                                installComplete('Removals are Complete!<br/>Everything is Good!');
                            });
                    }
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
                        makeRequest(doAppSettingUpdUrl, 'POST', appParams, null, null, 'application/x-www-form-urlencoded', '', true)
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
                                if (i < 1 ? 1 : i + 1 === updApps.length) {
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
            let repoParams = buildInstallParams(repoId, devNames, 'devices');
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
                        addResult(devNames[i].name.trim(), true, 'device', 'Installed');
                    }
                    resolve(true);
                });
        }
    });
}

function parseDomForDevices(domData) {
    const parser = new DOMParser();
    const respDoc = parser.parseFromString(domData.toString(), 'text/html');
    const appTable = respDoc.getElementById('devicetype-table');
    const theBody = appTable.getElementsByTagName('tbody');
    const theApps = theBody[0].getElementsByTagName('tr');
    const fndDTH = [];
    for (var i = 0; i < theApps.length; i++) {
        let devName = theApps[i].getElementsByClassName('namespace-name')[0].getElementsByTagName('a')[0].innerText.replace(/\n/g, '').trim().split(':');
        // let gitHubArr = theApps[i].getElementsByTagName('td')[2].innerHTML.replace(/<script[^>]*>(?:(?!<\/script>)[^])*<\/script>/g, '').replace(/\n/g, '').trim();
        fndDTH.push({
            id: theApps[i].id,
            name: (devName.length > 1 ? devName[1] : devName).toString().trim(),
            published: theApps[i].getElementsByTagName('td')[3].innerText.replace(/\n/g, '').trim() === 'Published'
                // capabilities: theApps[i].getElementsByTagName('td')[4].innerText.replace(/\n/g, '').trim(),
                // oAuth: theApps[i].getElementsByTagName('td')[5].innerText.replace(/\n/g, '').trim()
        });
    }
    // console.log(fndDTH);
    return fndDTH;
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
                        let fndDevs = parseDomForDevices(resp);
                        if (fndDevs.length) {
                            availableDevs = fndDevs;
                            out['devices'] = fndDevs;
                        }
                        resolve(out);
                    });
            });
    });
}

function checkIfItemsInstalled(itemObj, type, secondPass = false) {
    return new Promise(function(resolve, reject) {
        let url = type === 'device' ? availableDevsUrl : availableSaUrl;
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
                let itemsFnd;
                if (resp.length) {
                    if (type === 'device') {
                        itemsFnd = parseDomForDevices(resp);
                        availableDevs = itemsFnd;
                    } else {
                        itemsFnd = JSON.parse(resp);
                        availableApps = itemsFnd;
                    }
                    updLoaderText('Analyzing', capitalize(type));
                    for (let a in itemObj) {
                        for (let i in itemsFnd) {
                            if (itemsFnd[i].name === itemObj[a].name) {
                                // console.error('itemsFnd: ', itemsFnd[i].name, ' | requested ' + type + ': ' + itemObj[a].name, 'isMatch: (' + (itemsFnd[i].name === itemObj[a].name) + ')');
                                if (!secondPass) {
                                    addResult(itemObj[a].name, true, type, 'Already Installed');
                                }
                                delete itemObj[a];
                                break;
                            } else {
                                // console.log('itemsFnd: ', itemsFnd[i].name, ' | requested ' + type + ': ' + itemObj[a].name, 'isMatch: (' + (itemsFnd[i].name === itemObj[a].name) + ')');
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

function getAppManifests() {
    return new Promise(function(resolve, reject) {
        updLoaderText('Getting', 'App Manifest');
        makeRequest(baseAppUrl + '/content/configs/secret_sauce.json', 'GET', null)
            .catch(function(err) {
                reject(err);
            })
            .then(function(resp) {
                // console.log(resp);
                let mani = JSON.parse(resp);
                if (mani.apps && mani.apps.length > 0) {
                    appManifests = mani.apps;
                    resolve(mani.apps);
                } else {
                    resolve(undefined);
                }
            });
    });
}

function incrementAppView(appName) {
    var fb = new Firebase('https://community-installer-34dac.firebaseio.com/metrics/appViews/' + appName);
    fb.transaction(function(currentVal) {
        isFinite(currentVal) || (currentVal = 0);
        return currentVal + 1;
    });
}

function incrementAppInstall(appName) {
    var fb = new Firebase('https://community-installer-34dac.firebaseio.com/metrics/appInstalls/' + appName);
    fb.transaction(function(currentVal) {
        isFinite(currentVal) || (currentVal = 0);
        return currentVal + 1;
    });
}

function incrementLikeDislike(appName, type) {
    var fb = new Firebase('https://community-installer-34dac.firebaseio.com/metrics/appRatings/' + appName);
    fb.transaction(function(currentVal) {
        isFinite(currentVal) || (currentVal = 0);
        return currentVal + 1;
    });
}

function findAppMatch(srchStr, data) {
    if (srchStr === undefined) {
        return data.sort(dynamicSort('name'));
    }
    if (srchStr.length >= 3) {
        return data.filter(appItem => JSON.stringify(appItem).toString().toLowerCase().includes(srchStr.toLowerCase())).sort(dynamicSort('name'));
    } else {
        return data.sort(dynamicSort('name'));
    }
}

function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === '-') {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function(a, b) {
        var result = a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
        return result * sortOrder;
    };
}

function searchForApp(evtSender) {
    let srchVal = $('#appSearchBox').val();
    console.log('AppSearch Event (' + evtSender + '): ' + srchVal);
    buildAppList(srchVal);
}

function startMetricsListener() {
    var fb = new Firebase('https://community-installer-34dac.firebaseio.com/metrics/');
    fb.on('value', function(snap) {
        var v = snap.val();
        console.log('v: ', v);
        metricsData = v;
        updateMetricsData();
    });
}

function updateMetricsData() {
    let v = metricsData;
    if (v !== undefined && v !== null && Object.keys(v).length) {
        if (v.appInstalls && Object.keys(v.appInstalls).length) {
            for (const i in v.appInstalls) {
                var iItem = $('#' + i + '_install_cnt');
                let cnt = parseInt(v.appInstalls[i]);
                if (cnt >= 1) {
                    iItem.removeClass('grey').addClass('orange').text(cnt);
                }
            }
        }
        if (v.appViews && Object.keys(v.appViews).length) {
            for (const i in v.appViews) {
                var vItem = $('#' + i + '_view_cnt');
                if (vItem.length) {
                    let cnt = parseInt(v.appViews[i]);
                    if (cnt >= 1) {
                        vItem.removeClass('grey').addClass('purple').text(cnt);
                    }
                }
            }
        }
        if (v.appRatings && Object.keys(v.appRatings).length) {
            for (const i in v.appRatings) {
                // var vItem = $('#' + i + '_view_cnt');
                // if (vItem.length) {
                //     let cnt = parseInt(v.appViews[i]);
                //     if (cnt >= 1) {
                //         vItem.removeClass('grey').addClass('purple').text(cnt);
                //     }
                // }
            }
        }
    }
}

function getIsAppOrDeviceInstalled(itemName, type) {
    let res = {};
    if (itemName && type) {
        let data = type === 'app' ? availableApps : availableDevs;
        let instApp = data.filter(app => app.name.toString() === itemName.toString() || app.name.toString() === cleanString(itemName.toString()) || app.name.toString().toLowerCase() === itemName.toString().toLowerCase());
        res['installed'] = instApp[0] !== undefined && instApp.length > 0;
        res['data'] = instApp;
    } else {
        res['installed'] = false;
        res['data'] = [];
    }
    return res;
}

function processItemsStatuses(data, viewType) {
    if (viewType === 'appList') {
        if (data.length > 0) {
            for (let i in data) {
                updateAppDeviceItemStatus(data[i].appName, 'app', viewType);
            }
        }
    } else {
        if (Object.keys(data).length > 0) {
            updateAppDeviceItemStatus(data.smartApps.parent.name, 'app', viewType);
            if (data.smartApps.children.length) {
                for (const sa in data.smartApps.children) {
                    updateAppDeviceItemStatus(data.smartApps.children[sa].name, 'app', viewType);
                }
            }
            if (data.deviceHandlers.length) {
                for (const dh in data.deviceHandlers) {
                    updateAppDeviceItemStatus(data.deviceHandlers[dh].name, 'device', viewType);
                }
            }
        }
    }
}

function updateAppDeviceItemStatus(itemName, type, viewType) {
    if (itemName) {
        let installedItem = getIsAppOrDeviceInstalled(itemName, type);
        let appInstalled = installedItem.installed === true;
        let statusElementName = cleanIdName(itemName) + '_appview_status_' + type;
        if (installedItem && installedItem.data && installedItem.data[0] !== undefined) {
            if (viewType === 'appList') {
                statusElementName = itemName;
            }
            checkItemUpdateStatus(installedItem.data[0].id, type)
                .catch(function(err) {

                })
                .then(function(resp) {
                    updateAvail = resp === true;
                    if (appInstalled || updateAvail) {
                        let itemStatus;
                        let color;
                        if (updateAvail) {
                            itemStatus = 'Updates';
                            color = viewType === 'appList' ? 'ribbon-orange' : 'orange';
                            $('#updateBtn').show();
                        } else {
                            itemStatus = 'Installed';
                            color = viewType === 'appList' ? 'ribbon-blue' : 'blue';
                        }
                        if (viewType === 'appList') {
                            updateAppListStatusRibbon(statusElementName, itemStatus, color);
                        } else {
                            $('#' + statusElementName).text(itemStatus).addClass(color);
                            if (updateAvail) {
                                $('#' + statusElementName).data("hasUpdate", true);
                            }
                            $('#' + statusElementName).data("details", {
                                id: installedItem.data[0].id,
                                type: type,
                                name: installedItem.data[0].name
                            });
                            if (appInstalled) { $('#' + statusElementName).data("installed", true); }
                        }
                    }
                });
        } else {
            if (viewType === 'appView') {
                $('#' + statusElementName).text('Not Installed');
            }
        }
    }
}

function updateAppListStatusRibbon(itemName, status, color = undefined) {
    if (itemName && status) {
        let ribbon = $('#' + itemName + '_ribbon');
        let ribbonStatus = $('#' + itemName + '_ribbon_status');

        $(ribbon).css({ display: 'block' });

        if (color) {
            $(ribbonStatus).addClass(color);
        }
        $(ribbonStatus).text(status);
    }
}

function buildAppList(filterStr = undefined) {
    searchBtnAvail(true);
    let html = '';
    let appData = findAppMatch(filterStr, appManifests);
    currentManifest = appData;
    html += '\n           <div id="searchFormDiv" class="d-flex flex-row justify-content-center align-items-center">';
    html += '\n               <div class="d-flex w-100 flex-column m-2">';
    html += '\n                <form id="searchForm" style="display: none;">';
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
        html += '\n       <div class="p-2 mb-0" style="background-color: transparent;">';
        html += '\n           <table id="appListTable" class="table table-sm mb-0">';
        html += '\n               <tbody>';

        for (let i in appData) {
            html += '\n   <tr style="border-bottom-style: hidden; border-top-style: hidden;">';
            html += '\n   <td class="py-1">';
            html += '\n     <a href="#" id="' + appData[i].appName + '" class="list-group-item list-group-item-action flex-column align-items-start p-2" style="border-radius: 20px;">';

            html += '\n         <div id="' + appData[i].appName + '_ribbon" class="ribbon" style="display: none;"><span id="' + appData[i].appName + '_ribbon_status"> </span></div>';

            html += '\n         <!-- APP NAME SECTION TOP (START)-->';
            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <div class="d-flex justify-content-start align-items-center">';
            html += '\n                         <h6 class="h6-responsive" style="font-size: 100%;"><img src="' + appData[i].iconUrl + '" height="40" class="d-inline-block align-middle" alt=""> ' + appData[i].name + '</h6>';
            html += '\n                     </div>';
            html += '\n                 </div>';
            html += '\n             </div>';

            html += '\n         </div>';
            html += '\n         <!-- APP NAME SECTION TOP (END)-->';

            html += '\n         <!-- APP DESCRIPTION SECTION (START)-->';
            html += '\n         <div class="d-flex justify-content-start align-items-center mt-1 mb-3" style="border-style: inset; border: 1px solid grey; border-radius: 5px;">';
            html += '\n             <p class="d-flex m-2 justify-content-center"><small class="align-middle">' + appData[i].description + '</small></p>';
            html += '\n         </div>';
            html += '\n         <!-- APP DESCRIPTION SECTION (END)-->';

            html += '\n         <!-- APP METRICS SECTION (START)-->';
            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center mb-3">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Views:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <span id="' + appData[i].appName + '_view_cnt" class="badge badge-pill grey white-text align-middle">0</span>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Ratings:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <div class="mx-2"><span id="' + appData[i].appName + '_like_cnt" class="black-text"><i class="fa fa-thumbs-up fa-sm green-text"></i> 1553</span></div>';
            html += '\n                     <div class="mx-2"><span id="' + appData[i].appName + '_dislike_cnt" class="black-text"><i class="fa fa-thumbs-down fa-sm red-text"></i> 253</span></div>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Installs:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <span id="' + appData[i].appName + '_install_cnt" class="badge badge-pill grey white-text align-middle">0</span>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n         </div>';
            html += '\n         <!-- APP METRICS SECTION (END)-->';

            html += '\n         <!-- APP STATUS SECTION TOP (START)-->';
            html += '\n         <div class="d-flex w-100 justify-content-between align-items-center">';
            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Author:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle" style="font-size: 12px;"><em>' + appData[i].author + '</em></small>';
            html += '\n                 </div>';
            html += '\n             </div>';

            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center">';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><u><b>Category:</b></u></small>';
            html += '\n                 </div>';
            html += '\n                 <div class="d-flex flex-row">';
            html += '\n                     <small class="align-middle"><em>' + appData[i].category + '</em></small>';
            html += '\n                 </div>';
            html += '\n             </div>';
            html += '\n         </div>';
            html += '\n         <!-- APP STATUS SECTION TOP (END)-->';
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
    scrollToTop();
    updSectTitle('Select an Item');
    $('#listContDiv').html('').html(html);

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
    $('#showSearchBtn').click(function() {
        console.log('showSearchBtn clicked...');
        if ($('#searchForm').is(':visible')) {
            $('#searchForm').hide();
        } else {
            $('#searchForm').show();
        }
    });
    $('#appListTable').on('click', 'td a', function() {
        console.log('App Item Clicked: (' + this.id + ')');
        if (this.id) {
            renderAppView(this.id);
        }
    });
    $('#listContDiv').css({ display: 'block' });
    updateMetricsData();
    processItemsStatuses(appData, 'appList');
    new WOW().init();
}

function searchBtnAvail(show = true) {
    if (show) {
        $('#showSearchBtn').show();
    } else {
        $('#showSearchBtn').hide();
    }
}

function createAppDevTable(items, areDevices = false, type) {
    let html = '';
    if (items.length) {
        // html += '\n   <div class="col-xs-12 ' + (areDevices ? 'col-md-6' : 'col-sm-12') + ' mb-2 p-0">';
        html += '\n   <div class="col mb-2 p-0">';
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
            html += '\n                       <tr>';
            html += '\n                           <td class="align-middle py-0" style="border: 1px solid grey;">';
            html += '\n                               <div class="d-flex flex-column ml-2">';
            html += '\n                                   <div class="d-flex flex-column justify-content-start my-1 form-check' + disabled + '">';
            html += '\n                                       <div class="flex-column justify-content-start">';
            html += '\n                                           <div class="d-flex flex-row">';
            html += '\n                                               <input class="form-check-input align-middle" type="checkbox" value="" id="' + itemId + '"' + checked + disabled + '>';
            html += '\n                                               <label class="form-check-label align-middle" for="' + itemId + '"><small id="' + itemId + 'name" class="align-middle" style="font-size: 0.7em; white-space: nowrap;">' + items[item].name + '</small></label>';
            html += '\n                                           </div>';
            html += '\n                                       </div>';
            html += '\n                                   </div>';
            html += '\n                               </div>';
            html += '\n                           </td>';
            html += '\n                           <td class="align-middle" style="border: 1px solid grey;">';
            html += '\n                               <div class="d-flex flex-column align-items-center">';
            html += '\n                                   <small class="align-middle" style="margin: 2px auto;"><span class="badge grey white-text align-middle">v' + items[item].version + '</span></small>';
            html += '\n                                   <small class="align-middle" style="margin: 2px auto;"><span id="' + cleanIdName(items[item].name) + '_appview_status_' + type + '" class="badge white-text align-middle"></span></small>';
            html += '\n                               </div>';
            html += '\n                           </td>';
            html += '\n                           <td class="align-middle py-0" style="border: 1px solid grey;">';
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
    incrementAppView(appName);
    searchBtnAvail(false);
    let html = '';
    var manifest;
    if (appManifests.length > 0) {
        let appItem = appManifests.filter(app => app.appName === appName);
        // console.log(appItem);
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
                        if (manifest.forumUrl || manifest.docUrl) {
                            html += '\n     <!--Community Description Panel-->';
                            html += '\n     <div class="card card-body card-outline px-1 py-3 mb-2" style="background-color: transparent;">';
                            html += '\n         <div class="d-flex justify-content-center align-items-center mx-auto">';
                            html += '\n             <div class="d-flex flex-column justify-content-center align-items-center mx-2">';
                            html += '\n                 <div class="btn-group" role="group" aria-label="Basic example">';
                            if (manifest.forumUrl) {
                                html += '\n                 <div class="d-flex flex-row">';
                                html += '\n                     <a class="btn btn-sm mx-2" href="' + manifest.forumUrl + '"><small-medium class="orange-text">Project Link</small-medium></a>';
                                html += '\n                 </div>';
                            }
                            if (manifest.docUrl) {
                                html += '\n                 <div class="d-flex flex-row">';
                                html += '\n                     <a class="btn btn-sm mx-2" href="' + manifest.docUrl + '"><small-medium class="orange-text">Documentation</small-medium></a>';
                                html += '\n                 </div>';
                            }
                            html += '\n                 </div>';
                            html += '\n             </div>';
                            html += '\n         </div>';
                            html += '\n     </div>';
                            html += '\n     <!--/.Community Description Panel-->';
                        }
                        if (manifest.repoName && manifest.repoBranch && manifest.repoOwner) {
                            html += '\n     <!--Repo Description Panel-->';
                            html += '\n     <div class="card card-body card-outline px-1 py-0 mb-2" style="background-color: transparent;">';

                            html += '\n           <!--Accordion wrapper-->';
                            html += '\n           <div class="accordion" id="repoAccordionEx" role="tablist" aria-multiselectable="true">';

                            html += '\n               <!-- Accordion card -->';
                            html += '\n               <div class="card mb-0" style="background-color: transparent; border-bottom: none;">';

                            html += '\n                   <!-- Card header -->';
                            html += '\n                   <div class="card-header my-0" role="tab" id="repoCardCollapseHeading">';
                            html += '\n                       <a data-toggle="collapse" data-parent="#repoAccordionEx" href="#repoCardCollapse" aria-expanded="true" aria-controls="repoCardCollapse">';
                            html += '\n                           <h6 class="white-text mb-0"><u>GitHub Details</u> <i class="fa fa-angle-down rotate-icon"></i></h6>';
                            html += '\n                       </a>';
                            html += '\n                   </div>';

                            html += '\n                   <!-- Card body -->';
                            html += '\n                   <div id="repoCardCollapse" class="collapse" role="tabpanel" aria-labelledby="repoCardCollapseHeading">';
                            html += '\n                       <div class="card-body white-text py-0">';
                            html += '\n                         <div class="d-flex justify-content-center align-items-center mx-auto mb-2">';
                            html += '\n                             <div class="d-flex flex-column justify-content-center align-items-center mx-2">';
                            html += '\n                                 <div class="d-flex flex-row">';
                            html += '\n                                     <small class="align-middle"><b>Repo Name</b></small>';
                            html += '\n                                 </div>';
                            html += '\n                                 <div class="d-flex flex-row">';
                            html += '\n                                     <small class="align-middle mx-2"><em>' + manifest.repoName + '</em></small>';
                            html += '\n                                 </div>';
                            html += '\n                             </div>';
                            html += '\n                             <div class="d-flex flex-column justify-content-center align-items-center mx-2">';
                            html += '\n                                 <div class="d-flex flex-row">';
                            html += '\n                                     <small class="align-middle"><b>Branch</b></small>';
                            html += '\n                                 </div>';
                            html += '\n                                 <div class="d-flex flex-row">';
                            html += '\n                                     <small class="align-middle mx-2"><em>' + manifest.repoBranch + '</em></small>';
                            html += '\n                                 </div>';
                            html += '\n                             </div>';
                            html += '\n                             <div class="d-flex flex-column justify-content-center align-items-center mx-2">';
                            html += '\n                                 <div class="d-flex flex-row">';
                            html += '\n                                     <small class="align-middle"><b>Owner</b></small>';
                            html += '\n                                 </div>';
                            html += '\n                                 <div class="d-flex flex-row">';
                            html += '\n                                     <small class="align-middle mx-2"><em>' + manifest.repoOwner + '</em></small>';
                            html += '\n                                 </div>';
                            html += '\n                             </div>';
                            html += '\n                         </div>';
                            html += '\n                       </div>';
                            html += '\n                   </div>';
                            html += '\n               </div>';
                            html += '\n               <!-- Accordion card -->';
                            html += '\n           </div>';
                            html += '\n           <!--/.Accordion wrapper-->';

                            html += '\n     </div>';
                            html += '\n     <!--/.Repo Description Panel-->';
                        }
                        if (manifest.notes) {
                            html += '\n     <!--Notes Block Panel-->';
                            html += '\n     <div class="card card-body card-outline px-1 py-0 mb-2" style="background-color: transparent;">';

                            html += '\n           <!--Accordion wrapper-->';
                            html += '\n           <div class="accordion" id="notesAccordionEx" role="tablist" aria-multiselectable="true">';

                            html += '\n               <!-- Accordion card -->';
                            html += '\n               <div class="card mb-0" style="background-color: transparent; border-bottom: none;">';

                            html += '\n                   <!-- Card header -->';
                            html += '\n                   <div class="card-header my-0" role="tab" id="notesCardCollapseHeading">';
                            html += '\n                       <a data-toggle="collapse" data-parent="#notesAccordionEx" href="#notesCardCollapse" aria-expanded="true" aria-controls="notesCardCollapse">';
                            html += '\n                           <h6 class="white-text mb-0"><u>Notes</u> <i class="fa fa-angle-down rotate-icon"></i></h6>';
                            html += '\n                       </a>';
                            html += '\n                   </div>';

                            html += '\n                   <!-- Card body -->';
                            html += '\n                   <div id="notesCardCollapse" class="collapse" role="tabpanel" aria-labelledby="notesCardCollapseHeading">';
                            html += '\n                       <div class="card-body white-text py-0">';
                            html += '\n                         <div class="d-flex justify-content-center align-items-center mx-auto mb-2">';
                            html += '\n                             <div class="d-flex flex-column justify-content-center align-items-center mx-2">';
                            html += '\n                                 <div>';
                            html += '\n                                     ' + manifest.notes;
                            html += '\n                                 </div>';
                            html += '\n                             </div>';
                            html += '\n                         </div>';
                            html += '\n                       </div>';
                            html += '\n                   </div>';
                            html += '\n               </div>';
                            html += '\n               <!-- Accordion card -->';
                            html += '\n           </div>';
                            html += '\n           <!--/.Accordion wrapper-->';

                            html += '\n     </div>';
                            html += '\n     <!--/.Notes Block Panel-->';
                        }
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
                        html += '\n  <div class="card card-body card-outline p-1 my-2" style="background-color: transparent;">';
                        html += '\n       <div class="flex-row align-right mr-1 my-2">';
                        html += '\n           <div class="d-flex flex-column justify-content- align-items-center">';
                        html += '\n               <div class="btn-group">';
                        html += '\n                   <button id="installBtn" type="button" class="btn btn-success mx-2" style="border-radius: 20px;">Install</button>';
                        // html += '\n                   <button id="removeBtn" type="button" class="btn btn-danger mx-2" style="border-radius: 20px;">Remove</button>';
                        html += '\n                   <button id="updateBtn" type="button" class="btn btn-warning mx-2" style="border-radius: 20px; display: none;">Update</button>';
                        html += '\n               </div>';
                        html += '\n           </div>';
                        html += '\n       </div>';
                        html += '\n  </div>';
                        html += '\n</div>';
                        html += '\n<div class="clearfix"></div>';
                    }
                    scrollToTop();
                    $('#appViewDiv').append(html).css({ display: 'block' });
                    $('#listContDiv').css({ display: 'none' });
                    $('#loaderDiv').css({ display: 'none' });
                    $('#actResultsDiv').css({ display: 'none' });
                    processItemsStatuses(manifest, 'appView');
                    $('#appCloseBtn').click(function() {
                        console.log('appCloseBtn');
                        updSectTitle('Select an Item');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'block' });
                    });
                    $('#installBtn').click(function() {
                        let selectedItems = getSelectedCodeItems();
                        // console.log('checked: ', selectedItems);
                        updSectTitle('Install Progress');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'none' });
                        $('#loaderDiv').css({ display: 'block' });
                        $('#actResultsDiv').css({ display: 'block' });
                        scrollToTop();
                        incrementAppInstall(appName);
                        processIntall(manifest, selectedItems);
                    });
                    $('#removeBtn').click(function() {
                        let selectedItems = getSelectedCodeItems();
                        updSectTitle('Removal Progress');
                        $('#appViewDiv').html('');
                        $('#appViewDiv').css({ display: 'none' });
                        $('#listContDiv').css({ display: 'none' });
                        $('#loaderDiv').css({ display: 'block' });
                        $('#actResultsDiv').css({ display: 'block' });
                        scrollToTop();
                        removeAppsFromIde(manifest, selectedItems);
                    });
                    $('#updateBtn').click(function() {
                        let devUpds = getUpdateItemsByType('device');
                        let appUpds = getUpdateItemsByType('app');
                        // updSectTitle('Update Progress');
                        // $('#appViewDiv').html('');
                        // $('#appViewDiv').css({ display: 'none' });
                        // $('#listContDiv').css({ display: 'none' });
                        // $('#loaderDiv').css({ display: 'block' });
                        // $('#actResultsDiv').css({ display: 'block' });
                        // scrollToTop();
                        // removeAppsFromIde(manifest, selectedItems);
                    });
                    if (areAllItemsInstalled(manifest) === true) {
                        $('#installBtn').prop('disabled', true);
                    } else { $('#installBtn').prop('disabled', false); }
                    new WOW().init();
                });
        }
    }
}

function areAllItemsInstalled(manifest) {
    let appsInst = getInstalledItemsByType('app');
    let devsInst = getInstalledItemsByType('device');
    if (Object.keys(manifest).length > 0) {
        if (appsInst.filter(app => app.name === manifest.smartApps.parent.name).length >= 1) {
            delete manifest.smartApps['parent'];
        }
        if (manifest.smartApps.children.length) {
            for (const sa in manifest.smartApps.children) {
                if (appsInst.filter(app => app.name === manifest.smartApps.children[sa].name).length >= 1) {
                    delete manifest.smartApps.children[sa];
                }
            }
        }
        if (manifest.deviceHandlers.length) {
            for (const dh in manifest.deviceHandlers) {
                if (devsInst.filter(dev => dev.name === manifest.deviceHandlers[dh].name).length >= 1) {
                    delete manifest.deviceHandlers[dh];
                }
            }
        }
    }
    if (manifest.smartApps.parent === undefined && manifest.smartApps.children.length < 1 && manifest.deviceHandlers.length < 1) {
        return true;
    } else { return false; }
}

function getInstalledItemsByType(type) {
    if (type) {
        let results = [];
        let items = $('span').filter(function() {
            return $(this).data('installed') === true && $(this).data('details').type === type;
        });
        for (var i in items) {
            results.push(items[i].data());
        }
        return results;
    }
    return undefined;
}

function getUpdateItemsByType(type) {
    if (type) {
        let results = [];
        let items = $('span').filter(function() {
            return $(this).data('hasUpdate') === true && $(this).data('details').type === type;
        });
        for (var i in items) {
            results.push(items[i].data());
        }
        return results;
    }
    return undefined;
}

function getSelectedCodeItems() {
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
}

function scrollToTop() {
    $(document).ready(function() {
        $(this).scrollTop(0);
    });
}

function defineClickActions() {}

function loaderFunc() {
    if (localStorage.getItem('refreshCount') === null) {
        localStorage.setItem('refreshCount', '0');
    }
    localStorage.setItem('refreshCount', (parseInt(localStorage.getItem('refreshCount')) + 1).toString());
    scrollToTop();
    updSectTitle('App Details', true);
    getStAuth()
        .catch(function(err) {
            if (err === 'Unauthorized' && parseInt(localStorage.getItem('refreshCount')) > 6) {
                installComplete('Your Auth Session Expired.  Please go back and sign in again', true);
            } else {
                installError(err, true);
            }
        })
        .then(function(resp) {
            if (resp === true) {
                getAppManifests()
                    .catch(function(err) {
                        installComplete('Unable to App List Manifest', true);
                    })
                    .then(function(manifestResp) {
                        getAvailableAppsDevices(true)
                            .catch(function(err) {
                                if (err === 'Unauthorized') {
                                    installComplete('Your Auth Session Expired.  Please go back and sign in again', true);
                                }
                                installError(err, false);
                            })
                            .then(function(resp) {
                                scrollToTop();
                                if (resp && resp.apps && Object.keys(resp).length) {
                                    loadAppList();
                                }
                            });
                    });
            }
        });
}

function loadAppList() {
    if ((appManifests !== undefined && appManifests.length > 0) || (availableApps !== undefined && availableApps.length > 0)) {
        buildAppList();
        startMetricsListener();
    }
}

function buildCoreHtml() {
    let head = '';
    head += '\n                 <meta charset="utf-8">';
    head += '\n                 <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=0">';
    head += '\n                 <meta http-equiv="cleartype" content="on">';
    head += '\n                 <meta name="MobileOptimized" content="320">';
    head += '\n                 <meta name="HandheldFriendly" content="True">';
    head += '\n                 <meta name="apple-mobile-web-app-capable" content="yes">';
    head += '\n                 <link rel="shortcut icon" type="image/x-icon" href="' + baseAppUrl + '/content/images/app_logo.ico" />';
    head += '\n                 <title>Community Installer</title>';
    // head += '\n                 <link rel="stylesheet" type="text/css" href="' + baseAppUrl + '/content/css/main_mdb.min.css" />';
    // head += '\n                 <link rel="stylesheet" type="text/css" href="' + baseAppUrl + '/content/css/mdb.min.css" />';
    head += '\n                 <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Roboto" />';
    head += '\n                 <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" />';
    head += '\n                 <script src="https://use.fontawesome.com/a81eef09c0.js" async></script>';
    head += '\n                 <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous" async></script>';
    head += '\n                 <script src="https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js" async></script>';
    head += '\n                 <script src="https://static.firebase.com/v0/firebase.js" async></script>';
    head += '\n                 <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js" async></script>';
    // head += '\n                 <link rel="stylesheet" type="text/css" href="' + baseAppUrl + '/content/css/main_web.min.css" />';
    head += '\n                 <!-- Global site tag (gtag.js) - Google Analytics --> <script async src="https://www.googletagmanager.com/gtag/js?id=UA-113463133-1"></script><script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag("js", new Date()); gtag("config", "UA-113463133-1");</script>';
    $('head').append(head);

    let html = '';
    html += '\n       <header>';
    html += '\n           <nav class="navbar navbar-fixed-top navbar-dark ">';
    html += '\n               <div class="d-flex w-100 justify-content-between align-items-center mx-auto" style="max-width: 725px;">';
    html += '\n                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                       <a class="nav-link white-text p-0" href="' + homeUrl + '" style="font-size: 30px;"><i id="homeBtn" class="fa fa-home"></i><span class="sr-only">(current)</span></a>';
    html += '\n                   </div>';
    html += '\n                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                       <a class="navbar-brand"><span class="align-middle"><img src="' + baseAppUrl + '/content/images/app_logo.png" height="40" class="d-inline-block align-middle" alt=""> Installer</span></a>';
    html += '\n                   </div>';
    html += '\n                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                       <a id="showSearchBtn" class="nav-link white-text p-0" style="font-size: 30px;"><i class="fa fa-search"></i><span class="sr-only">(current)</span></a>';
    html += '\n                   </div>';
    html += '\n               </div>';
    html += '\n           </nav>';
    html += '\n       </header>';
    html += '\n       <main class="mt-3">';
    html += '\n           <div id="mainDiv" class="container-fluid" style="min-width: 380px; max-width: 750px; height: auto; min-height: 100%;">';
    html += '\n               <section class="px-3">';
    html += '\n                   <div class="w-100 text-center">';
    html += '\n                       <h5 id="sectTitle" class="h5-responsive" style="font-weight: 400;">Software Installer</h5>';
    html += '\n                       <div id="loaderDiv" class="flex-row fadeIn fadeOut">';
    html += '\n                           <div class="d-flex flex-column justify-content-center align-items-center" style="height: 200px;">';
    html += '\n                               <svg id="loader" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" class="lds-double-ring">';
    html += '\n                                   <circle cx="50" cy="50" ng-attr-r="{{config.radius}}" ng-attr-stroke-width="{{config.width}}" ng-attr-stroke="{{config.c1}}" ng-attr-stroke-dasharray="{{config.dasharray}}" fill="none" stroke-linecap="round" r="40" stroke-width="7" stroke="#18B9FF" stroke-dasharray="62.83185307179586 62.83185307179586" transform="rotate(139.357 50 50)">';
    html += '\n                                       <animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="1.8s" begin="0s" repeatCount="indefinite"></animateTransform>';
    html += '\n                                   </circle>';
    html +=
        '\n                                   <circle cx="50" cy="50" ng-attr-r="{{config.radius2}}" ng-attr-stroke-width="{{config.width}}" ng-attr-stroke="{{config.c2}}" ng-attr-stroke-dasharray="{{config.dasharray2}}" ng-attr-stroke-dashoffset="{{config.dashoffset2}}" fill="none" stroke-linecap="round" r="32" stroke-width="7" stroke="#FF7F27" stroke-dasharray="50.26548245743669 50.26548245743669" stroke-dashoffset="50.26548245743669" transform="rotate(-139.357 50 50)">';
    html += '\n                                       <animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;-360 50 50" keyTimes="0;1" dur="1.8s" begin="0s" repeatCount="indefinite"></animateTransform>';
    html += '\n                                   </circle>';
    html += '\n                                   <text id="loaderText1" fill="gray" stroke-width="0" x="50%" y="50%" text-anchor="middle" class="loaderText">Please</text>';
    html += '\n                                   <text id="loaderText2" fill="gray" stroke-width="0" x="50%" y="60%" text-anchor="middle" class="loaderText">Wait</text>';
    html += '\n                               </svg>';
    html += '\n                           </div>';
    html += '\n                       </div>';
    html += '\n                       <div id="listContDiv" class="row fadeIn fadeOut" style="display: none;"></div>';
    html += '\n                       <div id="appViewDiv" class="row fadeIn fadeOut" style="display: none;"></div>';

    html += '\n                       <div id="actResultsDiv" class="row fadeIn fadeOut mb-5" style="display: none;">';
    html += '\n                           <div class="listDiv">';
    html += '\n                               <div id="resultList">';
    html += '\n                                   <div class="card card-body card-outline" style="background-color: transparent; line-height:1.0;">';

    html += '\n                                       <div class="row">';
    html += '\n                                           <div class="d-flex w-100 flex-column mb-3">';
    html += '\n                                               <i id="finishedImg" class="fa fa-check" style="display: none;"></i>';
    html += '\n                                               <div id="results"></div>';

    html += '\n                                               <div class="d-flex flex-column justify-content-center mx-2">';
    html += '\n                                                   <div class="d-flex flex-column align-items-center" style="border: 1px solid gray; border-radius: 10px;">';

    html += '\n                                                       <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                                                           <h6 id="ideResultsTitle" class="mt-2 mb-0" style="display: none;"><u>IDE Authentication</u></h6>';
    html += '\n                                                           <ul id="ideResultUl" class="w-100 px-4" style="display: none;"></ul>';
    html += '\n                                                       </div>';

    html += '\n                                                       <div class="d-flex w-100 flex-column justify-content-center align-items-center">';
    html += '\n                                                           <h6 id="repoResultsTitle" class="mt-2 mb-0" style="display: none;"><u>GitHub Integration</u></h6>';
    html += '\n                                                           <ul id="repoResultUl" class="w-100 px-3" style="display: none;"></ul>';
    html += '\n                                                       </div>';

    html += '\n                                                       <div class="d-flex w-100 flex-column justify-content-center align-items-center">';
    html += '\n                                                           <h6 id="appResultsTitle" class="mt-2 mb-0" style="display: none;"><u>SmartApps</u></h6>';
    html += '\n                                                           <ul id="appResultUl" class="w-100 px-3" style="display: none;"></ul>';
    html += '\n                                                       </div>';

    html += '\n                                                       <div class="d-flex w-100 flex-column justify-content-center align-items-center">';
    html += '\n                                                           <h6 id="devResultsTitle" class="mt-2 mb-0" style="display: none;"><u>Devices</u></h6>';
    html += '\n                                                           <ul id="devResultUl" class="w-100 px-3" style="display: none;"></ul>';
    html += '\n                                                       </div>';

    html += '\n                                                   </div>';
    html += '\n                                               </div>';

    html += '\n                                               <div id="resultsDone" class="mt-4" style="display: none;"><small>Press Back/Done Now</small></div>';
    html += '\n                                               <div id="resultsDoneHomeBtnDiv" style="display: none;"><button id="resultsDoneHomeBtn" type="button" class="btn" style="border-radius: 20px;"><a class="button" href="' + homeUrl + '"><i id="homeBtn" class="fa fa-home"></i> Go Home<span class="sr-only">(current)</span></a></button></div>';
    html += '\n                                          </div>';

    html += '\n                                     </div>';
    html += '\n                                 </div>';
    html += '\n                            </div>';
    html += '\n                       </div>';
    html += '\n               </section>';

    html += '\n           </div>';
    html += '\n       </main>';
    html += '\n       <footer id="ftrSect" class="page-footer center-on-small-only m-0 p-0">';
    html += '\n           <div class="footer-copyright">';
    html += '\n               <div class="containter-fluid">';
    html += '\n                   <button class="btn btn-sm btn-outline-primary" data-toggle="modal" data-target="#aboutModal" style="background: transparent; border-color: white;"><span class="white-text"><i class="fa fa-info"></i> About</span></button>';
    html += '\n               </div>';
    html += '\n           </div>';
    html += '\n       </footer>';
    html += '\n       <!-- Modal -->';
    html += '\n       <div class="modal fade-in" id="aboutModal" tabindex="-1" role="dialog" aria-labelledby="aboutModalLabel" aria-hidden="true">';
    html += '\n           <div class="modal-dialog modal-dialog-centered" role="document">';
    html += '\n               <div class="modal-content darkModalBg">';
    html += '\n                   <!--  Modal BODY -->';
    html += '\n                   <div class="modal-body py-2">';
    html += '\n                       <div class="card card-body pt-3" style="background-color: transparent;">';
    html += '\n                           <div class="flex-row align-center">';
    html += '\n                               <div class="d-flex flex-row justify-content-center">';
    html += '\n                                   <h3 class="modal-title align-self-center" id="exampleModalLongTitle">Community Installer</h3>';
    html += '\n                               </div>';
    html += '\n                               <div class="flex-row justify-content-center mb-3">';
    html += '\n                                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                                       <small><u>Author:</u></small>';
    html += '\n                                       <small>Anthony Santilli (@tonesto7)</small>';
    html += '\n                                   </div>';
    html += '\n                                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                                       <small><u>Co-Author:</u></small>';
    html += '\n                                       <small>Corey Lista (@coreylista)</small>';
    html += '\n                                   </div>';
    html += '\n                               </div>';
    html += '\n                               <div class="flex-row justify-content-center">';
    html += '\n                                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                                       <small><u>SmartApp Version:</u></small>';
    html += '\n                                       <small>v' + appVersion + '</small>';
    html += '\n                                   </div>';
    html += '\n                                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                                       <small><u>WebApp Version:</u></small>';
    html += '\n                                       <small>v' + scriptVersion + '</small>';
    html += '\n                                   </div>';
    html += '\n                               </div>';
    html += '\n                           </div>';
    html += '\n                       </div>';
    html += '\n                   </div>';
    html += '\n                   <div class="modal-body py-2">';
    html += '\n                       <div class="card card-body pt-3" style="background-color: transparent;">';
    html += '\n                           <div class="flex-row align-center">';
    html += '\n                               <div class="d-flex flex-row justify-content-center">';
    html += '\n                                   <div class="d-flex flex-column justify-content-center align-items-center text-center">';
    html += '\n                                       <h5><u>Notice</u></h5>';
    html += '\n                                       <small><strong>Use this product at your own risk!</strong></small>';
    html += '\n                                       <small>We are NOT responsible for any SmartApps and/or Devices displayed in this App.  They will always be the responsibility of the individual developer</small>';
    html += '\n                                       <small>We are NOT responsible for any damages obtained to yourself or your belonging while using this application</small>';
    html += '\n                                       <small>Now Please Enjoy It!!!</small>';
    html += '\n                                   </div>';
    html += '\n                               </div>';
    html += '\n                           </div>';
    html += '\n                       </div>';
    html += '\n                   </div>';
    html += '\n                   <!--  Modal FOOTER -->';
    html += '\n                   <div class="modal-body py-2">';
    html += '\n                       <div class="card card-body pt-3" style="background-color: transparent;">';
    html += '\n                           <div class="flex-row align-center">';
    html += '\n                               <div class="d-flex flex-row justify-content-center">';
    html += '\n                                   <div class="d-flex flex-column justify-content-center align-items-center">';
    html += '\n                                       <h6>Want to make a Donation?</h6>';
    html +=
        '\n                                       <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top"><input type="hidden" name="cmd" value="_s-xclick"><input type="hidden" name="hosted_button_id" value="VPPATVAXQLTNC"><input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!"></form>';
    html += '\n                                       <small><u>Privacy</u></small>';
    html += '\n                                       <a class="blue-text" href="https://community-installer-34dac.firebaseapp.com/privacypolicy.html"><small>Privacy Policy</small></a>';
    html += '\n                                       <br>';
    html += '\n                                       <small style="font-size: 10px;">Copyright \u00A9 2018 Anthony Santilli & Corey Lista</small>';
    html += '\n                                   </div>';

    html += '\n                               </div>';
    html += '\n                           </div>';
    html += '\n                           <button type="button" class="btn btn-sm btn-secondary mx-5 my-4" data-dismiss="modal">Close</button>';
    html += '\n                       </div>';
    html += '\n                   </div>';
    html += '\n               </div>';
    html += '\n           </div>';
    html += '\n       </div>';
    $('body').css({ 'overflow-x': 'hidden' });
    $('#bodyDiv').html(html);
}

$.ajaxSetup({
    cache: true
});

function loadScripts() {
    $.getScript('https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js');
    $.getScript('https://cdnjs.cloudflare.com/ajax/libs/mdbootstrap/4.4.5/js/mdb.min.js');
}

document.addEventListener('DOMContentLoaded', function() {
    buildCoreHtml();
    loadScripts();
    loaderFunc();
});