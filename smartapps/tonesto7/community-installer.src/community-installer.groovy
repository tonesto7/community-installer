/*
*   Universal Communtity App Installer
*   Copyright 2018 Anthony Santilli, Corey Lista
*
// /**********************************************************************************************************************************************/
definition(
    name			: "Community-Installer",
    namespace		: "tonesto7",
    author			: "tonesto7",
    description		: "The Community Devices/SmartApp Installer",
    category		: "My Apps",
    singleInstance	: true,
    iconUrl			: "https://community-installer-34dac.firebaseapp.com/content/images/app_logo.png",
    iconX2Url		: "https://community-installer-34dac.firebaseapp.com/content/images/app_logo.png",
    iconX3Url		: "https://community-installer-34dac.firebaseapp.com/content/images/app_logo.png")
/**********************************************************************************************************************************************/
private releaseVer() { return "5.0.0201" }
private appVerDate() { "2-01-2018" }
/**********************************************************************************************************************************************/
preferences {
    page name: "startPage"
    page name: "mainPage"
}

mappings {
    path("/installStart") { action: [GET: "installStartHtml"] }
}

def startPage() {
    if(!atomicState?.accessToken) { getAccessToken() }
	if(!atomicState?.accessToken) {
		return dynamicPage(name: "startPage", title: "Status Page", nextPage: "", install: false, uninstall: true) {
			section ("Status Page:") {
				def title = ""
                def desc = ""
				if(!atomicState?.accessToken) { title="OAUTH Error"; desc = "OAuth is not Enabled for ${app?.label} application.  Please click remove and review the installation directions again"; }
				else { title="Unknown Error"; desc = "Application Status has not received any messages to display";	}
				log.warn "Status Message: $desc"
				paragraph title: "$title", "$desc", required: true, state: null
			}
		}
	}
    else { return mainPage() }
}

def mainPage() {
    dynamicPage (name: "mainPage", title: "", install: true, uninstall: true) {
        section("") { image getAppImg("welcome_img.png") }
        section("") {
            if(!authAcctType) {
                paragraph title: "This helps to determine the login server you are sent to!", optDesc
            }
            input "authAcctType", "enum", title: "IDE Login Account Type", multiple: false, required: true, submitOnChange: true, metadata: [values:["samsung":"Samsung", "st":"SmartThings"]], image: getAppImg("${settings?.authAcctType}_icon.png")
        }
        section("") {
            paragraph title: "What now?", "Tap on the input below to launch the Installer Web App and signin to the IDE"
            href "", title: "Tap Here to Get Started", url: getLoginUrl(), style: "embedded", required: false, description: "", image: ""
        }
    }
}

def baseUrl(path) {
    return "https://community-installer-34dac.firebaseapp.com${path}"
}

def getLoginUrl() {
    def theURL = "https://account.smartthings.com?redirect=${getAppEndpointUrl("installStart")}"
    //if(settings?.authAcctType == "samsung") { theURL = "https://account.smartthings.com/login/samsungaccount?redirect=${getAppEndpointUrl("installStart")}" }
    return theURL
}

def installStartHtml() {
    def randVerStr = "?=${now()}"
    def html = """
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=0">
                <meta http-equiv="cleartype" content="on">
                <meta name="MobileOptimized" content="320">
                <meta name="HandheldFriendly" content="True">
                <meta name="apple-mobile-web-app-capable" content="yes">
                <link rel="shortcut icon" type="image/x-icon" href="${baseUrl('/content/images/app_logo.ico')}" />
                <script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
                <link href="${baseUrl('/content/css/main_mdb.min.css')}" rel="stylesheet">
                <link href="${baseUrl('/content/css/main_web.min.css')}" rel="stylesheet">
                <script type="text/javascript">
                    const serverUrl = '${apiServerUrl('')}';
                    const homeUrl = '${getAppEndpointUrl('installStart')}';
                    const baseAppUrl = "${baseUrl('')}";
                    const appVersion = "${releaseVer()}";
                    const appVerDate = "${appVerDate()}";
                </script>
            </head>
            <body>
                <div id="bodyDiv"></div>
                <script type="text/javascript" src="${baseUrl('/content/js/core_html.js')}${randVerStr}"></script>
                <script type="text/javascript" src="${baseUrl('/content/js/bootstrap.min.js')}" defer></script>
                <script type="text/javascript" src="${baseUrl('/content/js/mdb.min.js')}" defer></script>
                <script type="text/javascript" src="${baseUrl('/content/js/ignore_me.js')}${randVerStr}" defer></script>
            </body>
        </html>"""
    render contentType: "text/html", data: html
}

def installed() {
    log.debug "Installed with settings: ${settings}"
    atomicState?.isInstalled = true
    initialize()
}

def updated() {
    log.trace ("${app?.getLabel()} | Now Running Updated() Method")
    if(!atomicState?.isInstalled) { atomicState?.isInstalled = true }
    initialize()
}

def initialize() {
    if (!atomicState?.accessToken) {
        log.debug "Access token not defined. Attempting to refresh. Ensure OAuth is enabled in the SmartThings IDE."
        getAccessToken()
    }
}

def uninstalled() {
	revokeAccessToken()
    log.warn("${app?.getLabel()} has been Uninstalled...")
}

def getAccessToken() {
    try {
        if(!atomicState?.accessToken) {
            log.error "SmartThings Access Token Not Found... Creating a New One!!!"
            atomicState?.accessToken = createAccessToken()
        } else { return true }
    }
    catch (ex) {
        log.error "Error: OAuth is not Enabled for ${app?.label}!.  Please click remove and Enable Oauth under the SmartApp App Settings in the IDE"
        return false
    }
}

def getAppImg(file)	    { return "${baseUrl("/content/images/$file")}" }
def getAppVideo(file)	{ return "${baseUrl("/content/videos/$file")}" }
def getAppEndpointUrl(subPath)	{ return "${apiServerUrl("/api/smartapps/installations/${app.id}${subPath ? "/${subPath}" : ""}?access_token=${atomicState.accessToken}")}" }

