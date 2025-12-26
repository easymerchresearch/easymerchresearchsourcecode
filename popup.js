! function() {
    const e = document.createElement("div");
    e.className = "conatainer";
    const t = document.createElement("div");
    t.className = "logo";
    const n = document.createElement("img");
    n.src = "assets/images/navbar_logo.png", n.alt = "Easy-Merch-Research.co", t.appendChild(n), e.appendChild(t);
    const c = document.createElement("div");
    c.className = "item-container-column", c.id = "buttonsTop", c.style.display = "none";
    const o = document.createElement("button");
    o.id = "openMyDesigns", o.textContent = "My Designs";
    const s = document.createElement("button");
    s.id = "visit", s.textContent = "Visit Website", c.appendChild(o), c.appendChild(s), e.appendChild(c), e.appendChild(document.createElement("br"));
    const a = document.createElement("form");
    a.id = "keyForm", a.style.display = "none";
    const d = document.createElement("label");
    d.setAttribute("for", "ls"), d.textContent = "Enter your license key";
    const r = document.createElement("input");
    r.type = "text", r.id = "ls", r.name = "ls", r.required = !0;
    const i = document.createElement("div");
    i.id = "status", i.textContent = "Checking license...";
    const l = document.createElement("button");
    l.type = "submit", l.textContent = "Save License";
    const m = document.createElement("br"),
        h = document.createElement("span");
    h.className = "instruction", h.innerHTML = '<b>Only $12/year, Ends Soon!</b> \n<a href="https://easymerchresearch.gumroad.com/l/EasyMerchResearch" target="_blank" style="color: #666;">Visit our website (www.gumroad.com).</a> \nChoose the yearly plan for the best deal!.', a.appendChild(d), a.appendChild(r), a.appendChild(i), a.appendChild(l), a.appendChild(m), a.appendChild(h), e.appendChild(a);
    const u = document.createElement("div");
    u.className = "item-container-row settings", u.style.display = "none";
    const p = document.createElement("h3");

    function y(e, t, n = !0) {
        const c = document.createElement("div");
        c.className = "switch-container";
        const o = document.createElement("label");
        o.className = "switch", o.setAttribute("for", e);
        const s = document.createElement("input");
        s.type = "checkbox", s.id = e, s.checked = n;
        const a = document.createElement("span");
        a.className = "slider round", o.appendChild(s), o.appendChild(a);
        const d = document.createElement("label");
        return d.setAttribute("for", e), d.textContent = t, c.appendChild(o), c.appendChild(d), c
    }
    p.textContent = "Settings", u.appendChild(p), u.appendChild(y("toggleButton", "OFF/ON")), u.appendChild(y("hidePolitics", "Total Products")), u.appendChild(y("storeData", "Product Details")), u.appendChild(y("beforeData", "Product Details Placement")), u.appendChild(y("fastData", "Slow/Fast Mode")), e.appendChild(u);
    document.body.appendChild(e)
}(), document.getElementById("openMyDesigns").addEventListener("click", () => {
    s("designs.html", 0)
}), document.getElementById("visit").addEventListener("click", () => {
    s("http://www.easymerchresearch.com/", 1)
});
const e = document.querySelector(".item-container-row.settings"),
    n = document.querySelector("#buttonsTop"),
    c = document.querySelector("#keyForm");

function o(o) {
    o ? (e.style.display = "flex",  n.style.display = "flex", c.style.display = "none") : (e.style.display = "none", n.style.display = "none", c.style.display = "flex")
}
async function s(e, t) {
    if (0 === t) chrome.tabs.create({
        url: chrome.runtime.getURL(e)
    });
    else if (1 === t) try {
        await fetch(e, {
            method: "HEAD",
            mode: "no-cors"
        }), chrome.tabs.create({
            url: e
        })
    } catch {
        const e = "https://easy-merch-research.blogspot.com/";
        chrome.tabs.create({
            url: e
        })
    }
}
async function a(e) {
    try {
        {
            const t = chrome.runtime.connect({
                name: "UI"
            });
            t.postMessage({
                action: "saveUI",
                data: e
            });
            const n = setTimeout(() => {
                console.warn("Port disconnected due to timeout."), t.disconnect()
            }, 3e4);
            t.onMessage.addListener(e => {
                clearTimeout(n), "success" === e.status ? console.log("UI settings saved successfully") : console.error("Data storage failed", e.message), t.disconnect()
            }), t.onDisconnect.addListener(() => {
                chrome.runtime.lastError ? console.error("Disconnected due to an error:", chrome.runtime.lastError.message) : console.log("Port disconnected successfully.")
            })
        }
    } catch (e) {
        console.error("Error in saveUiSettings function:", e)
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    const e = document.getElementById("status");
    try {
        const {
            active: t,
            message: n
        } = await new Promise((e, t) => {
            try {
                chrome.runtime.sendMessage({
                    action: "gls"
                }, n => chrome.runtime.lastError ? t(new Error(chrome.runtime.lastError.message)) : n ? void e({
                    active: n.active || !1,
                    message: n.message || ""
                }) : e({
                    active: !1,
                    message: "No response from background"
                }))
            } catch (e) {
                t(e)
            }
        });
        t ? (e.textContent = n || "Error!", o(!0)) : (e.textContent = n || "Error!", o(!1))
    } catch (t) {
        e.textContent = "Error!", o(!1)
    }
}), c.addEventListener("submit", async e => {
    e.preventDefault();
    const t = document.getElementById("status"),
        n = document.getElementById("ls").value.trim();
    if (n) {
        t.textContent = "Validating......";
        try {
            const {
                active: e,
                message: c
            } = await
            function(e) {
                return new Promise((t, n) => {
                    try {
                        chrome.runtime.sendMessage({
                            action: "sls",
                            key: e
                        }, e => chrome.runtime.lastError ? n(new Error(chrome.runtime.lastError.message)) : e ? void t({
                            active: e.active || !1,
                            message: e.message || ""
                        }) : t({
                            active: !1,
                            message: "No response from background"
                        }))
                    } catch (e) {
                        n(e)
                    }
                })
            }(n);
            e ? (t.textContent = c || "", o(!0)) : (t.textContent = c || "Error!", o(!1))
        } catch (e) {
            t.textContent = "Error!", o(!1)
        }
    }
}), document.addEventListener("DOMContentLoaded", async () => {
    const e = await async function() {
        try {
            return new Promise((e, t) => {
                const n = chrome.runtime.connect({
                    name: "UI"
                });
                n.postMessage({
                    action: "getUI"
                }), n.onMessage.addListener(t => {
                    "success" === t.status && t.message ? e(t.message) : e(null), n.disconnect()
                }), n.onDisconnect.addListener(() => {
                    chrome.runtime.lastError ? (console.error("Disconnected due to an error:", chrome.runtime.lastError.message), t(new Error("Disconnected due to an error"))) : console.log("Port disconnected successfully.")
                })
            })
        } catch (e) {
            return console.error("Retrieving data failed!", e), null
        }
    }(), t = !!e && e.isEnabled, n = !!e && e.showCompetition, c = !!e && e.showProductinfo, o = !!e && e.showBefore, s = !!e && e.fastMode, r = document.getElementById("toggleButton"), i = document.getElementById("hidePolitics"), l = document.getElementById("storeData"), m = document.getElementById("beforeData"), h = document.getElementById("fastData");
    r.checked = t, i.checked = n, l.checked = c, m.checked = o, h.checked = s, m.addEventListener("click", () => {
        m.checked = !!m.checked, a(new d(r.checked, l.checked, i.checked, m.checked, h.checked))
    }), h.addEventListener("click", () => {
        h.checked = !!h.checked, a(new d(r.checked, l.checked, i.checked, m.checked, h.checked))
    }), r.addEventListener("click", () => {
        r.checked = !!r.checked, a(new d(r.checked, l.checked, i.checked, m.checked, h.checked))
    }), i.addEventListener("click", () => {
        i.checked = !!i.checked, a(new d(r.checked, l.checked, i.checked, m.checked, h.checked))
    }), l.addEventListener("click", () => {
        l.checked = !!l.checked, a(new d(r.checked, l.checked, i.checked, m.checked, h.checked))
    })
});
class d {
    constructor(e, t, n, c, o) {
        this.isEnabled = e, this.showProductinfo = t, this.showCompetition = n, this.showBefore = c, this.fastMode = o, this.asin = "state"
    }
}