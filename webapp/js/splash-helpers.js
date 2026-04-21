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