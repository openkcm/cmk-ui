/**
 * SM (Session Manager) Error Redirect Handler
 *
 * When SM encounters an authentication error, it redirects to the error_uri
 * with errorCode/errorDescription appended as additional query parameters.
 *
 * The error_uri is built without a hash fragment to avoid SM breaking the URL.
 * It includes the tenantId as a query parameter:
 *   error_uri = https://host/index.html?tenant=chbu-5-st
 *
 * SM then redirects to:
 *   https://host/index.html?tenant=chbu-5-st&errorCode=invalid_request&errorDescription=...
 *
 * This script runs before UI5 bootstraps and converts the URL to the correct
 * hash-based route that the UI5 router understands:
 *   https://host/index.html#/chbu-5-st/login?errorCode=invalid_request&errorDescription=...
 */
(function () {
    var search = window.location.search;

    if (search && search.indexOf('errorCode=') !== -1) {
        var params = new URLSearchParams(search);
        var errorCode = params.get('errorCode') || '';
        var errorDescription = params.get('errorDescription') || '';
        var tenantId = params.get('tenant') || '';

        if (tenantId && errorCode) {
            // Build the correct hash-based URL for the login route with error params
            var newHash = '#/' + encodeURIComponent(tenantId) + '/login?errorCode=' + encodeURIComponent(errorCode);
            if (errorDescription) {
                newHash += '&errorDescription=' + encodeURIComponent(errorDescription);
            }
            // Redirect to the correct hash-based URL (without search params)
            var newUrl = window.location.origin + window.location.pathname + newHash;
            window.location.replace(newUrl);
            return; // Stop further execution; page will reload with correct URL
        }
    }
})();

window.KmsSplash = {
    showError: function (t, d) {
        var e = document.getElementById("kms-splash-screen");
        if (!e) return;
        e.classList.add("splash-error");
        var ti = e.querySelector(".splash-title");
        var de = e.querySelector(".splash-description");
        if (ti) ti.textContent = t || "Error";
        if (de) de.textContent = d || "";
    },
    hide: function () {
        var e = document.getElementById("kms-splash-screen");
        if (!e) return;
        e.classList.add("fade-out");
        var c = document.getElementById("container");
        if (c) c.removeAttribute("data-loading");
        setTimeout(function () {
            if (e.parentNode) e.parentNode.removeChild(e);
        }, 300);
    },
    show: function () {
        var e = document.getElementById("kms-splash-screen");
        if (e) {
            e.classList.remove("fade-out", "splash-error");
            e.style.display = "";
        }
    }
};