'use esversion: 6';

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
    //currentManifest = appData;
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
            let appInstalled = false;
            let updAvail = false;
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

            html += '\n                   <tr>';
            html += '\n                      <td class="align-middle py-0" style="border: 1px solid grey">';
            html += '\n                         <div class="d-flex flex-column ml-2">';
            html += '\n                             <div class="d-flex flex-column justify-content-start my-1 form-check' + disabled + '">';
            html += '\n                                 <div class="flex-column justify-content-start">';
            html += '\n                                     <div class="d-flex flex-row">';
            html += '\n                                          <input class="form-check-input align-middle" type="checkbox" value="" id="smartapp' + cnt + '"' + checked + disabled + '>';
            html += '\n                                          <label class="form-check-label align-middle" for="smartapp' + cnt + '"><small class="align-middle">' + items[item].name + '</small></label>';
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
                        Command: toastr['warning']('Sorry but this app is only for Demo purposes in order for devs to test out there templates', 'UH OH!');
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
    scrollToTop();
    updSectTitle('App Details', true);
    buildAppList();
    toastr.options = {
        closeButton: false,
        debug: false,
        newestOnTop: false,
        progressBar: false,
        positionClass: 'toast-top-full-width',
        preventDuplicates: true,
        onclick: null,
        showDuration: '300',
        hideDuration: '1000',
        timeOut: '5000',
        extendedTimeOut: '1000',
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut'
    };
}

document.addEventListener('DOMContentLoaded', function() {
    loaderFunc();
});
