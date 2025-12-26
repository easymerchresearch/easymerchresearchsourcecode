(function() {

    'use strict';
    let myChart, userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.119 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; AS; rv:11.0) like Gecko", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/12.246", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36", "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36", "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko"],
        domainUrl = null,
        fetchedAsins = [],
        productsToBeStored = [],
        bannedkeywords = null,
        showBefore = null,
        showStats = null,
        fastMode = null,
        loadingImageSrc = null,
        navImageSrc = null,
        tableContainer = null,
        containerProducts = null,
        emrSpacer = null,
        resultCheck = null,
        uiSettings = null,
        resultCounter = null,
        metaData = null,
        userAgent = null,
        retrieved = !1,
        deleted = !1,
        products = [],
        searchProducts = [],
        productsToSave = [],
        filteredProducts = [],
        productDetailTemplate = null,
        VISIBLE_ITEMS = 20,
        ordera = "desc",
        cachedMinDate = null, 
        cachedMaxDate = null,
        cachedMinReviews = 0, 
        cachedMaxReviews = 1e9,
        cachedMinSales = 0, 
        cachedMaxSales = 1e9,
        cachedMinBsr = 0, 
        cachedMaxBsr = 1e9,
        cachedMinPrice = 0, 
        cachedMaxPrice = 300,
        cachedFilterTerm = "", 
        currentUrl = null,
        language ='en',
        pageChangedHandled = false,
        feedbacker = null,
        isRunning = !1,
        isPaused = !1,
        reviewsEnabled = null,
        badgeEnabled = null,
        abortController = new AbortController(),
        itemsSize = null, isa = 0, itemIndex = 0,
        // Cached template for reuse
        productItemTemplate = null,
        productHTMLMap = {},
        start = null,
        scrollTimeout,
        isRendering = false,
        isSorting = false,
        isSortingMain = false,
        isFiltering = false,
        pool = [];
        const retryLimit = 10 ,retryDelay = 300,retryMap = new WeakMap(), ROW_HEIGHT = 60, BUFFER = 10, delay = t => new Promise(n => setTimeout(n, t)),getAmazonLanguage = d => {
        try {
          const l = d?.documentElement?.lang || d?.lang || document.documentElement.lang || "en";
          return typeof l === "string" ? l.slice(0, 2).toLowerCase() : 'en';
        } catch {
          return "en";
        }
      }, enable = sel => {
        const e = document.querySelector(sel);
        if (e && getComputedStyle(e).pointerEvents === "none") {
            e.style.pointerEvents = "auto";
            e.style.opacity = "1";
        }
    
    }, disable = sel => {
        const e = document.querySelector(sel);
        if (e && getComputedStyle(e).pointerEvents !== "none") {
            e.style.pointerEvents = "none";
            e.style.opacity = "0.7";
        }
    }, bsrRanges = [
        { label: "BSR: 0-200K", min: 0, max: 2e5, color: "#4caf50" },       // Green
        { label: "BSR: 200K-400K", min: 200001, max: 4e5, color: "#4caf50" },
        { label: "BSR: 400K-600K", min: 400001, max: 6e5, color: "#4caf50" }, 
        { label: "BSR: 600K-800K", min: 600001, max: 8e5, color: "#4caf50" },
        { label: "BSR: 800K-1M", min: 800001, max: 1e6, color: "#4caf50" },   
        { label: "BSR: 1M-2M", min: 1000001, max: 2e6, color: "#9e9e9e" },   
        { label: "BSR: 2M+", min: 2000001, max: 4e7, color: "#9e9e9e" }       // Gray
    ];
    
    function getColorByBSR(bsrValue) {
        if (
          bsrValue === undefined ||
          bsrValue === null ||
          bsrValue === "N/A" ||
          bsrValue === "" ||
          isNaN(Number(bsrValue))
        ) {
          return "color:black"; // Default to black
        }
      
        const numericBSR = Number(bsrValue);
      
        const match = bsrRanges.find(
          range => numericBSR >= range.min && numericBSR <= range.max
        );
      
        return match ? `backgroundColor: ${match.color}` : "color:black";
    }
          
    document.addEventListener("DOMContentLoaded", async () => {
            try {
                if (uiSettings = await getUI(), userAgent = navigator.userAgent, setDomain(), !uiSettings) return;
                retrieved || (await retrieveLoadedProducts(), retrieved = !0)
            } catch (a) {
                console.error("Error during DOMContentLoaded:", a)
            }
        }), window.addEventListener("load", async () => {
            try {
                await waitForElement("[data-component-type=\"s-search-results\"]"), uiSettings?.isEnabled && enableFeature()
            } catch (a) {
                console.warn("Search results container not found in time. Skipping Creating UI", a.message)
            }
    });
        
    function waitForElement(a, b = 6e4) {
            return new Promise((c, d) => {
                const e = document.querySelector(a);
                if (e) return c(e);
                const f = new MutationObserver(() => {
                    const b = document.querySelector(a);
                    b && (f.disconnect(), c(b))
                });
                f.observe(document.body, {
                    childList: !0,
                    subtree: !0
                }), setTimeout(() => {
                    f.disconnect(), d(new Error(`Timeout: Element "${a}" not found`))
                }, b)
            })
    }
    
    function tryCreateUIfor(node, asin) {
      const childReady = node.querySelector("[data-cy='image-container']");
      if (childReady) {
        createUIfor(asin, currentUrl, abortController.signal);
        retryMap.delete(node);
      } else {
        let retries = retryMap.get(node) || 0;
        if (retries < retryLimit) {
          retryMap.set(node, retries + 1);
          setTimeout(() => tryCreateUIfor(node, asin), retryDelay);
        } else {
          retryMap.delete(node); // stop retrying after limit
          console.warn(`Child element not found for ASIN ${asin} after ${retryLimit} retries.`);
        }
      }
    }   
    
    async function enableFeature() {
        if (!(await errorCheck())) return;
        let t = uiSettings.showCompetition,
            n = uiSettings.showBefore,
            a = uiSettings.showProductinfo;
        showBefore = n, showStats = a, resultCheck = t, fastMode = uiSettings.fastMode, currentUrl = location.href;
        language = getAmazonLanguage();
        metaData = await getPageMetadata(null,0) || null;
        const i = document.querySelector(".s-main-slot"),
        l = new MutationObserver(mutations => {
            
            (async () => {
                let urlChanged = await checkCurrentUrl();
                if (urlChanged) {
                    abortController.abort();
                    abortController = new AbortController();
                    pageChangedHandled = false;
                }
    
                for (const mutation of mutations) {
                    if (mutation.type === "childList") {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                node.hasAttribute("data-asin")) {
                                const asin = node.getAttribute("data-asin");
                                if (asin && asin.length > 4 && a) {
                                    tryCreateUIfor(node, asin);
                                }
                            }
                        });
                    }
                }
            })(); // immediately invoked async function
        });
        i && l.observe(i, { childList: true, subtree: true })
        , a && createUI(currentUrl, abortController.signal), t && createNavUI(), document.querySelector(".s-main-slot")?.addEventListener("click", function(t) {
            const n = t.target.closest(".emr-download");
            if (n) {
                const t = n.getAttribute("emr-data-src");
                t && openPopup(t)
            }
        })
    }
    
    async function checkCurrentUrl() {
        const urlNow = new URL(location.href);
        if (urlNow.href === currentUrl) return false;
        currentUrl = urlNow.href;
        requestIdleCallback(() => checkCompetition(urlNow));
        resetStats();
        pageChangedHandled = true;
        return true;
    }
    
    function resetStats(){
        try {
            productHTMLMap = {};
            itemsSize = null;
            itemIndex = 0;
            isa = 0;
            disable(".emr.emr-item-container-row #emr-filter-dropdownMenu .emr-sorts-container");
            disable("#emr-filrerButton .emr-sorts-container");
            disable(".emr.emr-item-container-row #emr-menuButton"); 
        } catch (error) {
            console.error(error)
        }
    }
    
    
    async function createUI(currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
        try {
            await createProductDetail(currentUrl, signal)
        } catch (t) {
            console.error("Error UI Creation : ", t)
        }
    }
    
    function getProductDetailTemplate() {
        if (!productDetailTemplate) {
            const d = document.createElement("div");
            d.classList.add("emr_details_container");
            d.innerHTML = `
                <input type="checkbox" class="emr-item_selected">
                <p>Date:<b class="emr-date"><img src='${loadingImageSrc}'/></b></p>
                <p>Rank(BSR):<b class="emr-bsr"><img src='${loadingImageSrc}'/></b></p>
                <p>Asin:<b class="emr-asin"><img src='${loadingImageSrc}'/></b></p>
                <p>Design: <b class="emr-download"><img src='${loadingImageSrc}'/></b></p>
            `;
            productDetailTemplate = d;
        }
        return productDetailTemplate;
    }
    
    async function createUIfor(t, currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
        const el = document.querySelector(`.s-result-item.s-asin[data-asin="${t}"]`);
        if (!el || el.querySelector(".emr_details_container")) return;
    
        loadingImageSrc ||= await getImage("loading.gif");
        productDetailTemplate ||= getProductDetailTemplate();
    
        const container = el.querySelector("[data-cy='image-container']");
        if (!container?.parentElement) return;
    
        container.parentElement.insertBefore(productDetailTemplate.cloneNode(true), showBefore ? container.nextSibling : container);
    
        for (const p of searchProducts) {
            if (p.asin === t) {
                const d = el.querySelector(".emr_details_container");
                if (t.length > 4) {
                    d.querySelector(".emr-date").textContent = formatShortDate(p.date);
                    d.querySelector(".emr-bsr").textContent = cleanBsr(p.bsr);
                    d.querySelector(".emr-asin").textContent = p.asin;
                    d.querySelector(".emr-download").textContent = "Download";
                    d.querySelector(".emr-download").setAttribute("emr-data-src", p.img);
                    itemIndex++
                    return;
                }
            }
            await delay(10); // let UI update
        }
    
        getProductDataFor(t, currentUrl, signal);
    }
    
    async function createProductDetail(currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
        
        const items = document.querySelectorAll(".s-result-item.s-asin [data-cy='image-container']");
        if (!items.length) return;
    
        loadingImageSrc ||= await getImage("loading.gif");
        productDetailTemplate ||= getProductDetailTemplate();
    
        const fragmentMap = new Map();
    
        items.forEach(el => {
            const parent = el.parentElement;
            if (!parent) return;
    
            let frag = fragmentMap.get(parent);
            if (!frag) {
                frag = document.createDocumentFragment();
                fragmentMap.set(parent, frag);
            }
    
            frag.appendChild(productDetailTemplate.cloneNode(true));
        });
    
        // Insert fragments into DOM in one go per parent
        fragmentMap.forEach((frag, parent) => {
            if (showBefore) {
                parent.insertBefore(frag, parent.querySelector("[data-cy='image-container']").nextSibling);
            } else {
                parent.insertBefore(frag, parent.querySelector("[data-cy='image-container']"));
            }
        });
    
        setTimeout(() => getProductData(currentUrl, signal), resultCheck ? 1000 : 100);
    }
    
    
    async function createNavUI() {
        const $ = s => document.querySelector(s),
              root = $('[data-component-type="s-search-results"]')?.parentElement;
        if (!root) return;
      
        const frag = document.createDocumentFragment(),
              sortList = `
          <ul>
            <li class="emr-best-sellers-sort">Best Sellers <i class="emr fa ri-expand-up-down-fill"></i></li>
            <li class="emr-bsr-sort">BSR <i class="emr fa ri-expand-up-down-fill"></i></li>
            <li class="emr-date-sort">Date <i class="emr fa ri-expand-up-down-fill"></i></li>
            <li class="emr-price-sort">Price <i class="emr ri-expand-up-down-fill"></i></li>
            <li class="emr-ads-sort">Ads <i class="emr fa ri-expand-up-down-fill"></i></li>
          </ul>`;
      
        loadingImageSrc ||= await getImage("loading.gif");
        navImageSrc ||= await getImage("navbar_logo.png");
      
        const createEl = (t, c) => Object.assign(document.createElement(t), { className: c || "" }),
              createHTML = (t, c, h, a = {}) => { const el = createEl(t, c); el.innerHTML = h; Object.entries(a).forEach(([k, v]) => el.setAttribute(k, v));return el;},
              createBtn = (c, t, fn) => Object.assign(createEl("button", c), { textContent: t, onclick: fn }),
              createImg = (c, s, a) => Object.assign(createEl("img", c), { src: s, alt: a });
      
        const wrapper = createEl("div", "emr emr-item-container-row"),
              navbar = createEl("div", "emr-navbar");
      
        navbar.append(
          createImg("emr-navLogo", navImageSrc, "Nav Logo"),
          createHTML("p", "emr-msg", `Products: <b class="emr-resultProduct"><img src="${loadingImageSrc}" alt="Loading..."/></b>`),
          createBtn("emr-multiloader", "Load More", runLoader),
          createBtn("emr-winner", "Statistics", runWinner),
          createHTML("div", "emr-responsive-dropdown-container", `
            <div class="emr-responsive-menu-button" id="emr-filter-menuButton">
              <span class="emr-labled">Sort-by</span>
              <div class="emr-responsive-menu-icon"> 
                <i class="ri-filter-3-line"></i>
              </div>
            </div>
            <div class="emr-responsive-dropdown emr-glow-border-thin" id="emr-filter-dropdownMenu">
              <div class="emr-sorts emr-stats-details"><div class="emr-sorts-container">${sortList}</div></div>
            </div>`,{id : "emr-navbar-responsive-dropdown-container"}),
          createHTML("div", "emr-sorts emr-stats-details", `<div class="emr-sorts-container" style="border-left: 1px dashed rgba(var(--blueColor), 1);">${sortList}</div>`, { id: "emr-filrerButton" }),
          createHTML("div", "emr-dropdown-container", `
            <div class="emr-menu-button" id="emr-menuButton" style="pointer-events: none;">
              <div class="emr-menu-icon"><i class="fa ri-download-2-line"></i></div>
            </div>
            <div class="emr-dropdown emr-glow-border-thin" id="emr-dropdownMenu">
              <div class="emr-dropdown-header">
                <span id="emrselectAll">Select All</span> | <span id="emrdeselectAll">Deselect All</span>
              </div>
              <div class="emr-dropdown-item" id="emrexASINs">Export ASINs</div>
              <div class="emr-dropdown-item" id="emrcoASINs">Copy ASINs</div>
              <div class="emr-dropdown-item" id="emrexCSV">Export Products As CSV</div>
              <div class="emr-dropdown-item" id="emrexJSON">Export Products As Json</div>
            </div>`));
      
        const statsBox = createEl("div");
        statsBox.id = "emr-statistics";
        wrapper.append(navbar, statsBox);
        frag.appendChild(wrapper);
        root.prepend(frag);
      
        $("#emr-menuButton").onclick = () => {
          const m = $("#emr-dropdownMenu"), v = m.style.display === "block";
          m.style.display = v ? "none" : "block";
          toggleSelectBox(v ? "none" : "block");
        };
      
        $("#emr-dropdownMenu").onclick = e => {
          const a = {
            emrselectAll: () => toggleSelectAll(true),
            emrdeselectAll: () => toggleSelectAll(false),
            emrexASINs: exportSelectedAsinsToFile,
            emrcoASINs: copySelectedAsinsToClipboard,
            emrexCSV: exportSelectedProductsAsCSV,
            emrexJSON: exportSelectedProductsAsJSON
          };
          const fn = a[e.target.id];
          if (fn) fn();
        };
      
        $("#emr-filter-menuButton").onclick = () => {
          const d = $("#emr-filter-dropdownMenu");
          d.style.display = d.style.display === "block" ? "none" : "block";
        };
      
        const bindSort = s => {
          s.style.pointerEvents = "none";
          s.onclick = e => {
            let t = e.target.closest("li");
            if (t) sortProducts(t.textContent.trim().toLowerCase());
          };
        };
      
        bindSort($("#emr-filrerButton .emr-sorts-container"));
        bindSort($("#emr-filter-dropdownMenu .emr-sorts-container"));
      
        requestIdleCallback(() => checkCompetition());
        requestIdleCallback(() => creatStatsBox(loadingImageSrc));
      }
      
    function getSelectedProductObjects() {
        const t = getSelectedAsins();
        return searchProducts.filter(n => t.includes(n.asin))
    }
    
    function toggleSelectAll(t) {
        const n = document.querySelectorAll(".emr_details_container .emr-item_selected");
        n.forEach(n => {
            n.checked = t
        })
    }
    
    function toggleSelectBox(t) {
        const n = document.querySelectorAll(".emr_details_container .emr-item_selected");
        n.forEach(n => {
            n.style.display = t
        })
    }
    
    function getSelectedAsins() {
        return Array.from(document.querySelectorAll(".emr_details_container .emr-item_selected:checked")).map(t => {
            const n = t.closest(".emr_details_container");
            return n?.querySelector(".emr-asin")?.textContent.trim() || ""
        }).filter(Boolean)
    }
    
    function exportSelectedProductsAsCSV() {
        const t = getSelectedProductObjects();
        if (0 === t.length) return alert("No selected products");
        const n = t.map(t => [t.title, t.date, t.asin, t.bsr, t.ahref, t.img, t.price, t.brand, t.competition]),
            r = [
                ["Title", "Date", "ASIN", "BSR", "Link", "Image", "Price", "Brand", "Competition"], ...n
            ].map(t => t.map(t => `"${(t+"").replace(/"/g,"\"\"")}"`).join(",")).join("\n"),
            a = new Blob([r], {
                type: "text/csv"
            }),
            i = document.createElement("a");
        i.href = URL.createObjectURL(a), i.download = "selected_products.csv", document.body.appendChild(i), i.click(), document.body.removeChild(i)
    }
    
    function exportSelectedAsinsToFile() {
        const t = getSelectedAsins();
        if (0 === t.length) return alert("No selected ASINs");
        const n = new Blob([t.join("\n")], {
                type: "text/plain"
            }),
            r = document.createElement("a");
        r.href = URL.createObjectURL(n), r.download = "selected_asins.txt", document.body.appendChild(r), r.click(), document.body.removeChild(r)
    }
    
    function exportSelectedProductsAsJSON() {
        const t = getSelectedProductObjects();
        if (0 === t.length) return alert("No selected products");
        const n = new Blob([JSON.stringify(t, null, 2)], {
                type: "application/json"
            }),
            r = document.createElement("a");
        r.href = URL.createObjectURL(n), r.download = "selected_products.json", document.body.appendChild(r), r.click(), document.body.removeChild(r)
    }
    
    function copySelectedAsinsToClipboard() {
        const t = getSelectedAsins();
        if (0 === t.length) return alert("No selected ASINs");
        const n = t.join(",");
        navigator.clipboard.writeText(n).then(() => {
            const t = document.getElementById("emrcoASINs");
            if (t) {
                const n = t.textContent,
                    r = t.style.color,
                    a = t.style.fontWeight;
                t.textContent = "ASINs Copied!", t.style.color = "green", t.style.fontWeight = "700", setTimeout(() => {
                    t.textContent = n, t.style.color = r, t.style.fontWeight = a
                }, 2e3)
            }
        }).catch(t => console.error("Failed to copy ASINs:", t))
    }
    
    async function getProductDataFor(t, currentUrl, signal) {
        try {
          
          if (signal.aborted || location.href !== currentUrl) return;
          let n = await fetchAndCleanContent(t, 0, currentUrl, signal); 
          // Check again after awaiting fetch, in case abort happened meanwhile
          if (signal.aborted || location.href !== currentUrl) return;
          if (n && n !== "undefined") {
            // Await here if processProductDetails is async
            await processProductDetails(n, t, currentUrl, signal);
          }
          // Optional cleanup
          n = null;
        } catch (error) {
          //console.error(error.name);
        }
    }
      
    
    async function getProductData(currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
        try {
            let t = await colectAsins(currentUrl, signal);
            await delay(100), await productsHTML(t, currentUrl, signal), t= null
        } catch (t) {
            console.error("Error UI Settings Check : ", t)
        }
    }
    async function colectAsins(currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
        const t = new Set;
        return document.querySelectorAll(".s-result-item.s-asin").forEach(n => {
            (n = n.getAttribute("data-asin")) && 4 < n.length && t.add(n)
        }), Array.from(t)
    }
    
    async function productsHTML(asinList, currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
    
        const batchSize = typeof fastMode !== "undefined" && fastMode ? 24 : 5;
    
        for (let i = 0; i < asinList.length; i += batchSize) {
            if (signal.aborted || location.href !== currentUrl) return;
    
            const batch = asinList
                .slice(i, i + batchSize)
                .map(asin => getProductDataFor(asin, currentUrl, signal));
    
            await delay(10); // small pause for UI responsiveness or throttling
            await Promise.all(batch);
        }
    }
    
     
    async function processProductDetails(rawData, asin, currentUrl, signal) {
        if (signal.aborted || location.href !== currentUrl) return;
    
        try {
            
            if (asin.length <= 4) return;
    
            let info = extractProductInfo(rawData, asin, currentUrl, signal);
            if (!info) return;
            await delay(50); // Let DOM/UI catch up
            const elems = document.querySelectorAll(`.s-result-item.s-asin[data-asin="${asin}"]`);
            if (!elems || elems.length === 0) return;
    
            const formattedDate = formatShortDate(info.date),
                  cleanedBsr = cleanBsr(info.bsr),
                  shouldCache = info.asin?.length >= 4 && searchProducts.length < 4800 && !productHTMLMap[info.asin] && showStats;
    
            elems.forEach(el => {
                if (signal.aborted || location.href !== currentUrl) return; // Early abort during loop
    
                const box = el.querySelector(".emr_details_container");
                if (!box) return;
    
                const d = box.querySelector(".emr-date"),
                      b = box.querySelector(".emr-bsr"),
                      a = box.querySelector(".emr-asin"),
                      dl = box.querySelector(".emr-download");
    
                d && (d.textContent = formattedDate);
                a && (a.textContent = info.asin);
                if (b) {
                    b.textContent = cleanedBsr;
                    b.style.background = cleanedBsr.includes("N/A") ? "#6a9cc7" : "";
                }
                if (dl) {
                    dl.textContent = "Download";
                    dl.setAttribute("emr-data-src", info.img);
                }
    
                if (shouldCache) {
                    productHTMLMap[info.asin] = { ...info, html: el.outerHTML };
                }
            });
            rawData = null; // Help GC

            if (signal.aborted || location.href !== currentUrl) return; // Abort before updating shared state
            searchProducts.push(info);

            info = null; // Help GC
            const len = await itemsLength(); isa++;
            if (isa + itemIndex >= len || isa + itemIndex >= metaData?.asinOnPageCount) {
                if (signal.aborted || location.href !== currentUrl) return; // Abort before heavy work
                await delay(100); // Let DOM/UI catch up
    
                if (signal.aborted || location.href !== currentUrl) return; // Abort before delay
                requestIdleCallback(() => updateStats());

                if (signal.aborted || location.href !== currentUrl) return; // Abort before enabling UI controls
    
                enable(".emr.emr-item-container-row #emr-filter-dropdownMenu .emr-sorts-container");
                enable("#emr-filrerButton .emr-sorts-container");
                enable(".emr.emr-item-container-row #emr-menuButton");
    
                itemsSize = null;
                isa = 0;
            }
        } catch (err) {
            console.error("processProductDetails:", err);
        }
    }
    
        
    
    async function itemsLength() {
        if (itemsSize) return itemsSize;
        try {
            const t = new Set(Array.from(document.querySelectorAll(".s-result-item.s-asin[data-asin]")).map(t => t.getAttribute("data-asin")).filter(t => 4 < t.length));
            return itemsSize = t.size, t.size
        } catch (t) {
            return console.error("Can't Detect Items Length =>", t), 48
        }
    }
    
    function safeValue(t, n = "N/A") {
        return t && null !== t ? t : n
    }
    
    function extractProductInfo(t, n, currentUrl, signal) {
        try {
            if (signal.aborted || location.href !== currentUrl || !t) return null ;
            let r = parseHtml(t), a = `${domainUrl}dp/${n}`; /^https?:\/\//i.test(a) || (a = `https://${a}`);
            let len = getAmazonLanguage(r);
            let i = safeValue(null),
                o = safeValue(extractSrc(r)),
                s = safeValue(extractDetailText(r, "Date", len)),
                u = safeValue(extractDetailText(r, "Best Sellers", len)),
                p = safeValue(cleanString(n)),
                m = safeValue(extractPrice(r)),
                y = safeValue(null);
            return r.documentElement.innerHTML = '', r = null, len = null , new Product(i, a, o, s, u, p, m, y, "N/A","N/A","N/A","N/A")
        } catch (t) {
            console.error("Error extracting product info.", t)
        }
        return null
    }
    
    function extractTitle(doc) {
        try {
            const a = doc.querySelector("#imgTagWrapperId img[alt]");
            let title = null;
    
            if (a) {
                const alt = a.getAttribute("alt");
                if (alt?.trim()) title = alt.trim();
            }
    
            // fallback to <title> if needed
            if (!title) title = doc.title?.trim() || null;
    
            // decode HTML entities like &#39; into actual characters
            if (title) {
                let temp = document.createElement("textarea");
                temp.innerHTML = title;
                title = temp.value;
                temp = null;
            }
    
            return title;
        } catch (e) {
            console.error("Error Extracting Title:", e);
            return null;
        }
    }
    
    function extractSrc(t) {
        try {
            return t.querySelector("#imgTagWrapperId img")?.getAttribute("source").trim().replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B\u200C\u2028\u2029]/g, "") || null
        } catch (t) {
            console.error("Error Extracting Image : ", t)
        }
        return null
    }
    
    const localizedLabels = {
        en: {
            Date: ["Date First Available", "Publication date", "Release Date", "Date first listed on Amazon"],
            Manufacturer: ["Manufacturer"],
            "Best Sellers": ["Best Sellers Rank","Amazon Bestsellers Rank" ],
            Asin: ["Asin", "ISBN-10"]
        },
        de: {
            Date: ["Im Angebot von Amazon","Erscheinungstermin"],
            Manufacturer: ["Hersteller"],
            "Best Sellers": ["Bestseller-Rang"],
            Asin: ["Asin","ISBN-10"]
        },
        fr: {
            Date: ["Date de mise en ligne sur Amazon","Date de publication"],
            Manufacturer: ["Fabricant"],
            "Best Sellers": ["Classement des meilleures ventes d'Amazon"],
            Asin: ["Asin","ISBN-10"]
        },
        es: {
            Date: ["Producto en Amazon","Fecha de","Disponibile su Amazon", "Fecha de disponibilidad en Amazon"],
            Manufacturer: ["Fabricante"],
            "Best Sellers": ["Clasificación en los más vendidos"],
            Asin: ["Asin","ISBN-10"]
        },
        it: {
            Date: ["Disponibile su Amazon","Data di pubblicazione"],
            Manufacturer: ["Produttore"],
            "Best Sellers": ["Posizione nella classifica Bestseller"],
            Asin: ["Asin","ISBN-10"]
        }
    };
    
    function extractDetailText(c, k, len) {
        try {
            const d = c.querySelector("#detailBulletsWrapper_feature_div");
            const l = localizedLabels[len]?.[k] || [];
            const m = txt => {
                txt = txt.toLowerCase();
                for (let i = 0; i < l.length; i++) {
                    if (txt.includes(l[i].toLowerCase())) return true;
                }
                return txt.includes(k.toLowerCase());
            };
            const e = (v) => {
                if (!v) return null;
                if (k === "Best Sellers") {
                    const m = v.match(/^[^\d]*([\d\u00A0\u202F.,']+)/);
                    return m ? m[1].replace(/[\u00A0\u202F.,']/g, '') : null;
                }
                return v.replace(/,/g, "").replace(/\s+/g, " ").trim();
            };
    
            // 1. Check detail bullets first
            if (d) {
                const items = d.querySelectorAll("ul li");
                for (let i = 0; i < items.length; i++) {
                    const txt = items[i].innerText.trim();
                    if (!m(txt)) continue;
                    const v = txt.split(":")[1];
                    if (v) return cleanString(e(v));
                }
            }
    
            // 2. Only check table if bullets didn't return
            const t = c.querySelector("#audibleProductDetails") || c.querySelector("#productDetails_feature_div");
            if (t) {
                const rows = t.querySelectorAll("tbody tr");
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const txt = row.innerText.trim();
                    if (!m(txt)) continue;
                    const td = row.querySelector("td");
                    if (td) return cleanString(e(td.innerText));
                }
            }
    
            return null;
        } catch (err) {
            console.error("Error extracting details:", err);
            return null;
        }
    }
    
    function extractPrice(c) {
        try {
            const a = c.querySelector(".priceToPay");
            if (!a) return null;
            const b = a.querySelector(".a-offscreen");
            if (b) { const a = b.textContent.trim();if (a) return a}
            const d = a.querySelector(".a-price-symbol")?.textContent || "",
                e = a.querySelector(".a-price-whole")?.textContent || "",
                f = a.querySelector(".a-price-fraction")?.textContent || "";
            if (d && e && f) return (d + e + f).replace(/\n/g, "").trim()
        } catch (a) {
            console.error("Error Extracting Price:", a)
        }
        return null
    }
    
    function parseHtml(t) {
        let n = document.implementation.createHTMLDocument("");
        return n.documentElement.innerHTML = t, n
    }
    
    function cleanString(t) {
        return t ? t.replace(/,/g, "").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B\u200C\u2028\u2029]/g, "").normalize("NFC").trim() : null
    }
    
    function updateResults() {
        const t = document.querySelector(".emr.emr-item-container-row .emr-resultProduct");
        if (t) {
            var n = t.textContent?.split("/"), productsPerPAGE = metaData?.asinOnPageCount || 48;
            !n || 2 > n.length || (n = parseInt(n[1].replace(/[^0-9]/g, ""), 10), isNaN(n) || (t.textContent = cleanComp(n,productsPerPAGE)))
        }
    }
    
    function cleanComp(t,p) {
        if (isNaN(t)) return t;
        var n = new URL(window.location.href);
        return n = parseInt(n.searchParams.get("page"), 10) || 1, `${Math.min(p*Math.ceil(t/p),p*n,t).toLocaleString()}/${t.toLocaleString()}`
    }
    
    function cleanBsr(t) {
        return "string" != typeof t || "" === t.trim() || isNaN(t.trim()) || isNaN(t) || null === t || void 0 === t ? "N/A" : "#" + (+t).toLocaleString()
    }
    
    function formatShortDate(input) {
        try {
            if (!input || input.includes("N/A")) return input;
    
            // Localized months mapping (DE, FR, ES, IT, UK)
            const localizedMonths = {
                // German
                "Januar": "January", "Februar": "February", "März": "March", "April": "April",
                "Mai": "May", "Juni": "June", "Juli": "July", "August": "August",
                "September": "September", "Oktober": "October", "November": "November", "Dezember": "December",
    
                // French
                "janvier": "January", "février": "February", "mars": "March", "avril": "April",
                "mai": "May", "juin": "June", "juillet": "July", "août": "August",
                "septembre": "September", "octobre": "October", "novembre": "November", "décembre": "December",
    
                // Spanish
                "enero": "January", "febrero": "February", "marzo": "March", "abril": "April",
                "mayo": "May", "junio": "June", "julio": "July", "agosto": "August",
                "septiembre": "September", "octubre": "October", "noviembre": "November", "diciembre": "December",
    
                // Italian
                "gennaio": "January", "febbraio": "February", "marzo": "March", "aprile": "April",
                "maggio": "May", "giugno": "June", "luglio": "July", "agosto": "August",
                "settembre": "September", "ottobre": "October", "novembre": "November", "dicembre": "December",
    
                // Ukrainian
                "січня": "January", "лютого": "February", "березня": "March", "квітня": "April",
                "травня": "May", "червня": "June", "липня": "July", "серпня": "August",
                "вересня": "September", "жовтня": "October", "листопада": "November", "грудня": "December"
            };
    
            // Replace localized month with English equivalent
            for (const [local, english] of Object.entries(localizedMonths)) {
                const regex = new RegExp(`\\b${local}\\b`, "i");
                if (regex.test(input)) {
                    input = input.replace(regex, english);
                    break; // Only replace first found
                }
            }
    
            // Fix formatting like "20 July 2023" → "July 20, 2023"
            if (/^\w+ \d{1,2} \d{4}$/.test(input)) {
                input = input.replace(/^(\w+ \d{1,2}) (\d{4})$/, "$1, $2");
            }
    
            const parsedDate = new Date(input);
            if (isNaN(parsedDate)) throw new RangeError("Invalid Date");
    
            return new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
            }).format(parsedDate);
    
        } catch (err) {
            console.error("Error Converting Date:", err + " DATE: " + input);
            return "N/A";
        }
    }
    
    async function getImage(t) {
        return chrome.runtime.getURL(`assets/images/${t}`)
    }
    
    async function checkCompetition(customUrl) {
    
        const resultElem = document.querySelector(".emr.emr-item-container-row .emr-resultProduct");
        if (!resultElem) return;
    
        const url = new URL(window.location.href);
        url.searchParams.set("ref", "sr_pg_2");
        url.searchParams.set("page", 3);
    
        let resultCount = null;
        let ura = customUrl? customUrl.href: url.href;
        let competitionData = await fetchAndCompetition(ura, 1);
    
        // 🔁 If result count is too low, try page 1
        if (competitionData?.totalResultCount && competitionData.totalResultCount < 3 * 48) {
            url.searchParams.set("ref", "sr_pg_1"); url.searchParams.set("page", 1);
            ura = url.href;
            competitionData = await fetchAndCompetition(ura, 1);
            url.searchParams.set("ref", "sr_pg_2"); url.searchParams.set("page", 3);
        }
    
        const productsPerPage = metaData?.asinOnPageCount ?? (await getPageMetadata(null,0))?.asinOnPageCount ?? 48;
    
        // ✅ Handle Primary Total Result Count
        if (competitionData?.totalResultCount) {
            resultCount = cleanComp(competitionData.totalResultCount, productsPerPage);
            resultElem.textContent = `${resultCount}`;
            resultCounter = competitionData.totalResultCount;
            updateResults();
            return;
        }
    
        // ✅ Fallback when no totalResultCount
        const estimates = [], aproxCounts = [], lastPages = [];
        url.searchParams.delete("ref");
        url.searchParams.set("page", 1000);
        if(customUrl) return;
        try {
            let tries = 0;
            while (tries++ < 2) {
                const data = await fetchAndCompetition(url.href, 1);
                if (!data) break;
    
                if (data.result) estimates.push(data.result);
                if (data.apro) aproxCounts.push(data.apro);
                if (data.lastPage) lastPages.push(data.lastPage);
    
                if (!data.lastPage) {
                    let apro = data.apro, u = Math.ceil(apro / productsPerPage);
                    for (let round = 1; round <= 3; round++) {
                        url.searchParams.set("page", Math.max(u, 1));
                        const nextData = await fetchAndCompetition(url.href, 1);
                        if (!nextData) break;
    
                        if (nextData.result) estimates.push(nextData.result);
                        if (nextData.apro) aproxCounts.push(nextData.apro);
                        if (nextData.lastPage) lastPages.push(nextData.lastPage);
    
                        if (nextData.apro === apro) break; // No change, stop looping
                        apro = nextData.apro;
                        u = Math.ceil(apro / productsPerPage);
                    }
                }
    
                if (isDuplicated(aproxCounts)) break;
            }
    
            const maxEstimate = Math.max(...estimates, 0);
            const maxAprox = Math.max(...aproxCounts, 0);
            const final = maxAprox >= 20000 ? Math.max(maxEstimate, maxAprox) : maxAprox;
    
            resultCount = cleanComp(final || 0, productsPerPage);
            resultElem.textContent = `${resultCount}`;
            resultCounter = final;
    
        } catch (err) {
            console.error("Competition check failed:", err);
            resultElem.textContent = "Error!";
        }
    }
    
    
    function isDuplicated(t) {
        for (let n = 0; n < t.length - 1; n++)
            if (t[n] === t[n + 1]) return !0;
        return !1
    }
    async function fetchAndCleanContent(t, n, currentUrl, signal) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (location.href !== currentUrl) throw new Error('URL changed');
      
        const html = await fetchWithRetry(t, n, currentUrl, signal);
      
        if (!html) return null;
      
        const titleMatch = html.match(/<title.*?<\/title>/is);
        return html
          .replace(/<head.*?<\/head>/is, titleMatch ? titleMatch[0] : "")
          .replace(/<style.*?<\/style>/gs, "")
          .replace(/<script.*?<\/script>/gs, "")
          .replace(/<noscript.*?<\/noscript>/gs, "")
          .replace(/<header.*?<\/header>/gs, "")
          .replace(/href=/gs, "momo=")
          .replace(/src=/gs, "source=")
          .replace(/data-/gs, "mama-")
          .replace(/onload/gs, "onslow");
    }
      
    async function fetchAndCompetition(asinOrUrl, typeOfData) {
    
        const html = await fetchWithRetryLoader(asinOrUrl, typeOfData);
        if (!html) return null;
    
        metaData = await getPageMetadata(html , 1) || metaData || null ;
    
        // Try JSON total count first
        const totalMatch = html.match(/"totalResultCount":\s*(\d+)/);
        if (totalMatch) {
          return { totalResultCount: parseInt(totalMatch[1], 10) };
        }
      
        // Fallback to parsing HTML counts
        let result = null, approx = null, lastPage = null;
      
        try {
          const span = html.match(/<span[^<]*?(result|results)[^>]*?<\/span>/gi)?.[0];
          if (span) {
            const countMatch = span.match(/(\d{1,3}(?:,\d{3})*)\s*results?/);
            if (countMatch) {
              result = parseInt(countMatch[1].replace(/,/g, ""));
              const approxMatch = span.match(/(\d{1,3}(?:,\d{3})*)-(\d{1,3}(?:,\d{3})*)/);
              approx = approxMatch ? parseInt(approxMatch[2].replace(/,/g, "")) : null;
            }
          }
        } catch {}
      
        // Last Page detection
        const lastPages = html.match(/<span[^>]*class=["']s-pagination-item s-pagination-disabled["'][^>]*>(.*?)<\/span>/gi);
        if (lastPages?.length) {
          lastPages.forEach(el => {
            const pageNum = parseInt(el.match(/>(.*?)<\/span>/i)?.[1]?.replace(/,/g, ""));
            if (!isNaN(pageNum)) lastPage = pageNum;
          });
        }
      
        return { result, apro: approx, lastPage, totalResultCount: null };
    }
      
    
    function getRandomUserAgent(t) {
        return 3 === t && userAgent ? userAgent : (t = getUserAgent(), Array.isArray(t) && 0 !== t.length || !userAgent ? t[Math.floor(Math.random() * t.length)] : userAgent)
    }
    
    function getUserAgent() {
        return userAgent && "undefined" !== userAgent || (userAgent = navigator.userAgent), userAgent.includes("Windows NT") ? (userAgents.push(userAgent), ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36", "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/89.0.774.63 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/92.0 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36", "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/102.0.1245.44 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/91.0 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.87 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.16 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Edge/108.0.1462.42", userAgent]) : userAgent.includes("X11; Linux") ? (userAgents.push(userAgent), ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36", "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:104.0) Gecko/20100101 Firefox/104.0", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/92.0.902.73 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.49 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/92.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/94.0 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36", userAgent]) : userAgent.includes("Macintosh; Intel Mac OS X") ? (userAgents.push(userAgent), ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Edge/79.0.309.71 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/90.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Edge/92.0.902.67 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/92.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/93.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/94.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/95.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/96.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/97.0 Safari/537.36", userAgent]) : userAgents
    }
    
    async function fetchWithRetry(t, n, currentUrl, signal, r = 3) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (location.href !== currentUrl) throw new Error('URL changed');
    
        let i = 0 === n ? `${domainUrl}dp/${t.replace(/\s+/g,"").replace(/\u200E/g,"")}` : t;
        for (let l = 0; l < r; l++) {
            try {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                if (location.href !== currentUrl) throw new Error('URL changed');
    
                await delay(Math.floor(20 * Math.random()));
    
                let resp = await fetch(i, {
                    method: "GET",
                    signal,
                    headers: {
                        "User-Agent": getRandomUserAgent(),
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                        "Clear-Site-Data": "cache",
                        "Accept-Encoding": "br, zstd, gzip, deflate"
                    }
                });
    
                if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
    
                let text = await resp.text();
    
                if (
                  text.includes("we just need to make sure you're not a robot") ||
                  text.includes("Amazon data please contact api-services-support@amazon.com")
                ) {
                    return await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: "fetchAmazonData",
                            url: i,
                            mode: 1
                        }, r => {
                            r?.success ? resolve(r.data) : reject(new Error(`Failed to fetch ${r} even with extension`))
                        });
                    });
                }
    
                return text;
    
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Just re-throw to notify caller
                    throw err;
                }
                if (l === r - 1) {
                    if (0 === n) {
                        try {
                            return await new Promise((resolve, reject) => {
                                chrome.runtime.sendMessage({
                                    action: "fetchAmazonData",
                                    url: i,
                                    mode: 1
                                }, r => {
                                    r?.success ? resolve(r.data) : reject(new Error(`Failed to fetch ${r} even with extension`))
                                });
                            });
                        } catch {
                            throw new Error(`Error fetch ${i} with extension`);
                        }
                    } else {
                        throw new Error(`Failed to fetch URL: ${t} after ${r} retries.`);
                    }
                }
            }
        }
    }
    
    async function setDomain() {
        const t = window.location.href.match(/https?:\/\/?(www\.?amazon\.(com|es|fr|it|de|co\.uk))/);
        t && (domainUrl = `${t[1]}/`, /^https?:\/\//i.test(domainUrl) || (domainUrl = `https://${domainUrl}`))
    }
    async function requestTabId() {
        for (let t = 0; 3 > t;) try {
            return await new Promise((t, n) => {
                const r = chrome.runtime.connect({
                    name: "activeTabId"
                });
                r.postMessage({
                    action: "getActiveTabId"
                }), r.onMessage.addListener(a => {
                    a && void 0 !== a.tabId ? t(a.tabId) : n("Tab ID not found"), r.disconnect()
                }), r.onDisconnect.addListener(() => {
                    chrome.runtime.lastError && n(chrome.runtime.lastError.message)
                })
            })
        } catch (n) {
            if (t++, 3 <= t) break;
            await new Promise(t => setTimeout(t, 500))
        }
        return null
    }
    async function saveSettings(t, n) {
        for (let r = 0, a = !1; 3 > r;) try {
            if (!t) break;
            const r = await requestTabId();
            if (!r) throw Error("Tab ID retrieval failed.");
            const i = chrome.runtime.connect({
                name: "saveSettings"
            });
            i.postMessage({
                action: "saveSettings",
                data: t,
                tabId: r
            });
            const l = setTimeout(() => {
                    i.disconnect()
                }, 3E4),
                o = await new Promise((t, n) => {
                    i.onMessage.addListener(n => {
                        clearTimeout(l), t(n), i.disconnect()
                    }), i.onDisconnect.addListener(() => {
                        chrome.runtime.lastError ? n(Error(`Disconnected due to an error: ${chrome.runtime.lastError.message}`)) : n(Error("Port disconnected without a response."))
                    })
                });
            if ("success" === o.status) {
                !a && n && (closeTabAndOpenNew(t.dmUrl), a = !0);
                break
            } else throw Error(`Settings storage failed: ${o.message}`)
        } catch (t) {
            if (r++, 3 <= r) break;
            await new Promise(t => setTimeout(t, 1E3))
        }
    }
    async function getSettings() {
        try {
            const t = await requestTabId();
            if (t) return new Promise((n, r) => {
                const a = chrome.runtime.connect({
                    name: "retrieveSettings"
                });
                a.postMessage({
                    action: "retrieveSettings",
                    tabId: t
                }), a.onMessage.addListener(t => {
                    "success" === t.status ? t.message ? n(t.message) : n(null) : n(null), a.disconnect()
                }), a.onDisconnect.addListener(() => {
                    chrome.runtime.lastError && r(Error("Disconnected due to an error"))
                })
            });
            throw Error("tabId is undefined")
        } catch (t) {
            return null
        }
    }
    async function getUI() {
        try {
            const t = await requestTabId();
            if (t) return new Promise((n, r) => {
                const a = chrome.runtime.connect({
                    name: "UI"
                });
                a.postMessage({
                    action: "getUI",
                    tabId: t
                }), a.onMessage.addListener(t => {
                    "success" === t.status ? t.message ? n(t.message) : n(null) : n(null), a.disconnect()
                }), a.onDisconnect.addListener(() => {
                    chrome.runtime.lastError && r(Error("Disconnected due to an error"))
                })
            });
            throw Error("tabId is undefined")
        } catch (t) {
            return null
        }
    }
    async function deleteSavedProducts(t) {
        try {
            const n = chrome.runtime.connect({
                name: "autoSave"
            });
            n.postMessage({
                action: "delete",
                data: t
            });
            const r = setTimeout(() => {
                n.disconnect()
            }, 3E4);
            n.onMessage.addListener(t => {
                clearTimeout(r), "success" === t.status, deleted = !0, n.disconnect()
            }), n.onDisconnect.addListener(() => {})
        } catch (t) {
            console.error("Error Deleting Saved Products: ", t)
        }
    }
    async function saveLoadedProducts() {
        try {
            if (Array.isArray(productsToSave) && 0 !== productsToSave.length) {
                let marketplaceCode = null ; // default fallback
                async function t() {
                    for (let t = 0; t < productsToBeStored.length; t += 48) {
                        const r = productsToBeStored.slice(t, t + 48);
                        await n(r, l)
                    }
                    productsToBeStored = [], fetchedAsins = [], productsToSave = []
                }
    
                function n(t, n) {
                    return new Promise(r => {
                        const i = chrome.runtime.connect({
                            name: "autoSave"
                        });
                        i.postMessage({
                            action: "saveLoadedProducts",
                            data: t,
                            db: n
                        }), i.onMessage.addListener(t => {
                            "success" === t.status && r(), i.disconnect()
                        }), i.onDisconnect.addListener(() => r())
                    })
                }
                const r = document.getElementById("emr-cmarket"), a = document.getElementById("emr-cproduct");
                let l = null;
                if (r && a) {
                    const t = r?.selectedOptions[0].text, n = a?.selectedOptions[0].text;
                    l = `Products_${t}_${n}`.replace(/ /g, "_"), l = l.includes("Other") ? `Products_Other_${t}-Products`.replace(/ /g, "_") : l
                }else{  
                    if (!marketplaceCode) {
                        const host = location.hostname;
                        if (host.includes("amazon.com")) marketplaceCode = "US";
                        else if (host.includes("amazon.co.uk")) marketplaceCode = "UK";
                        else if (host.includes("amazon.de")) marketplaceCode = "DE";
                        else if (host.includes("amazon.fr")) marketplaceCode = "FR";
                        else if (host.includes("amazon.it")) marketplaceCode = "IT";
                        else if (host.includes("amazon.es")) marketplaceCode = "ES";
                        else marketplaceCode = 'US'; // fallback to last TLD part
                    }
                    l = `Products_Other_${marketplaceCode}-Products`;
                }
                productsToBeStored = productsToSave.length ? productsToSave.slice(Math.max(0, productsToSave.length - 1200)) : [], await t()
            }
        } catch (t) {
            console.error("Error Saving Products:", t)
        }
    }
    async function retrieveLoadedProducts() {
        try {
            const t = await requestTabId();
            if (t) return new Promise((n, r) => {
                const a = chrome.runtime.connect({
                    name: "autoRetrieve"
                });
                a.postMessage({
                    action: "autoRetrieveLoadedP",
                    tabId: t
                }), a.onMessage.addListener(t => {
                    "success" === t.status ? t.message ? products = t.message : n(null) : n(null), a.disconnect()
                }), a.onDisconnect.addListener(() => {
                    chrome.runtime.lastError && r(Error("Disconnected due to an error"))
                })
            });
            throw Error("tabId is undefined")
        } catch (t) {
            return null
        }
    }
    
    async function runLoader() {
        let loaderContainer = document.querySelector("div.emr-loaderContainer");
      
        // STEP 1: If already exists, just show it
        if (loaderContainer) {
          if (loaderContainer.style.display.includes("none")) {
            loaderContainer.style.display = "flex";
            loaderContainer.classList.add("emr-show");
            document.body.style.overflow = "hidden";
          }
          return;
        }
      
        // STEP 2: Create loader from scratch
        loaderContainer = document.createElement("div");
        loaderContainer.className = "emr-loaderContainer emr-show";
        loaderContainer.style.cssText = `
          position: fixed; top: 0; left: 0;
          width: 100%; height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          z-index: 9999;
        `;
    
        loaderContainer.innerHTML = getLoaderHTML();
        document.body.appendChild(loaderContainer);
      
        // STEP 3: Wait briefly for rendering
        await delay(1000);
      
        // STEP 4: Setup references and UI updates
        const filterText = () => {
          const market = document.getElementById("emr-cmarket").selectedOptions[0].text;
          const product = document.getElementById("emr-cproduct").selectedOptions[0].text;
          let display = `${market}_${product}`.replace(/ /g, "_");
          if (display.includes("Other")) display = `Other_${market}-Products`.replace(/ /g, "_");
          document.getElementById("emr-mps").textContent = `"${display}"`;
        };
      
        filterText();
        document.getElementById("emr-cmarket").addEventListener("change", filterText);
        document.getElementById("emr-cproduct").addEventListener("change", filterText);
      
        // STEP 5: Attach event listeners
        attachLoaderEvents(loaderContainer);
      
        // STEP 6: Initialize virtualization and misc
        document.body.style.overflow = "hidden";
        containerProducts = document.getElementById("emr-tableBody");
        emrSpacer = document.querySelector(".emr-spacer");
        tableContainer = document.getElementById("emr-tableContainer");
        VISIBLE_ITEMS = Math.ceil(tableContainer.clientHeight / ROW_HEIGHT);
        start = 0;
      
        tableContainer.addEventListener("scroll", handleScrollThrottled);
        tableContainer.addEventListener("click", handleClickEvents);
      
        startVirtualization();
        setEventCsv();
        deleted || deleteSavedProducts("Auto_Load_More");
      
        document.getElementById("emr-importButton").addEventListener("click", () => {
          document.getElementById("emr-csvFile").click();
        });
    }
    
    function getAdvancedHTML(){
        return `
            <div class="emr-filter-container emr-glow-border">
                <span class="emr-closefilters emr-closer" style="display:none" ><i class="ri-close-large-fill"></i></span>
                <div class="emr-filter-inner-container">
                <div class="emr-advanced-options">
                    <div class="emr-filter-group emr-search">
                        <label>Search Term</label>
                        <input type="text" id='emr-filter-term' placeholder="Search term.. keyword" class="emr-search-input"/>
                    </div>
                    <div class="emr-filter-group emr-search">
                        <label for='exclude-term'>Exclude Keywords</label>
                        <textarea type="text" id='emr-exclude-term' placeholder="keyword1,keyword2,keyword3..etc" class="emr-search-input" value="Disney,STAR WARS,Shirt.Woot,Shirt.Woot!,FanPrint,DC Comics,Nickelodeon,Warner Bros.,Star Wars,JEFF DUNHAM: Seriously!? Tour,WWE,Peanuts,SUPER MARIO,Dr. Seuss,Hello Kitty,NBC,Star Trek,Mademark,Curious George,Pixar,Mean Girls,Cartoon Network,Sesame Street,Hasbro,Coca-Cola,RICK AND MORTY,Nintendo,JEFF DUNHAM: Passively Aggressive Tour,Despicable Me,KISS,Jurassic Park,Teenage Mutant Ninja Turtles,My Little Pony,American Kennel Club,Annoying Orange,Beer Nuts,Bill Nye The Science Guy,Booba,Buckedup.com,Carly and Martina,Comrade Detective,Daria,dippin' dots,Drama Llama,DUNKIN',Entrepreneur,Final Space,Hannah Hart,Hell's Kitchen,IMOMSOHARD,Impractical Jokers,Jane Austen Collection,Jane Goodall Institute,Jenn McAllister,Jersey Shore Family Vacation,JoJo Siwa,Kabillion,League of Buddies,Legendary Entertainment,Love Island,LyricVerse,Mod Podge,MTV,MYTHICAL,Nash Grier,Neil deGrasse Tyson,Rick and Morty Fan Art,Ricky Dillon,ROBLOX,Ryland Adams,ShibSibs,SpongeBob SquarePants,The Daily Wire,The Grand Tour,The Official Oddbods Store,The Young Turks,TheSoul,Twin Peaks,UglyDolls,US Rugby Players Association,World of Dance,Young Hollywood,Visit the STAR WARS Store,The Mandalorian Store,Barbie,Elite Authentics Store,Amazon Essentials,Space Jam,SANRIO,Barbie The Movie,Boyz In The Hood,Aerosmith,Bengals,Harry Potter,Rolling Stones,Rebelde,Ripple Junction,Jelly Roll,Breaking Bad,Rainbow for Friends,Fender,Pink Floyd,Black Sabbath,Foo Fighters,Queen,Minecraft,Coors,Pantera,Pinkfong,Falling in Reverse,Guns N' Roses,TheBeatles,Pink,Selena Quintanilla,CampusLab,Rob Zombie,Y Yellowstone,Misfits Official,Jeep,Mattel,Slayer,Korn,Loony Toons,Ed Sheeran,Dolly Parton,Stranger Things,Legend of Zelda">Disney , STAR WARS , Shirt.Woot , Shirt.Woot! , FanPrint , DC Comics , Nickelodeon , Warner Bros. , Star Wars , JEFF DUNHAM: Seriously!? Tour , WWE , Peanuts , SUPER MARIO , Dr. Seuss , Hello Kitty , NBC , Star Trek , Mademark , Curious George , Pixar , Mean Girls , Cartoon Network , Sesame Street , Hasbro , Coca-Cola , RICK AND MORTY , Nintendo , JEFF DUNHAM: Passively Aggressive Tour , Despicable Me , KISS , Jurassic Park , Teenage Mutant Ninja Turtles , My Little Pony , American Kennel Club , Annoying Orange , Beer Nuts , Bill Nye The Science Guy , Booba , Buckedup.com , Carly and Martina , Comrade Detective , Daria , dippin' dots , Drama Llama , DUNKIN' , Entrepreneur , Final Space , Hannah Hart , Hell's Kitchen , IMOMSOHARD , Impractical Jokers , Jane Austen Collection , Jane Goodall Institute , Jenn McAllister , Jersey Shore Family Vacation , JoJo Siwa , Kabillion , League of Buddies , Legendary Entertainment , Love Island , LyricVerse , Mod Podge , MTV , MYTHICAL , Nash Grier , Neil deGrasse Tyson , Rick and Morty Fan Art , Ricky Dillon , ROBLOX , Ryland Adams , ShibSibs , SpongeBob SquarePants , The Daily Wire , The Grand Tour , The Official Oddbods Store , The Young Turks , TheSoul , Twin Peaks , UglyDolls , US Rugby Players Association , World of Dance , Young Hollywood , Visit the STAR WARS Store , The Mandalorian Store , Barbie , Elite Authentics Store , Amazon Essentials , Space Jam , SANRIO , Barbie The Movie , Boyz In The Hood , Aerosmith , Bengals , Harry Potter , Rolling Stones , Rebelde , Ripple Junction , Jelly Roll , Breaking Bad , Rainbow for Friends , Fender , Pink Floyd , Black Sabbath , Foo Fighters , Queen , Minecraft , Coors , Pantera , Pinkfong , Falling in Reverse , Guns N' Roses , TheBeatles , Pink , Selena Quintanilla , CampusLab , Rob Zombie , Y Yellowstone , Misfits Official , Jeep , Mattel , Slayer , Korn , Loony Toons , Ed Sheeran , Dolly Parton , Stranger Things , Legend of Zelda
                        </textarea>
                    </div>
                    <div class="emr-filter-group">
                        <label>BSR Range</label>
                        <input type="number" id="emr-minBsr" placeholder="Min" class="emr-min-input"/>
                        <input type="number" id="emr-maxBsr" placeholder="Max" class="emr-max-input"/>
                    </div>
                    <div class="emr-filter-group">
                        <label>Price Range</label>
                        <input type="number" id='emr-minfPrice' placeholder="Min" class="emr-min-input"/>
                        <input type="number" id='emr-maxfPrice' placeholder="Max" class="emr-max-input"/>
                    </div>
                    <div class="emr-filter-group">
                        <label>Date Range</label>
                        <input type="datetime" id="emr-minfDate" placeholder="MM/DD/YYYY" class="emr-min-input">
                        <input type="datetime" id="emr-maxfDate" placeholder="MM/DD/YYYY" class="emr-max-input">
                    </div>
                    <div class="emr-filter-group">
                        <label>Reviews Range</label>
                        <input type="number" id="emr-minfReviews" placeholder="Min" class="emr-min-input">
                        <input type="number" id="emr-maxfReviews" placeholder="Max" class="emr-max-input">
                    </div>
                    <div class="emr-filter-group">
                        <label>Sales Badge</label>
                        <input type="number" id="emr-minfSales" placeholder="Min" class="emr-min-input">
                        <input type="number" id="emr-maxfSales" placeholder="Max" class="emr-max-input">
                    </div>
                    <!-- Scanning Speed Select Option -->
                    <div class="emr-filter-group">
                        <label for="emr-scanningSpeed">Scanning Speed.</label>
                        <select id="emr-scanningSpeed" class="emr-search-input">
                            <option value="veryslow">Slow</option>
                            <option value="slow">Moderate</option>
                            <option value="normal" selected>Normal</option>
                            <option value="fast">Fast</option>
                        </select>
                    </div>
                    <!-- Scanning Speed Select Option -->
                    <div class="emr-filter-group" style="width:400px">
                            <label for="emr-cmarket" style="width:100%">Database <span id="emr-mps"/> </label>
                            <div class="emr-item-container-row">
                                <select id="emr-cmarket" class="emr-search-input" style="width: 200px;">
                                    <option value="US" selected>US</option>
                                    <option value="UK">UK</option>
                                    <option value="DE">DE</option>
                                    <option value="ES">ES</option>
                                    <option value="FR">FR</option>
                                    <option value="IT">IT</option>
                                </select>
                                <select id="emr-cproduct" class="emr-search-input" style="width: 200px;">
                                    <option value="tshirt">T-Shirts</option>
                                    <option value="tanktop">Tank-Tops</option>
                                    <option value="vneck">V-Necks</option>
                                    <option value="sweetshirt">Sweetshirts</option>
                                    <option value="hoodie">Hoodies</option>
                                    <option value="longsleeve">Long Sleeves</option>
                                    <option value="tumbler">Tumblers</option>
                                    <option value="throwpillow">Throw-Pillows</option>
                                    <option value="others" selected>Other Products</option>
                                </select>
                            </div>
                    </div> 
                    <div class="emr-switch-container">
                        <label for="emr-enable-reviews-filter" style="letter-spacing: normal;">Extract products including number of reviews</label>
                        <label class="emr-switch" for="emr-enable-reviews-filter">
                            <input type="checkbox" id="emr-enable-reviews-filter" checked>
                            <span class="emr-slider emr-round"></span>
                        </label>
                    </div>
                    <div class="emr-switch-container">
                        <label for="emr-enable-badge-filter" style="letter-spacing: normal;">Extract products including sales badge</label>
                        <label class="emr-switch" for="emr-enable-badge-filter">
                            <input type="checkbox" id="emr-enable-badge-filter" checked>
                            <span class="emr-slider emr-round"></span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="emr-filter-actions">
                    <button class="emr-btn emr-filter-btn">Filter <i class="ri-filter-line"></i></button>
                    <button class="emr-btn emr-reset-btn">Reset <i class="ri-reset-left-fill"></i></button>
                    <input style="display:none !important" accept='.json' id='emr-csvFile' type='file' multiple/>
                    <button class="emr-imButton" id="emr-importButton" for="emr-csvFile">Import <i class="ri-upload-line"></i></button>
                    <button id="emr-export">Export <i class="ri-download-line"></i></button>
                    <button id="emr-exportExccel">Export as Excel <i class="ri-download-line"></i></button>
                    <span style="display: flex;flex-direction: row;flex-wrap: wrap;align-items: center;justify-content: space-around;gap: 7px;margin: 20px;border: 1px dashed;padding: 10px;"><span class="emr-ttfilter">Products: ---- </span><i class='emr-filter-helper'>Note: Click reset to see all products!</i></span>
            </div>
        </div>
        `;
    }
    function getLoaderHTML() {
        return `
            <div class="emr-container emr-glow-border" style='overflow:hidden;position:relative;'>
                <span id="emr-closeButton" class="emr-closer"><i class="ri-close-large-fill"></i></span>
                ${getAdvancedHTML()}
                <div class="emr-header emr-glow-border-bottom">
                    <div class="emr-loader emr-item-container-row">
                        <span class="emr-item-container-row emr-floater">
                            <label for="emr-firstCount">Pages:</label>
                            <input type="number" value="1" id="emr-firstCount"/>
                            <label for="emr-lastCount">-</label>
                            <input type="number" value="10" id="emr-lastCount"/>
                            <p class="emr-progress">Pages: <span class='emr-progressValue'>0/10</span></p>
                            <i class="fas ri-delete-bin-line emr-deleteProducts" aria-hidden="true"></i>
                            <div class="emr-switch-container-vertical">
                                    <label class="emr-switch-vertical">
                                        <input type="checkbox" id="emr-filterAll">
                                        <span class="emr-slider-vertical"></span>
                                    </label>
                            </div>                       
                            <button class="emr-multiload">Load</button>
                            <div class="emr-responsive-dropdown-container">
                                <div class="emr-filter-menuButton-wrapper">
                                    <div class="emr-responsive-menu-button" id="emr-advanced-menuButton">
                                        <span class="emr-labled">Sort-by</span>
                                        <div class="emr-responsive-menu-icon">
                                            <i class="ri-filter-3-line"></i>
                                        </div>
                                    </div>
                                </div>
                            <div class="emr-responsive-dropdown emr-glow-border" id="emr-advanced-dropdownMenu">
                                <div class="emr-products-sorts">
                                    <button class="emr-best-sellers-sort">Best Sellers <i class="emr fa ri-expand-up-down-fill" aria-hidden="true"></i></button>
                                    <button class="emr-bsr-sort">BSR <i class="emr fa ri-expand-up-down-fill" aria-hidden="true"></i></button>
                                    <button class="emr-date-sort">Date <i class="emr fa ri-expand-up-down-fill" aria-hidden="true"></i></button>
                                    <button class="emr-price-sort">Price <i class="emr fa ri-expand-up-down-fill" aria-hidden="true"></i></button>
                                    <button class="emr-reviews-sort">Reviews <i class="emr fa ri-expand-up-down-fill" aria-hidden="true"></i></button>
                                    <button class="emr-badge-sort">Sales Badge <i class="emr fa ri-expand-up-down-fill" aria-hidden="true"></i></button>
                               </div>
                            </div>
                            </div>
                            <button class="emr-filters">Filters <i class="ri-equalizer-3-line"></i></button>
                        </span>
                    </div>
                </div>
                <div class="emr-table-scroll-wrapper" id="emr-tableContainer">
                    <!-- Static header table -->
                    <table class="emr-header-table emr-table">
                        <thead>
                        <tr>
                            <th class="emr-sticky-preview emr-cell">Preview</th>
                            <th class="emr-cell">Title</th>
                            <th class="emr-cell">Brand</th>
                            <th class="emr-cell emr-table-sorts emr-cell-date">Date <i class="ri-arrow-up-down-fill"></i></th>
                            <th class="emr-cell emr-table-sorts emr-cell-bsr">BSR <i class="ri-arrow-up-down-fill"></i></th>
                            <th class="emr-cell emr-table-sorts emr-cell-price">Price <i class="ri-arrow-up-down-fill"></i></th>
                            <th class="emr-cell emr-table-sorts emr-cell-reviews">Reviews <i class="ri-arrow-up-down-fill"></i></th>
                            <th class="emr-cell emr-table-sorts emr-cell-badge">Sales Badge+ <i class="ri-arrow-up-down-fill"></i></th>
                            <th class="emr-cell">ASIN</th>
                            <th class="emr-sticky-action emr-cell">Actions</th>
                        </tr>
                        </thead>
                    </table>
                    <!-- Scrollable body -->
                    <div class="emr-virtual-body-wrapper">
                        <table id="virtual-body" class="emr-table">
                            <div class="emr-spacer"></div>
                            <tbody id="emr-tableBody"></tbody>
                        </table>
                    </div>
                </div>
                <div class="emr-arrow-box"></div>
                <div id="emr-hoverBox" class="emr-hover-box">
                        <span id="emr-closeBox" class="emr-closer" style="display:none"><i class="ri-close-large-fill"></i></span>
                        <div class="emr-box-item">
                            <div class="emr-box-image"><a target="_blank"><img src=""></a></div>
                            <div class="emr-box-info">
                                <p><strong>Title:</strong><span class="emr-box-title"></span></p>
                                <p><strong>Brand:</strong> <span class="emr-box-brand"></span></p>
                                <p><strong>Date:</strong> <span class="emr-box-date"></span></p>
                                <p><strong>Rank(BSR):</strong><span class="emr-box-bsr"></span></p>
                                <p><strong>Price:</strong> <span class="emr-box-price"></span></p>
                                <p><strong>Reviews:</strong> <span class="emr-box-reviews"></span></p>
                                <p><strong>Sales bagde:</strong> <span class="emr-box-badge"></span></p>
                                <p><strong>ASIN:</strong> <span class="emr-box-asin">B0FCDNFLWS</span></p>
                            </div>
                        </div>
                </div>
                <div id="emr-msg-box" class="emr-msg-box">
                        <div class="emr-mgs-content emr-glow-border-thin">
                            <span class="emr-msg">Message</span>
                            <div class="emr-msg-button">
                                <button class="emr-ok-btn">Ok</button>
                            </div>
                        </div>
                </div>
            </div>
        `;
    }

    function exportProductsExcel(fileName = "products.xls") {
        var t = 0 === filteredProducts.length ? products : filteredProducts;
        if (Array.isArray(t) && 0 !== t.length) {
            try {
                function formatDateMMDDYYYY(dateStr) {
                    const d = new Date(dateStr);
                    if (isNaN(d)) return "N/A";
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    const yyyy = d.getFullYear();
                    return `${mm}-${dd}-${yyyy}`;
                }
    
                function formatPriceNumber(priceStr) {
                    if (!priceStr) return "N/A";
                    const cleaned = priceStr.replace(/[^0-9.-]+/g, "");
                    const num = parseFloat(cleaned);
                    return isNaN(num) ? "N/A" : num;
                }
    
                let xml = `<?xml version="1.0"?>
                <?mso-application progid="Excel.Sheet"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:x="urn:schemas-microsoft-com:office:excel"
                xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
                <Worksheet ss:Name="Products">
                <Table>
                    <Row>
                    <Cell><Data ss:Type="String">Title</Data></Cell>
                    <Cell><Data ss:Type="String">Brand</Data></Cell>
                    <Cell><Data ss:Type="String">Date</Data></Cell>
                    <Cell><Data ss:Type="String">ASIN</Data></Cell>
                    <Cell><Data ss:Type="String">BSR</Data></Cell>
                    <Cell><Data ss:Type="String">Link</Data></Cell>
                    <Cell><Data ss:Type="String">Image</Data></Cell>
                    <Cell><Data ss:Type="String">Price</Data></Cell>
                    <Cell><Data ss:Type="String">Competition</Data></Cell>
                    <Cell><Data ss:Type="String">Reviews</Data></Cell>
                    <Cell><Data ss:Type="String">Ratings</Data></Cell>
                    <Cell><Data ss:Type="String">Badge</Data></Cell>
                    </Row>`;
    
                t.forEach(p => {
                    xml += `<Row>
                    <Cell><Data ss:Type="String">${p.title}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.brand}</Data></Cell>
                    <Cell><Data ss:Type="String">${formatDateMMDDYYYY(p.date)}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.asin}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.bsr}</Data></Cell>
                    <Cell ss:Formula="=HYPERLINK(&quot;${p.ahref}&quot;,&quot;View Product&quot;)"><Data ss:Type="String">View Product</Data></Cell>
                    <Cell ss:Formula="=HYPERLINK(&quot;${p.img}&quot;,&quot;Image&quot;)"><Data ss:Type="String">Image</Data></Cell>
                    <Cell><Data ss:Type="Number">${formatPriceNumber(p.price)}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.competition}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.reviews}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.ratings}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.badge}</Data></Cell>
                    </Row>`;
                });
    
                xml += `</Table></Worksheet></Workbook>`;
    
                const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                link.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Failed to export Excel file: ", error);
            }
        }
    }
    
    
      
    function attachLoaderEvents(container) {
        container.querySelector(".emr-closefilters")?.addEventListener("click", filtersHandler);
        container.querySelector("button.emr-filters")?.addEventListener("click", filtersHandler);
        container.querySelector("button.emr-ok-btn")?.addEventListener("click", closeMessage);
        container.querySelector("button.emr-multiload")?.addEventListener("click", loadHandler);
        container.querySelector("#emr-closeButton")?.addEventListener("click", closeHandler);
        container.querySelector(".emr-deleteProducts")?.addEventListener("click", deletePro);
        container.querySelector("button.emr-filter-btn")?.addEventListener("click", filter);
        container.querySelector("button.emr-reset-btn")?.addEventListener("click", reset);
        container.querySelector("#emr-export")?.addEventListener("click", exportProducts);
        container.querySelector("#emr-exportExccel")?.addEventListener("click", exportProductsExcel);
      
        const advBtn = container.querySelector("#emr-advanced-menuButton");
        advBtn?.addEventListener("click", () => {
          const menu = container.querySelector("#emr-advanced-dropdownMenu");
          const visible = menu.style.display === "block";
          menu.style.display = visible ? "none" : "block";
        });
    
        reviewsEnabled = document.getElementById("emr-enable-reviews-filter");
        badgeEnabled = document.getElementById("emr-enable-badge-filter");
        feedbacker = feedbacker = document.querySelector(".emr-loaderContainer span.emr-ttfilter");
        container.querySelector("#emr-filterAll")?.addEventListener("change", updateFilterCaches);
        container.querySelector(".emr-products-sorts")?.addEventListener("click", (e) => {
          const btn = e.target.closest("button");
          if (btn) reorder(btn.innerText.toLowerCase().trim());
        });
        initFilterListeners();
        const parentWrapper = document.querySelector('.emr-loaderContainer');
        const table = document.querySelector('.emr-table-scroll-wrapper #virtual-body');
        const hoverBox = document.getElementById('emr-hoverBox');
        const arrowBox = document.querySelector('.emr-arrow-box');
        const closer = document.getElementById('emr-closeBox');

    
        if (table && hoverBox && arrowBox) {
          table.addEventListener('mouseover', function (e) {
            const cell = e.target.closest('.emr-sticky-preview');
            if (!cell) return;
            
            const wrapper = document.querySelector('.emr-table-scroll-wrapper .emr-virtual-body-wrapper');
            if (!wrapper) return;
        
            const wrapperRect = wrapper.parentElement.getBoundingClientRect();
            const cellRect = cell.getBoundingClientRect();
            
            let offsetTop = cellRect.top - wrapperRect.top;
    
            // Ensure hoverBox fits vertically within the wrapper
            const hoverBoxHeight = hoverBox.offsetHeight;
            // If going out of bottom boundary
            if (offsetTop + hoverBoxHeight > wrapper.parentElement.offsetParent.clientHeight) {
              offsetTop = wrapper.parentElement.offsetParent.clientHeight - hoverBoxHeight - 15; // with some padding
            }
        
            // If going out of top boundary
            if (offsetTop < 80) {
              offsetTop = 60; // small padding from top
            }
            renderBoxInfo(cell, hoverBox, offsetTop, arrowBox, cellRect , wrapperRect);
    
          });   
          
        }
        closer?.addEventListener('click', function () {
            if(hoverBox) hoverBox.style.display ='none';
            if(arrowBox) arrowBox.style.display ='none';
        });
  
        parentWrapper?.addEventListener('mouseout', function (e) {
            const from = e.target;
            const to = e.relatedTarget;
        
            const leavingSticky = !from.closest('.emr-sticky-preview');
            const leavingHover = !hoverBox.contains(to);
            const leavingArrow = !arrowBox.contains(to);
        
            const outsideAll = !to || (leavingSticky && leavingHover && leavingArrow);
        
            if (outsideAll) {
                hoverBox.style.display = 'none';
                arrowBox.style.display = 'none';
            }
        });
        
        parentWrapper?.addEventListener('click', (e) => {
            // Handle table sort clicks
            const sortElement = e.target.closest('.emr-table-sorts');
            if (sortElement) {
                const text = sortElement.textContent.toLowerCase().trim();
                reorder(text);
            }
        });
            
        
    }

    function closeMessage(){
        const messaContainer = document.querySelector(".emr-msg-box");
        if(messaContainer){
            messaContainer.style.display = 'none';
        }
    }

    function showMessage(message){
        const messaContainer = document.querySelector(".emr-msg-box");
        if(messaContainer){
            messaContainer.querySelector('.emr-msg').textContent = message;
            messaContainer.style.display = 'flex';
        }
    }
    
    function renderBoxInfo(cell, box, offsetTop , arrowBox, cellRect , parent) {
        if (!cell || !box || !arrowBox || !parent) return;
        try {
            const asinCell = cell.parentElement.querySelectorAll('td')[8];
            const asin = asinCell ? asinCell.textContent.trim() : null;
            if (asin && asin.length > 4) {
                const p = products.find(p => p.asin === asin);
                if (!p) return;
        
                const d = box.querySelector(".emr-box-item");
                if (d) {
                    d.querySelector(".emr-box-image a").setAttribute("href", p.ahref);
                    d.querySelector(".emr-box-image img").setAttribute("src", p.img);
                    d.querySelector(".emr-box-info .emr-box-title").textContent = p.title;
                    d.querySelector(".emr-box-info .emr-box-brand").textContent = p.brand;
                    d.querySelector(".emr-box-info .emr-box-date").textContent = formatShortDate(p.date);
                    d.querySelector(".emr-box-info .emr-box-bsr").textContent = cleanBsr(p.bsr);
                    d.querySelector(".emr-box-info .emr-box-bsr").style.cssText = getCssByBSR(p.bsr);
                    d.querySelector(".emr-box-info .emr-box-reviews").innerHTML = renderRating(p.ratings, p.reviews);
                    d.querySelector(".emr-box-info .emr-box-badge").innerHTML = badgeRender(p.badge);
                    d.querySelector(".emr-box-info .emr-box-price").textContent = p.price;
                    d.querySelector(".emr-box-info .emr-box-asin").textContent = p.asin;
                }
            }
        
            box.style.top = `${offsetTop}px`;
            box.style.display = 'flex';
            const tableheader = document.querySelector(".emr-header-table.emr-table")?.getBoundingClientRect();
            let arrowTop = (cellRect.top - parent.top) + (tableheader?.height || 50) + (cellRect.height / 2) - (arrowBox.clientHeight / 2);
            if(arrowTop > 670) arrowTop = arrowTop - 10;
            arrowBox.style.top = `${arrowTop}px`;
            arrowBox.style.display = 'block';
        } catch (error) {
          return  
        }
    }
    
    function handleScrollThrottled() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          start = Math.max(0, Math.floor(tableContainer.scrollTop / ROW_HEIGHT));
          renderVirtualizedList(tableContainer.scrollTop);
        }, 50);
    }
    
    function handleClickEvents(e) {
        const target = e.target;
      
        if (target.closest(".emr-deletes")) {
          const index = start + +target.closest(".emr-deletes").dataset.rowIndex;
          removeItemSmoothly(index);
          return;
        }
      
        if (target.closest(".emr-down-arts")) {
          openPopup(target.closest(".emr-down-arts").dataset.rowArts);
          return;
        }
      
        const copyIcon = target.closest("i.ri-file-copy-line");
        if (copyIcon) {
          try {
            const text = copyIcon.parentElement.querySelector("span")?.textContent?.trim();
            if (text) {
              navigator.clipboard.writeText(text);
              copyIcon.style.cssText = "color:green;font-size:20px";
              setTimeout(() => copyIcon.style.cssText = "font-size:20px", 1000);
            }
          } catch {}
        }
    }
           
    function setEventCsv() {
        try {
            document.getElementById("emr-csvFile").addEventListener("change", async e => {
                const f = e.target.files;
                if (!f?.length) return;
                try {
                    const r = await Promise.all([...f].map(file => new Promise((res, rej) => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            try {
                                const txt = e.target.result;
                                if (file.name.endsWith(".csv")) res(csvToArray(txt));
                                else if (file.name.endsWith(".json")) res(JSON.parse(txt));
                                else rej(`Unsupported file: ${file.name}`);
                            } catch (err) {
                                rej(`Parse error in file: ${file.name}`);
                            }
                        };
                        reader.onerror = rej;
                        reader.readAsText(file);
                    })));
                    r.forEach(d => products.push(...d));
                    renderVirtualizedList(tableContainer.scrollTop);
                    feedbacker.textContent =
                        `Total Products: ${filteredProducts.length || products.length}`;
                } catch (err) {
                    console.error("File read failed!", err);
                }
            });
        } catch (err) {
            console.error("CSV Event Error:", err);
        }
    }
    
    
    function deletePro() {
        products = [], filteredProducts = [], renderVirtualizedList(tableContainer.scrollTop);
        if (pool && typeof pool.forEach === "function") {
            pool.forEach(el => el.style.display = "none");
        }
        if (feedbacker) {
            feedbacker.textContent = `Products: ----`;
        }
    }
    
    async function runWinner() {
        if(!showStats) return;
        var t = document.querySelector(".emr.emr-item-container-row #emr-statistics");
        t && ("none" === window.getComputedStyle(t).display ? t.style.display = "flex" : t.style.display = "none")
    }
    function initFilterListeners() {
        const filterInputs = [
            "emr-minfDate",
            "emr-maxfDate",
            "emr-minBsr",
            "emr-maxBsr",
            "emr-minfReviews",
            "emr-maxfReviews",
            "emr-minfSales",
            "emr-maxfSales",
            "emr-minfPrice",
            "emr-maxfPrice",
            "emr-filter-term",
            "emr-exclude-term"
        ];

        filterInputs.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
        
            if (el.tagName === "INPUT" && el.type === "text" || el.type === "number") {
                // Live typing for text
                el.addEventListener("input", debounceFilter);
            } else {
                // Date/number/select — only when changed
                el.addEventListener("change", debounceFilter);
            }
        });
        
    }
    
    // Simple debounce to avoid running filter() on every keystroke instantly
    let filterTimer;
    async function debounceFilter() {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(async () => {
            // Wait for any ongoing filtering to finish
            await waitUntilFilteringDone();
            filter(); // call your existing filter() function
        }, 1500); // wait 1.5s after user stops typing/changing
    }

    
    // --- Update Filter Cache (Call when filters change) ---
    async function updateFilterCaches() {
        try {
            const get = id => document.getElementById(id)?.value || "";
    
            cachedMinDate = await customDate(get("emr-minfDate") || "01/01/2000", 1);
            cachedMaxDate = await customDate(get("emr-maxfDate") || "12/31/3000", 1);
    
            const minBsr = parseFloat(get("emr-minBsr"));
            cachedMinBsr = isNaN(minBsr) ? 0 : minBsr;
    
            const maxBsr = parseFloat(get("emr-maxBsr"));
            cachedMaxBsr = isNaN(maxBsr) ? 1e9 : maxBsr;
    
            const minReviews = parseFloat(get("emr-minfReviews"));
            cachedMinReviews = isNaN(minReviews) ? 0 : minReviews;
    
            const maxReviews = parseFloat(get("emr-maxfReviews"));
            cachedMaxReviews = isNaN(maxReviews) ? 1e9 : maxReviews;

            const minSales = parseFloat(get("emr-minfSales"));
            cachedMinSales = isNaN(minSales) ? 0 : minSales;
    
            const maxSales = parseFloat(get("emr-maxfSales"));
            cachedMaxSales = isNaN(maxSales) ? 1e9 : maxSales;
    
            const minPrice = parseFloat(get("emr-minfPrice"));
            cachedMinPrice = isNaN(minPrice) ? 0 : minPrice;
    
            const maxPrice = parseFloat(get("emr-maxfPrice"));
            cachedMaxPrice = isNaN(maxPrice) ? 300 : maxPrice;
    
            cachedFilterTerm = get("emr-filter-term").toUpperCase();
            const filterAllResults = document.querySelector("#emr-filterAll");
            if(filterAllResults && !filterAllResults.checked) miniReset();

            await delay(10);
    
        } catch (e) {
            console.error("updateFilterCaches error:", e);
        }
    }
    
    
    async function checkProduct(p) {
        try {

            if (!p) return;

            const minDate = cachedMinDate;
            const maxDate = cachedMaxDate;
            const minBsr = cachedMinBsr;
            const maxBsr = cachedMaxBsr;
            const minPrice = cachedMinPrice;
            const maxPrice = cachedMaxPrice;
            const minReviews = cachedMinReviews;
            const maxReviews = cachedMaxReviews;
            const minSales = cachedMinSales;
            const maxSales = cachedMaxSales;
            const filterTerm = cachedFilterTerm;
            
            const title = p.title?.toUpperCase() || "";
            const brand = p.brand?.toUpperCase() || "";
            const date = await customDate(p.date?.trim?.(), 0);
    
            // Helper to parse float safely preserving 0 values
            function safeParseFloat(str, fallback = NaN) {
                    if (!str) return fallback;
                    const num = parseFloat(str);
                    return isNaN(num) ? fallback : num;
            }
    
            // Parse price, bsr, reviews correctly:
            const priceRaw = p.price?.replace(/[^\d.]/g, "") || "";
            const price = safeParseFloat(priceRaw, 0);
    
            const bsrRaw = p.bsr === "N/A" ? NaN : (p.bsr?.replace(/[^\d.]/g, "") || "");
            const bsr = safeParseFloat(bsrRaw, NaN);
    
            const reviewsRawStr = p.reviews?.toString().trim() || "";
            const reviewsRaw = reviewsRawStr === "N/A" ? NaN : reviewsRawStr.replace(/[^\d.]/g, "");
            const reviews = safeParseFloat(reviewsRaw, NaN);
            const badgeRawStr = p.badge?.toString().trim() || "";
            const badgeRaw = badgeRawStr === "N/A" ? NaN : badgeRawStr.replace(/[^\d.]/g, "");
            const badge = safeParseFloat(badgeRaw, NaN);
    
            let keep = true;
    
            // Date range filter
            if ((minDate && +date < +minDate) || (maxDate && +date > +maxDate)) {
                keep = false;
            }
    
            // Keyword filter
            if (filterTerm && !title.includes(filterTerm) && !brand.includes(filterTerm)) {
                keep = false;
            }
    
            // Price range
            if ((isNaN(price) || price < minPrice || price > maxPrice) &&(minPrice !== 0 || maxPrice !== 300)) {
                keep = false;
            }
    
            // BSR range
            if ((isNaN(bsr) || bsr < minBsr || bsr > maxBsr) && (minBsr !== 0 || maxBsr !== 1e9)) {
                keep = false;
            }
    
            // Reviews range
            if (keep && (reviewsEnabled?.checked)){
                    if ((isNaN(reviews) || reviews < minReviews || reviews > maxReviews) && (minReviews !== 0 || maxReviews !== 1e9)) {
                            keep = false;
                     }
            }
            if (keep && (badgeEnabled?.checked)) {
                    if ((isNaN(badge) || badge < minSales || badge > maxSales) && (minSales !== 0 || maxSales !== 1e9)) {
                            keep = false;
                    }
            }

            if (keep) filteredProducts.push(p);
    
        } catch (err) {
            console.error("checkProduct error:", err);
        }
    }

    async function filter() {
    
        try {
            if (!Array.isArray(products) || products.length === 0) return;
    
            await updateFilterCaches();
    
            filteredProducts = [];
            isFiltering = true;
            const bannedText = document.querySelector("textarea#emr-exclude-term.emr-search-input")?.value || "";
            const bannedkeywords = [...new Set(bannedText.toUpperCase().split(",").map(t => t.trim()).filter(Boolean))];
    
            const minDate = cachedMinDate;
            const maxDate = cachedMaxDate;
            const minBsr = cachedMinBsr;
            const maxBsr = cachedMaxBsr;
            const minPrice = cachedMinPrice;
            const maxPrice = cachedMaxPrice;
            const minReviews = cachedMinReviews;
            const maxReviews = cachedMaxReviews;
            const minSales = cachedMinSales;
            const maxSales = cachedMaxSales;
            const filterTerm = cachedFilterTerm;
    
            let processedCount = 0;
    
            if (feedbacker) feedbacker.textContent = `Please wait...`;
    
            for (let i = 0; i < products.length; i++) {
                const p = products[i];
    
                try {
                    const title = p.title?.toUpperCase() || "";
                    const brand = p.brand?.toUpperCase() || "";
                    const date = await customDate(p.date?.trim?.(), 0);
    
                    // Helper to parse float safely preserving 0 values
                    function safeParseFloat(str, fallback = NaN) {
                        if (!str) return fallback;
                        const num = parseFloat(str);
                        return isNaN(num) ? fallback : num;
                    }
    
                    // Parse price, bsr, reviews correctly:
                    const priceRaw = p.price?.replace(/[^\d.]/g, "") || "";
                    const price = safeParseFloat(priceRaw, 0);
    
                    const bsrRaw = p.bsr === "N/A" ? NaN : (p.bsr?.replace(/[^\d.]/g, "") || "");
                    const bsr = safeParseFloat(bsrRaw, NaN);
    
                    const reviewsRawStr = p.reviews?.toString().trim() || "";
                    const reviewsRaw = reviewsRawStr === "N/A" ? NaN : reviewsRawStr.replace(/[^\d.]/g, "");
                    const reviews = safeParseFloat(reviewsRaw, NaN);
                    const badgeRawStr = p.badge?.toString().trim() || "";
                    const badgeRaw = badgeRawStr === "N/A" ? NaN : badgeRawStr.replace(/[^\d.]/g, "");
                    const badge = safeParseFloat(badgeRaw, NaN);
    
                    let keep = true;
    
                    // Date range filter
                    if ((minDate && +date < +minDate) || (maxDate && +date > +maxDate)) {
                        keep = false;
                    }
    
                    // Keyword filter
                    if (filterTerm && !title.includes(filterTerm) && !brand.includes(filterTerm)) {
                        keep = false;
                    }
    
                    // Price range
                    if ((isNaN(price) || price < minPrice || price > maxPrice) &&
                        (minPrice !== 0 || maxPrice !== 300)) {
                        keep = false;
                    }
    
                    // BSR range
                    if ((isNaN(bsr) || bsr < minBsr || bsr > maxBsr) &&
                        (minBsr !== 0 || maxBsr !== 1e9)) {
                        keep = false;
                    }
    
                    // Reviews range
                    if ((isNaN(reviews) || reviews < minReviews || reviews > maxReviews) &&
                        (minReviews !== 0 || maxReviews !== 1e9)) {
                        keep = false;
                    }
                    if ((isNaN(badge) || badge < minSales || badge > maxSales) &&
                        (minSales !== 0 || maxSales !== 1e9)) {
                        keep = false;
                    }
                    // Excluded words
                    const titleHasBanned = bannedkeywords.some(word => title.includes(word));
                    const brandHasBanned = bannedkeywords.some(word => brand.includes(word));
    
                    if (keep && !titleHasBanned && !brandHasBanned) {
                        filteredProducts.push(p);
                    }
    
                    // Yield to UI every 100 items
                    processedCount++;
                    if (processedCount === 100) {
                        await delay(10);
                        processedCount = 0;
                    }
    
                } catch (innerError) {
                    if (feedbacker) feedbacker.textContent = `Error: Double-check filters!`;
                    console.error("Filter processing error:", innerError);
                }
            }
            if (filteredProducts.length === 0) {
                if (pool && typeof pool.forEach === "function") {
                    pool.forEach(el => el.style.display = "none");
                }if (feedbacker) {
                    feedbacker.textContent = `0 Products found (Switch to all products - scroll up/down or click reset)`;
                    showMessage(`0 Products found!`)
                }
            }else{
                // Reset scroll and render filtered list
                tableContainer.scrollTop = 0;
                start = 0;
                renderVirtualizedList(0);
                if (feedbacker) {
                    feedbacker.textContent = `Filtered: ${filteredProducts.length} / Total: ${products.length}`;
                }
            }


            const filterAllResults = document.querySelector("#emr-filterAll");
            if(filterAllResults && !filterAllResults.checked && isRunning ) filterAllResults.checked = true;

        } catch (error) {
            if (feedbacker) feedbacker.textContent = `Something went wrong!`;
            console.error("Filter error:", error);
        }finally{
            isFiltering = false;
            if(containerProducts) renderVirtualizedList(tableContainer.scrollTop)
        }
    }
    
    
    async function customDate(t, n) {
        try {
            if (0 == n) try {
                const n = new Date(t);
                return `
                        ${n.getFullYear()}${(n.getMonth()+1).toString().padStart(2,"0")}${n.getDate().toString().padStart(2,"0")}`.replace(/[^\d\.]/g, "")
            } catch (t) {
                return 0
            }
            if (1 == n) return t.split("/")[2] + t.split("/")[0] + t.split("/")[1]
        } catch (t) {}
    }

    function miniReset() {
        filteredProducts = [];
        if (feedbacker) {
            feedbacker.textContent = `Total: ${products.length}`;
        }
        const filterAllResults = document.querySelector("#emr-filterAll");
        if(filterAllResults && filterAllResults.checked && isRunning ) filterAllResults.checked = false;
        renderVirtualizedList(tableContainer.scrollTop);
    }

    function reset() {
        filteredProducts = [];
        const fields = ["emr-minfDate", "emr-maxfDate","emr-minfReviews", "emr-maxfReviews","emr-minfSales", "emr-maxfSales","emr-minBsr", "emr-maxBsr", "emr-minfPrice", "emr-maxfPrice","emr-filter-term" ];
        fields.forEach(id => { const el = document.getElementById(`${id}`);
            if (el) {
                if ('value' in el) el.value = "";
                el.textContent = "";
            }
        });
        if (feedbacker) {
            feedbacker.textContent = `Total: ${products.length}`;
        }
        const filterAllResults = document.querySelector("#emr-filterAll");
        if(filterAllResults && filterAllResults.checked && isRunning ) filterAllResults.checked = false;
        renderVirtualizedList(tableContainer.scrollTop);
    }
    
    function filtersHandler() {
        const el = document.querySelector(".emr-loaderContainer .emr-filter-container");
        if (!el) return;
      
        const isOpen = el.classList.contains("emr-show-horizontal");
        if (isOpen) {
          el.classList.remove("emr-show-horizontal");
        } else {
          el.classList.add("emr-show-horizontal");
        }
    }
      
    function showWithAnimation(t) {
        t.classList.remove("emr-show"), setTimeout(() => {
            t.style.display = "none"
        }, 600)
    }
    
    async function loadHandler() {
        if (loadHandler.locked || isRunning) return pause(document.querySelector(".emr-multiload"));
        loadHandler.locked = true;
      
        let pageLimit = 0, delayCounter = 0;
        const startInput = document.querySelector("#emr-firstCount");
        const endInput = document.querySelector("#emr-lastCount");
        const excludeInput = document.querySelector("textarea#emr-exclude-term.emr-search-input");
        const multiLoadBtn = document.querySelector(".emr-loaderContainer .emr-multiload");
        const progressText = document.querySelector(".emr-loaderContainer p.emr-progress .emr-progressValue");
        const filterAllResults = document.querySelector("#emr-filterAll");
        const tableBody = document.querySelector("#emr-tableBody");
      
        let l = parseInt(startInput?.value) || 1;
        let m = parseInt(endInput?.value) || 10;
        if (l > m) return (loadHandler.locked = false);
      
        let perPageCount = metaData?.asinOnPageCount;
        if (!perPageCount) {
          perPageCount = (await getPageMetadata())?.asinOnPageCount || 48;
        }
      
        try {
          await delay(200);
          if (!isNaN(resultCounter)) {
            resultCounter = Math.abs(resultCounter);
            pageLimit = Math.ceil(resultCounter / perPageCount);
          }
          pageLimit ||= m;
      
          const excludeText = (excludeInput?.value || "").toUpperCase();
          bannedkeywords = [...new Set(excludeText.split(",").map(a => a.trim()).filter(Boolean))];
      
          multiLoadBtn.textContent = "Pause";
          isRunning = true;
          isPaused = false;
      
          const url = new URL(window.location.href);
          loadingImageSrc ||= await getImage("loading.gif");
      
          if (!tableBody.querySelector(".emr-notFound")) {
            const span = document.createElement("span");
            span.classList.add("emr-notFound");
            span.innerHTML = `<img style="width:40px;height:40px" src="${loadingImageSrc}"/>`;
            tableBody.appendChild(span);
          }
      
          if ((products?.length || 0) === 0) fetchedAsins = [];
          if ((productsToSave?.length || 0) === 0) fetchedAsins = [];

          if(filterAllResults?.checked) await updateFilterCaches();
          
          for (; l <= m && !isPaused && l <= pageLimit; l++) {
            if (delayCounter > 19) {
              await saveLoadedProducts();
              await delay(30000);
              delayCounter = 0;
            }
      
            url.searchParams.set("ref", `sr_pg_${l}`);
            url.searchParams.set("page", l);
            progressText.textContent = `${l}/${m}`;

            await multiPageLoader(url.href);
            renderVirtualizedList(tableContainer.scrollTop);

            tableBody.querySelector(".emr-notFound")?.remove();
            await delay(1000);
            delayCounter++;
          }
        } catch (err) {
          console.error("Load handler error:", err);
        } finally {
          await saveLoadedProducts();
          isRunning = false;
          isPaused = false;
          multiLoadBtn.textContent = "Load";
          multiLoadBtn.style.pointerEvents = "";
          if (startInput) startInput.value = (l > m ? m : l);
          loadHandler.locked = false;
          renderVirtualizedList(tableContainer.scrollTop);
        }
      }
      
        
    function pause(t) {
        isPaused = !0
    }

    async function waitUntilFilteringDone() {
        while (isFiltering) {
            await delay(1000); // Check every 1 s (adjust as needed)
        }
    }

    async function multiPageLoader(t) {
        const n = await loadAsins(t);
        const r = document.getElementById("emr-scanningSpeed").value;
        const a = {
            veryslow: 1,
            slow: 6,
            normal: 12,
            fast: 24,
            max: 60
        }[r] || 60;
    
        let i = 0;    // active loading count
        let l = 0;    // current ASIN index
    
        return new Promise((resolve) => {
            async function next() {
                if (l >= n.length) {
                    if (i === 0) resolve(true);
                    return;
                }
                const asin = n[l++];
                i++;
    
                // Wait until filtering done before starting to load
                await waitUntilFilteringDone();
    
                loadProductDataFor(asin)
                    .finally(async () => {
                        i--;
                        await delay(10); // let GC breathe
                        next();
                    });
            }
    
            // Start initial batch of concurrent loaders
            for (let j = 0; j < Math.min(a, n.length); j++) {
                next();
            }
        });
    }
    
    function closeHandler() {
        const t = document.querySelector("div.emr-loaderContainer");
        t && (t.classList.remove("emr-show"), setTimeout(() => {
            t.style.display = "none", document.body.style.overflow = "auto"
        }, 600))
    }
    
    function getProductItemTemplate() {
        if (!productItemTemplate) {
            const div = document.createElement("tr");
            div.className = "emr-item";
            div.style.position = "absolute";
            div.style.height = `${ROW_HEIGHT}px`;
            div.style.width = "100%";
            div.style.display = "none";
            div.innerHTML = `
                <td class="emr-cell emr-sticky-preview"><img src="" alt="Product Image" class="emr-preview-img"></td>
                <td class="emr-cell"><span><a href="#" target="_blank"></a></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell"><span></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell"><span></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell emr-bsr"><span class="emr-bsrVal"></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell"><span></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell"><span class="emr-reviewer"></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell"><span class="emr-badge"></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell"><span></span><i class="fas ri-file-copy-line"></i></td>
                <td class="emr-cell emr-sticky-action">
                    <span class="emr-external-link" style="cursor:pointer"><a href="#" target="_blank"><i class="fas ri-external-link-line"></i></a></span>
                    <span class="emr-down-arts" style="cursor:pointer"><i class="fas ri-download-2-line"></i></span>
                    <span class="emr-deletes" style="cursor:pointer"><i class="fas ri-close-circle-line"></i></span>
                </td>
            `;
            productItemTemplate = div;
        }
        return productItemTemplate.cloneNode(true);
    }
    
    function initPool() {
        const total = VISIBLE_ITEMS + BUFFER;
        const frag = document.createDocumentFragment();
    
        for (let i = 0; i < total; i++) {
            const item = getProductItemTemplate();
            pool.push(item);
            frag.appendChild(item);
        }
        containerProducts.appendChild(frag); // One DOM update instead of many
    }
    
    // Update data inside a single row
    function updateItemDom(item, product, index) {
        item.style.top = `${index * ROW_HEIGHT}px`;
    
        const cells = item.querySelectorAll(".emr-cell");
    
        const img = cells[0].querySelector("img");
        img.src = product.img;
        img.alt = product.title || '';
    
        const titleLink = cells[1].querySelector("a");
        titleLink.textContent = product.title;
        titleLink.href = product.ahref;
    
        cells[2].querySelector("span").textContent = product.brand;
        cells[3].querySelector("span").textContent = formatShortDate(product.date);
        cells[4].querySelector("span").textContent = cleanBsr(product.bsr);
        cells[4].querySelector("span").style.cssText = getCssByBSR(product.bsr);
        cells[5].querySelector("span").textContent = product.price;
        cells[6].querySelector("span").innerHTML = renderRating(product.ratings, product.reviews);
        cells[7].querySelector("span").innerHTML = badgeRender(product.badge);
        cells[8].querySelector("span").textContent = product.asin;
    
        const actionsCell = cells[9];
        actionsCell.querySelector(".emr-external-link a").href = product.ahref ||'';
        actionsCell.querySelector(".emr-deletes").dataset.rowIndex = index - start;
        actionsCell.querySelector(".emr-down-arts").dataset.rowArts = product.img;
    }
    
    function badgeRender(badge) {
        return (typeof badge === 'number' && !isNaN(badge)) ? `${badge}+` : "N/A";
    }
    
    function renderRating(rating, reviewsCount) {
        try {
            rating = isNaN(parseFloat(rating)) ? 0 : parseFloat(rating);
            reviewsCount = isNaN(parseInt(reviewsCount)) ? 0 : parseInt(reviewsCount);
            rating = Math.max(0, Math.min(5, rating));
            const roundedRating = Math.round(rating * 2) / 2;
        
            let starsHTML = "";
            for (let i = 1; i <= 5; i++) {
            if (roundedRating >= i) {
                starsHTML += `<span class="emr-full">★</span>`;
            } else if (roundedRating + 0.5 === i) {
                starsHTML += `<span class="emr-half">★</span>`;
            } else {
                starsHTML += `<span>★</span>`;
            }
            }
        
            const formattedReviews = reviewsCount.toLocaleString();
            return `<span class="emr-reviews-count">(${formattedReviews})</span><span class="emr-star-rating">${starsHTML}</span>`;
        } catch (error) {
            return 'N/A';
        }
    }
    
    function getCssByBSR(bsr) {
      if (bsr == null || bsr === "N/A" || isNaN(Number(bsr))) return "color:#000; background:none";
      const value = Number(bsr);
      if (value <= 1000000) return "color:#fff; background:rgb(31 98 143)";
      return "color:#fff; background:rgb(158, 158, 158)";
    }
    
    
    function renderVirtualizedList(scrollTop = 0) {
        if (isRendering) return;
        isRendering = true;
    
        const list = filteredProducts.length ? filteredProducts : products;
        const totalItems = list.length;
    
        // No items to show
        if (totalItems === 0) {
            emrSpacer.style.height = "0px";
            pool.forEach(el => el.style.display = "none");
            isRendering = false;
            return;
        }
    
        // First time or container cleared: reinitialize
        if (!containerProducts.hasChildNodes() || pool.length === 0) {
            initializePool();
        }
    
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
        const endIndex = Math.min(totalItems, startIndex + pool.length);
    
        // Update spacer height
        emrSpacer.style.height = `${totalItems * ROW_HEIGHT}px`;
    
        // Render visible items
        for (let i = 0; i < pool.length; i++) {
            const itemIx = startIndex + i;
            const item = pool[i];
    
            if (itemIx < totalItems) {
                updateItemDom(item, list[itemIx], itemIx);
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        }
    
        isRendering = false;
    }
    
    function initializePool() {
        if(!tableContainer) tableContainer = document.getElementById("emr-tableContainer");
        const viewHeight = tableContainer.clientHeight;
        VISIBLE_ITEMS = Math.ceil(viewHeight / ROW_HEIGHT);
    
        containerProducts.innerHTML = "";
        pool.length = 0;
    
        initPool(); // Your existing function to fill pool
    }
    
    
    // Recalculate number of visible items and re-init pool
    function updateVisibleCount() {
        if(!tableContainer) tableContainer = document.getElementById("emr-tableContainer");
        const viewHeight = tableContainer.clientHeight;
        VISIBLE_ITEMS = Math.ceil(viewHeight / ROW_HEIGHT);
        containerProducts.innerHTML = "";
        pool.length = 0;
        initPool();
        renderVirtualizedList(tableContainer.scrollTop);
    }
    
    // Resize observer
    window.addEventListener("resize", () => {
        if(!tableContainer) return;
        updateVisibleCount();
    });
    
    // Initialize system once products are loaded
    function startVirtualization() {
        updateVisibleCount(); // creates pool and renders first view
    }
    
    class Product {
        constructor(t, n, m, a, i, l, o, s, u,r,x,b) {
            this.title = this.cleanString(t), 
            this.date = this.cleanString(a), 
            this.asin = this.cleanString(l), 
            this.bsr = this.cleanString(i), 
            this.ahref = this.cleanString(n), 
            this.img = this.cleanString(m), 
            this.price = this.cleanString(o), 
            this.brand = this.cleanString(s), 
            this.competition = this.cleanString(u),
            this.reviews = this.cleanString(r),
            this.ratings = this.cleanString(x),
            this.badge = this.cleanString(b);         
        }
        cleanString(t) {
            return "string" == typeof t ? t.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B\u200C\u2028\u2029]/g, "").normalize("NFC") : t
        }
    }

    async function loadAsins(t) {
        const n = new Set;
        t = await cleanContentForLoader(t, 1);
        let r = parseHtml(t);
        return r.querySelectorAll(".s-result-item.s-asin").forEach(t => {
            (t = t.getAttribute("mama-asin")) && 4 < t.length && !fetchedAsins.includes(t) && n.add(t)
        }), r.documentElement.innerHTML = '', t = null, r = null, Array.from(n)
    }

    async function loadProductDataFor(t) {
        let n = await cleanContentForLoader(t, 0);
        n && "undefined" !== n && loadProductDetails(n, t), n = null
    }
    
    async function loadProductDetails(t,n){
        try{
          const r = extractProductForLoader(t,n);
          if(!r)return;
          const a=document.querySelector("#emr-filterAll")?.checked||false,
                p=!a||!bannedkeywords.some(k=>r.title?.toUpperCase().includes(k)||r.brand?.toUpperCase().includes(k)),
                v=r.brand!=="N/A"||r.bsr!=="N/A"||r.date!=="N/A";
          if(v){
            products.push(r);
            productsToSave.push(r);
            fetchedAsins.push(r.asin);
            if(p && a) checkProduct(r);
              
            if (filteredProducts.length !== 0) {
                  if (feedbacker) feedbacker.textContent = `Filtred: ${filteredProducts.length} Total: ${products.length}`;
              }else{
                if(feedbacker) feedbacker.textContent=`Products: ${products.length}`;
            }
            
          }
        }catch(e){console.error("loadProductDetails",e)}
    } 
    
    function bsrNumber(t) {
        try {
            const cleaned = (t || "").toString().replace(/[^\d]/g, "");
            const num = parseInt(cleaned, 10);
            return isNaN(num) ? null : num;
        } catch (e) {
            console.error("bsrNumber error:", e);
            return null;
        }
    } 

    function sortProducts(a) {
        ordera = "asc" === ordera ? "desc" : "asc", a.includes("best sellers") ? sortProductsAndUpdateDOM("bsr+date", ordera) : a.includes("bsr") ? sortProductsAndUpdateDOM("bsr", ordera) : a.includes("date") ? sortProductsAndUpdateDOM("date", ordera) : a.includes("ads") ? sortProductsAndUpdateDOM("ads", ordera) : sortProductsAndUpdateDOM("price", ordera)
    }
    
    function sortProductsAndUpdateDOM(sortBy, direction = "asc") {
        if (!["bsr", "date", "price", "bsr+date", "ads"].includes(sortBy)) return;
        if (isSortingMain) return;
    
        isSortingMain = true;
    
        try {
            const isAscending = direction === "asc";
            const products = Object.values(productHTMLMap);
            if (products.length === 0) return;
    
            // --- Precompute parsed values for performance ---
            products.forEach(p => {
                p._bsr = parseBSR(p.bsr);
                p._price = parsePrice(p.price);
                p._date = parseDate(p.date);
            });
    
            // --- Sorting ---
            if (sortBy === "bsr+date") {
                products.sort((a, b) => {
                    const bsrA = a._bsr;
                    const bsrB = b._bsr;
                    const hasBSR_A = bsrA !== null;
                    const hasBSR_B = bsrB !== null;
    
                    // Products with BSR come first
                    if (hasBSR_A && !hasBSR_B) return -1;
                    if (!hasBSR_A && hasBSR_B) return 1;
    
                    // Both have BSR: sort by date (most recent first if asc), then by BSR
                    if (hasBSR_A && hasBSR_B) {
                        const dateA = a._date;
                        const dateB = b._date;
                        const hasDateA = dateA !== null;
                        const hasDateB = dateB !== null;
    
                        if (hasDateA && hasDateB && dateA !== dateB) {
                            return isAscending ? dateB - dateA : dateA - dateB;
                        }
                        // fallback to BSR if dates equal or missing
                        return isAscending ? bsrA - bsrB : bsrB - bsrA;
                    }
    
                    // Neither has BSR: optionally sort by date descending or keep order
                    const dateA = a._date;
                    const dateB = b._date;
                    if (dateA !== null && dateB !== null) {
                        return isAscending ? dateB - dateA : dateA - dateB;
                    }
                    return 0;
                });
    
            } else if (sortBy === "bsr") {
                products.sort((a, b) => compareValues(a._bsr, b._bsr, isAscending));
    
            } else if (sortBy === "price") {
                products.sort((a, b) => compareValues(a._price, b._price, isAscending));
    
            } else if (sortBy === "date") {
                products.sort((a, b) => compareValues(a._date, b._date, isAscending));
            }
    
            // --- Filter ads ---
            const resultEls = document.querySelectorAll(".s-result-item.s-asin[role='listitem']");
            if (sortBy === "ads") {
                resultEls.forEach(el => {
                    const isAd = el.className.includes("AdHolder");
                    el.style.display = (isAscending && isAd) || (!isAscending && !isAd) ? "" : "none";
                });
                return;
            }
    
            // --- Update DOM ---
            for (let i = 0; i < products.length; i++) {
                if (products[i].html && resultEls[i]) {
                    resultEls[i].outerHTML = products[i].html;
                }
            }
    
        } catch (err) {
            console.error("Error in sortProductsAndUpdateDOM:", err);
        } finally {
            isSortingMain = false;
        }
    
        // --- Helper functions ---
    
        function parseBSR(val) {
            if (val == null || val === "N/A") return null;
            const n = Number(String(val).replace(/[^\d]/g, ""));
            return isNaN(n) ? null : n;
        }
    
        function parsePrice(val) {
            if (val == null || val === "N/A") return null;
            const n = Number(String(val).replace(/[^0-9.]/g, ""));
            return isNaN(n) ? null : n;
        }
    
        function parseDate(val) {
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d.getTime();
        }
    
        function compareValues(aVal, bVal, asc) {
            const aMissing = aVal === null;
            const bMissing = bVal === null;
            if (aMissing && bMissing) return 0;
            if (aMissing) return 1;
            if (bMissing) return -1;
            return asc ? aVal - bVal : bVal - aVal;
        }
    }  
    
    function reorder(t) {
        ordera = "asc" == ordera ? "desc" : "asc", t.includes("best sellers") ? sortLoadedProducts("bsr+date") : t.includes("bsr") ? sortLoadedProducts("bsr", ordera) : t.includes("date") ? sortLoadedProducts("date", ordera) : t.includes("reviews") ? sortLoadedProducts("reviews", ordera) : t.includes("badge") ? sortLoadedProducts("badge", ordera) : sortLoadedProducts("price", ordera)
    }
  
    function sortLoadedProducts(sortKey, order = "asc") {
        if (isSorting) return;
    
        const isAscending = order === "asc";
        const VALID_SORT_KEYS = ["bsr", "date", "price", "bsr+date", "reviews","badge"];
    
        const list = filteredProducts.length === 0 ? products : filteredProducts;
        if (!Array.isArray(list) || list.length === 0 || !VALID_SORT_KEYS.includes(sortKey)) return;
    
        // Precompute values for performance
        list.forEach(item => {
            item._bsr = parseNumber(item.bsr);
            item._date = parseDate(item.date);
            item._price = parseNumber(item.price);
            item._reviews = parseNumber(item.reviews);
            item._badge = parseNumber(item.badge);
        });
    
        isSorting = true;
    
        try {
            const getComparableValue = (item, key) => {
                switch (key) {
                    case "date": return item._date;
                    case "reviews": return item._reviews;
                    case "price": return item._price;
                    case "bsr": return item._bsr;
                    case "badge": return item._badge;
                    default: return null;
                }
            };
    
            list.sort((a, b) => {
                if (sortKey === "bsr+date") {
                    const bsrA = a._bsr;
                    const bsrB = b._bsr;
                    const hasBSR_A = bsrA !== null;
                    const hasBSR_B = bsrB !== null;
    
                    if (hasBSR_A && !hasBSR_B) return -1;
                    if (!hasBSR_A && hasBSR_B) return 1;
    
                    const dateA = a._date;
                    const dateB = b._date;
                    const hasDateA = dateA !== null;
                    const hasDateB = dateB !== null;
    
                    if (hasDateA && hasDateB && dateA !== dateB) {
                        return isAscending ? dateB - dateA : dateA - dateB;
                    }
                    if (hasDateA && !hasDateB) return -1;
                    if (!hasDateA && hasDateB) return 1;
    
                    if (hasBSR_A && hasBSR_B && bsrA !== bsrB) {
                        return isAscending ? bsrA - bsrB : bsrB - bsrA;
                    }
                    return 0;
                }
    
                const valA = getComparableValue(a, sortKey);
                const valB = getComparableValue(b, sortKey);
    
                if (valA !== null && valB === null) return -1;
                if (valA === null && valB !== null) return 1;
                if (valA === null && valB === null) return 0;
    
                return isAscending ? valA - valB : valB - valA;
            });
    
            if (filteredProducts.length === 0) {
                products = list;
            } else {
                filteredProducts = list;
            }
    
            renderVirtualizedList(tableContainer.scrollTop);
        } catch (e) {
            console.error("Error in sortLoadedProducts:", e);
        } finally {
            isSorting = false;
        }
    
        // --- Helpers ---
        function parseNumber(val) {
            if (typeof val !== "string" && typeof val !== "number") return null;
            const cleaned = val.toString().replace(/[^0-9.]/g, "");
            if (!cleaned) return null;
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        }
    
        function parseDate(val) {
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : date.getTime();
        }
    }
    
    function removeItemSmoothly(index) {
        const item = pool[index - start];
        if (!item || index < 0) return;
      
        const usingFiltered = filteredProducts.length > 0;
        const dataList = usingFiltered ? filteredProducts : products;
      
        if (index >= dataList.length) return;
      
        const removedProduct = dataList[index]; // ✅ Get the right item
        item.classList.add("emr-fade-left");
      
        setTimeout(() => {
          // Remove from the currently visible list
          dataList.splice(index, 1);
      
          // Also remove from the main `products` list if present
          const mainIndex = products.findIndex(p => p.asin === removedProduct.asin);
          if (mainIndex > -1) {
            products.splice(mainIndex, 1);
          }
      
          // If filteredProducts active, remove from it as well (if not already done)
          if (usingFiltered) {
            const fIndex = filteredProducts.findIndex(p => p.asin === removedProduct.asin);
            if (fIndex > -1) {
              filteredProducts.splice(fIndex, 1);
            }
          }
      
          item.classList.remove("emr-fade-left");
          renderVirtualizedList(tableContainer.scrollTop);
        }, 300);
    }
      
    function creatStatsBox(imgSrc) {
        try {
            if(!showStats) return;
            const statValues = {
                successRate: `<img src="${imgSrc}"/>`,
                productsWithSales: `<img src="${imgSrc}"/>`,
                averageBsr: `<img src="${imgSrc}"/>`,
                averagePrice: `<img src="${imgSrc}"/>`
            };
    
            const recommendationValues = {
                recommendation: `<img src="${imgSrc}"/>`
            };
    
            const frag = document.createDocumentFragment();
            const statsContainer = document.createElement("div");
            statsContainer.className = "emr-statistics-container emr-row";
    
            // === Chart Section ===
            const charts = document.createElement("div");
            charts.className = "emr-charts-container";
    
            const chartTitle = document.createElement("span");
            chartTitle.className = "emr-stats-title";
            chartTitle.style.textAlign = "center";
            chartTitle.textContent = "Products Based On BSRs";
    
            const chartHolder = document.createElement("div");
            chartHolder.id = "emr-chart-container";
    
            const canvas = document.createElement("canvas");
            canvas.id = "emr-myChart";
            chartHolder.appendChild(canvas);
            charts.appendChild(chartTitle);
            charts.appendChild(chartHolder);
    
            // === Stats Details Column ===
            const detailsColumn = document.createElement("div");
            detailsColumn.className = "emr-stats-details emr-column";
    
            // === Niche Details ===
            const nicheDetails = document.createElement("div");
            nicheDetails.id = "emr-niche-details";
    
            const nicheTitle = document.createElement("span");
            nicheTitle.className = "emr-stats-sorts";
            nicheTitle.textContent = "Niche Details :";
    
            const nicheList = document.createElement("ul");
            for (const key in statValues) {
                const li = document.createElement("li");
                li.className = `emr-${key.toLowerCase().trim().replace(/\s+/g, "-")}`;
                const label = key.replace(/([A-Z])/g, " $1").trim();
                li.innerHTML = `${label}: <span class="emr-value">${statValues[key]}</span>`;
                nicheList.appendChild(li);
            }
            nicheDetails.appendChild(nicheTitle);
            nicheDetails.appendChild(nicheList);
    
            // === Recommendation Section ===
            const recDetails = document.createElement("div");
            recDetails.id = "emr-rec-details";
    
            const recTitle = document.createElement("span");
            recTitle.className = "emr-stats-sorts";
            recTitle.textContent = "Recommendation :";
    
            const recList = document.createElement("ul");
            for (const key in recommendationValues) {
                const li = document.createElement("li");
                li.className = `emr-${key.toLowerCase().replace(" ", "-")}`;
                const label = key.replace(/([A-Z])/g, " $1").trim();
                li.innerHTML = `${label}: <span class="emr-value">${recommendationValues[key]}</span>`;
                recList.appendChild(li);
            }
            recDetails.appendChild(recTitle);
            recDetails.appendChild(recList);
    
            // Combine sections
            detailsColumn.appendChild(nicheDetails);
            detailsColumn.appendChild(recDetails);
            statsContainer.appendChild(charts);
            statsContainer.appendChild(detailsColumn);
            frag.appendChild(statsContainer);
    
            // Attach to DOM
            const statsTarget = document.querySelector(".emr.emr-item-container-row #emr-statistics");
            statsTarget.appendChild(frag);
    
            // Render chart
            createChart();
        } catch (err) {
            console.error(err);
        }
    }

    let countsCache = Array(bsrRanges.length).fill(0);

    function updateCounts() {
        countsCache.fill(0);
        searchProducts.forEach(p => {
            const bsr = Number(p.bsr);
            if (isNaN(bsr)) return;
            bsrRanges.forEach((r, i) => {
                if (bsr >= r.min && bsr <= r.max) {
                    countsCache[i]++;
                }
            });
        });
    }

    function getCountsByRange() {
        return countsCache;
    }

    function destroyChartIfExists() {
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
    }

    function createChart() {
        try {
            const ctx = document.getElementById("emr-myChart")?.getContext("2d");
            if (!ctx) return;
            destroyChartIfExists();
            myChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: bsrRanges.map(r => r.label),
                    datasets: [{
                        label: "Products",
                        data: getCountsByRange(),
                        backgroundColor: bsrRanges.map(r => r.color + "33"), // add alpha for transparency
                        borderColor: bsrRanges.map(r => r.color),
                        borderWidth: 1
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    },
                    interaction: { mode: "index", axis: "x", intersect: false },
                    plugins: {
                        tooltip: {
                            enabled: true,
                            callbacks: { label: ctx => "Products: " + ctx.raw }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Failed to create chart:", e);
        }
    }

    function updateChartData() {
        updateCounts();
        if (myChart) {
            myChart.data.datasets[0].data = getCountsByRange();
            myChart.update();
        }
    }

    async function updateStats() {
        try {
            if (!searchProducts || searchProducts.length === 0) return false;
            if (searchProducts.length <= 200) {
                updateCounts();
                await delay(100);
                createChart();
                await delay(100);
                updateChartData();
                await delay(100);
                const nicheData = validateNiche();
                await delay(100);
                updateNicheDetail(nicheData);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error in updateStats:", e);
            return false;
        }
    }
      
    function updateNicheDetail(t) {
        try {
            const q = s => document.querySelector(s),
                  v = (el, val) => el && (el.textContent = val),
                  total = parseInt(q(".emr-msg b.emr-resultProduct")?.textContent.split("/")[0] || 48, 10);
    
            v(q(".emr-successrate .emr-value"), t.nicheScore + "%");
            v(q(".emr-productswithsales .emr-value"), `${t.soldProducts}/${total}`);
            v(q(".emr-averagebsr .emr-value"), (+t.averageBsr).toLocaleString());
            v(q(".emr-averageprice .emr-value"), `${t.priceCurrency}${t.averagePrice}`);
            v(q(".emr-recommendation .emr-value"), t.nicheViability);
        } catch (e) {
            console.error("Niche update failed:", e);
        }
    }
    
    function validateNiche() {
        try {
            const el = document.querySelector(".emr-msg b.emr-resultProduct"),
                  txt = el?.textContent.trim() || "48/200000",
                  [soldRaw, avgRaw] = txt.split("/"),
                  sold = parseInt(soldRaw.trim(), 10) || 48,
                  avgBSR = bsrNumber(avgRaw) || 200000;
    
            const bsrs = [],
                  prices = [];
            let priceSymbol = "";
    
            for (const p of searchProducts) {
                // Parse BSR
                const rawBSR = (p.bsr || "").toString().replace(/\D/g, "");
                const bsr = parseInt(rawBSR, 10);
                if (!isNaN(bsr) && bsr > 0) bsrs.push(bsr);
    
                // Parse Price
                const m = (p.price || "").trim().match(/^([\$\u20ac\u00a3])?(\d+(?:\.\d{1,2})?)$/);
                if (m) {
                    if (!priceSymbol && m[1]) priceSymbol = m[1];
                    prices.push(`${m[1] || ""}${parseFloat(m[2])}`);
                } else {
                    prices.push("N/A");
                }
            }
    
            const bsr = calculateBsrScore(bsrs),
                  price = calculatePriceScore(prices, sold),
                  comp = avg => avg <= 100 ? 100 : avg <= 200 ? 90 : avg <= 400 ? 80 : avg <= 600 ? 50 : avg <= 1000 ? 40 : avg <= 2000 ? 20 : avg <= 3000 ? 0 : -100,
                  score = 0.4 * comp(avgBSR) + 0.4 * bsr.score + 0.1 * bsr.validCountScore + 0.1 * price.score;
    
            return {
                competitionScore: comp(avgBSR),
                bsrScore: bsr.score,
                priceScore: price.score,
                nicheScore: Math.min(100, Math.max(0, score)),
                averageBsr: bsr.average,
                soldProducts: bsr.validCount,
                averagePrice: price.average,
                priceCurrency: price.currencySymbol || priceSymbol,
                nicheViability: score >= 90 && bsr.average > 0 ? "Great Niche" :
                                score >= 50 && bsr.average > 0 ? "Good Niche" :
                                "Needs More Research"
            };
        } catch (e) {
            console.error("validateNiche error:", e);
        }
    }
      
    function calculateBsrScore(arr) {
        try {
            if (!Array.isArray(arr)) return { score: 0, average: 0, validCount: 0, validCountScore: 0 };
    
            const valid = arr.map(Number).filter(n => !isNaN(n) && n > 0);
            const total = valid.reduce((sum, n) => sum + n, 0);
            const avg = valid.length > 0 ? total / valid.length : 0;
    
            const score =
                avg <= 200_000 ? 100 :
                avg <= 400_000 ? 75 :
                avg <= 800_000 ? 50 :
                avg <= 2_400_000 ? 25 :
                avg <= 3_500_000 ? 5 :
                0;
    
            const count = valid.length;
            const countScore =
                count >= 47 ? 100 :
                count >= 30 ? 90 :
                count >= 20 ? 70 :
                count >= 10 ? 50 :
                count >= 5 ? 25 :
                count >= 1 ? 10 :
                0;
    
            return {
                score,
                average: Math.round(avg * 100) / 100,
                validCount: count,
                validCountScore: countScore
            };
        } catch (e) {
            console.error("calculateBsrScore error:", e);
            return { score: 0, average: 0, validCount: 0, validCountScore: 0 };
        }
    }
    
    function calculatePriceScore(arr, total) {
        try {
            if (!Array.isArray(arr)) return { score: 0, average: 0, currencySymbol: "" };
    
            let symbol = "";
            const prices = [];
    
            for (const str of arr) {
                if (typeof str !== "string") continue;
                const m = str.trim().match(/^([\$\u20ac\u00a3])?(\d+(?:\.\d{1,2})?)$/);
                if (m) {
                    if (!symbol && m[1]) symbol = m[1];
                    const value = parseFloat(m[2]);
                    if (!isNaN(value) && value > 0) prices.push(value);
                }
            }
    
            const totalSum = prices.reduce((sum, n) => sum + n, 0);
            const avg = prices.length > 0 ? totalSum / prices.length : 0;
    
            const score =
                avg > 19.99 ? 100 :
                avg > 16.99 ? 75 :
                avg > 13.99 ? 50 :
                0;
    
            return {
                score,
                average: Math.round(avg * 100) / 100,
                currencySymbol: symbol
            };
        } catch (e) {
            console.error("calculatePriceScore error:", e);
            return { score: 0, average: 0, currencySymbol: "" };
        }
    }
    
    function exportProducts() {
        var t = 0 === filteredProducts.length ? products : filteredProducts;
        if (Array.isArray(t) && 0 !== t.length) {
            t = JSON.stringify(t, null, 2), t = new Blob([t], {
                type: "application/json"
            });
            var n = document.createElement("a");
            n.href = URL.createObjectURL(t), n.download = "products.json", document.body.appendChild(n), n.click(), document.body.removeChild(n)
        }
    }

    async function openPopup(t) {
        const n = t.split("https://m.media-amazon.com/images/I/")[1];
        let r = null,
            l = null;
        if (n) {
            const t = n.split("%7C");
            r = t.find(t => t.endsWith(".png") || t.endsWith(".jpg")), l = "https://m.media-amazon.com/images/I/" + r
        } else return void alert("Invalid Image URL");
        if (document.querySelector(".emr_popup")) return;
        const a = document.createElement("div");
        a.classList.add("emr_popup","emr-glow-border");
        const o = document.createElement("button");
        o.className = "emr-popup-close emr-closer", o.innerHTML = `<i class="ri-close-large-fill"></i>`, o.onclick = () => a.remove();
        const s = document.createElement("div");
        s.className = "emr-popup-right", s.innerHTML = `
                <label for="emr-bgColor">Background Color:</label>
                <input type="color" id="emr-bgColor" value="#000000">
                <div class="emr-color-grid" id="emr-colorGrid"></div>
                <div id="emr-selectedColor" style="display:none">No color selected</div>
                <label for="emr-scale"></label>
                <input type="range" id="emr-scale" min="1" max="100" value="10">
                <input type="button" id="emr-downl" value="Download">
            `;
        const u = document.createElement("div");
        u.className = "emr-popup-left", u.id = "emr-imageArea", u.innerHTML = `<img id="emr-popupImage" src="${l}" alt="Preview Image">`, a.appendChild(o), a.appendChild(u), a.appendChild(s), document.body.appendChild(a), s.querySelector("#emr-bgColor").addEventListener("change", t => {
            u.style.backgroundColor = t.target.value
        });
        const p = document.getElementById("emr-colorGrid"),
            i = document.getElementById("emr-selectedColor");
        [{
            name: "White",
            hex: "#FFFFFF"
        }, {
            name: "Navy",
            hex: "#1A1F71"
        }, {
            name: "Dark Heather",
            hex: "#4B4F56"
        }, {
            name: "Orange",
            hex: "#FFA500"
        }, {
            name: "Pink",
            hex: "#FFC0CB"
        }, {
            name: "Purple",
            hex: "#800080"
        }].forEach(t => {
            const n = document.createElement("div");
            n.className = "emr-color-btn", n.style.backgroundColor = t.hex, n.dataset.color = t.name, n.title = t.name, n.addEventListener("click", () => {
                document.querySelectorAll(".emr-color-btn").forEach(t => t.classList.remove("emr-selected")), n.classList.add("emr-selected"), u.style.backgroundColor = t.hex
            }), p.appendChild(n)
        }), s.querySelector("#emr-downl").addEventListener("click", async () => {
            if (l) try {
                const t = await fetch(l),
                    n = await t.blob(),
                    i = document.createElement("a");
                i.href = URL.createObjectURL(n), i.download = r, document.body.appendChild(i), i.click(), document.body.removeChild(i), setTimeout(() => URL.revokeObjectURL(i.href), 100)
            } catch {
                alert("Failed to download the image.")
            } else alert("Invalid URL")
        }), s.querySelector("#emr-scale").addEventListener("input", t => {
            const n = t.target.value;
            u.querySelector("img").style.transform = `scale(${n/10})`
        });
        let m = !1,
            y = 0,
            S = 0,
            C = 0,
            M = 0;
        u.addEventListener("click", t => {
            m = !m, u.style.cursor = m ? "grabbing" : "default", m && (y = t.pageX, S = t.pageY, C = u.scrollLeft, M = u.scrollTop)
        }), u.addEventListener("mousemove", t => {
            if (m) {
                const n = t.pageX - y,
                    r = t.pageY - S;
                u.scrollLeft = C - n, u.scrollTop = M - r
            }
        })
    }
    async function downloadDesin(t, n) {
        t.addEventListener("click", async function() {
            if (n) try {
                const t = await fetch(n),
                    r = await t.blob(),
                    a = document.createElement("a");
                a.href = URL.createObjectURL(r), a.download = imageFilename, document.body.appendChild(a), a.click(), document.body.removeChild(a), setTimeout(() => URL.revokeObjectURL(a.href), 100)
            } catch (t) {
                alert("Failed to download the image.")
            } else alert("Invalid URL")
        })
    }
    function errorCheck() {
            return new Promise(t => {
                chrome.runtime.sendMessage({
                    action: "gls"
                }, n => {
                    t(n?.active || !1)
                })
            })
    }
    
    async function getPageMetadata(html, mode) {
        let data = null;
        // MOde === 0  means this page, mode === 1 means passed html
        if(mode === 1){
            data = parseHtml(html);
        }else if(mode === 0){
            data = document;
        }
        if(!data) return null;
        const s = data.scripts,r = [], k = /P\.declare\('s\\-metadata',\s*(\{[\s\S]*?\})\);/;
        for (let i = 0; i < s.length; i++) {
            const t = s[i];
            if (t.src) continue;
            const h = t.innerHTML || "";
            if (!h.includes("totalResultCount") || !h.includes("s\\-metadata")) continue;
            const m = k.exec(h.slice(0, 10000));
            if (m) try {
                const j = JSON.parse(m[1].replace(/\\-/g, "-"));
                if (j.totalResultCount && j.asinOnPageCount && j.page) r.push({
                    totalResultCount: j.totalResultCount,
                    asinOnPageCount: j.asinOnPageCount,
                    page: j.page,
                    raw: j
                })
            } catch {}
            await delay(10)
        }
        if (mode === 1 && html && typeof html === 'object') {
            try {
                html.documentElement.innerHTML = '';
            } catch {}
            html = null;
        }
        return r.length ? r.sort((a, b) => b.totalResultCount - a.totalResultCount)[0] : null
    }
    
    /// Loader helpers
    
    function extractProductForLoader(t, n) {
        try {
            if(!t) return null;
            let r = parseHtml(t), a = `${domainUrl}dp/${n}`; /^https?:\/\//i.test(a) || (a = `https://${a}`);
            let len = getAmazonLanguage(r);
            let i = safeValue(extractTitle(r)),
                o = safeValue(extractSrc(r)),
                s = safeValue(extractDetailText(r, "Date", len)),
                u = safeValue(extractDetailText(r, "Best Sellers", len)),
                p = safeValue(cleanString(n)),
                m = safeValue(extractPrice(r)),
                y = safeValue(extractDetailText(r, "Manufacturer", len)),
                b = safeValue(extractBadge(r)),
                re = safeValue(extractReviews(r)),
                ra = safeValue(extractRatings(r));
            return r.documentElement.innerHTML = '', r = null, new Product(i, a, o, s, u, p, m, y, "N/A",re,ra,b)
        } catch (t) {
            console.error("Error extracting product info.", t)
        }
        return null
    }

    function extractBadge(r) {
        try {
            if (!badgeEnabled?.checked) return 'N/A'; // ⬅ Only extract if enabled
            const element = r.querySelector('#social-proofing-faceout-title-tk_bought .a-text-bold');
            if (!element) return null;
    
            const text = element.textContent.trim().replace(/\s+/g, ''); // Normalize spaces
            let number = 0;
    
            // Handle formats: "200+", "1.5K+", "10K+", "1M+", "1Tsd."
            const match = text.match(/([\d.,]+)\+?\s*(K|Tsd|M|Mio)?/i);
            if (!match) return null;
    
            let value = parseFloat(match[1].replace(',', '.')); // Convert 1,5 → 1.5
            const suffix = match[2] ? match[2].toLowerCase() : '';
    
            if (suffix === 'k' || suffix === 'tsd') {
                value *= 1000;
            } else if (suffix === 'm' || suffix === 'mio') {
                value *= 1000000;
            }
    
            number = Math.round(value);
            console.log('Badge:', number);
            return number;
        } catch (e) {
            return null;
        }
    }
    

    function extractRatings(t) {
        try {
    
            if (!reviewsEnabled?.checked) return 'N/A'; // ⬅ Only extract if enabled
    
            let n = 0;
            const l = t.querySelector("#acrPopover");
            if (l) {
                const m = l.textContent.match(/[\d.]+/);
                if (m) n = parseFloat(m[0]);
            }
            return n;
        } catch (e) {
            return 0 ;
        }
    }
    
    function extractReviews(t) {
        try {
    
            if (!reviewsEnabled?.checked) return 'N/A'; // ⬅ Only extract if enabled
    
            let r = 0;
            const i = t.querySelector("#acrCustomerReviewText");
            if (i) {
                const m = i.textContent.match(/\d/g);
                if (m) r = parseInt(m.join(""));
            }
            return r;
        } catch (e) {
            return 0 ;
        }
    }
    
    async function cleanContentForLoader(t, n) {
        return t = await fetchWithRetryLoader(t, n), n = t.match(/<title.*?<\/title>/is), t.replace(/<head.*?<\/head>/is, n ? n[0] : "").replace(/<style.*?<\/style>/gs, "").replace(/<script.*?<\/script>/gs, "").replace(/<noscript.*?<\/noscript>/gs, "").replace(/<header.*?<\/header>/gs, "").replace(/href=/gs, "momo=").replace(/src=/gs, "source=").replace(/data-/gs, "mama-").replace(/onload/gs, "onslow")
    }
    
    async function fetchWithRetryLoader(t, n, r = 3, a = 500) {
        let i = 0 === n ? `${domainUrl}dp/${t.replace(/\s+/g,"").replace(/\u200E/g,"")}` : t;
        for (let l = 0; l < r; l++) try {
            await delay(Math.floor(20 * Math.random()));
            let t = await fetch(i, {
                method: "GET",
                headers: {
                    "User-Agent": getRandomUserAgent(),
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                    "Clear-Site-Data": "cache",
                    "Accept-Encoding": "br, zstd, gzip, deflate"
                }
            });
            if (!t.ok) throw new Error(`Failed to fetch: ${t.status}`);
            let n = await t.text();
            return n.includes("we just need to make sure you're not a robot") || n.includes("Amazon data please contact api-services-support@amazon.com") ? await new Promise((t, n) => {
                chrome.runtime.sendMessage({
                    action: "fetchAmazonData",
                    url: i,
                    mode: 1
                }, r => {
                    r?.success ? t(r.data) : n(new Error(`Failed to fetch ${r} even with extension`))
                })
            }) : n
        } catch (a) {
            if (l === r - 1)
                if (0 === n) try {
                    return await new Promise((t, n) => {
                        chrome.runtime.sendMessage({
                            action: "fetchAmazonData",
                            url: i,
                            mode: 1
                        }, r => {
                            r?.success ? t(r.data) : n(new Error(`Failed to fetch ${r} even with extension`))
                        })
                    })
                } catch {
                    throw new Error(`Error fetch ${i} with extension`)
                } else throw new Error(`Failed to fetch URL: ${t} after ${r} retries.`)
        }
    }
    
    })();
    