/* QRHub barcode generator (JsBarcode). Loaded with defer. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const svg = $("bcSvg"), err = $("bcError"), valueEl = $("bcValue"), fmtEl = $("bcFormat");
  if (!svg || !err || !valueEl || !fmtEl) { console.warn("QRHub: barcode elements not found."); return; }
  const FORMATS = {
    CODE128: { hint: "Any text or numbers (ASCII).", sample: "QRHub-2026" },
    EAN13: { hint: "12 digits (check digit is added) or 13 digits.", sample: "590123412345" },
    UPC: { hint: "11 digits (check digit is added) or 12 digits.", sample: "03600029145" },
    CODE39: { hint: "Letters A-Z, digits 0-9, space and - . $ / + %", sample: "QRHUB-2026" }
  };
  let ready = false, lastSample = "";
  const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
  const enable = (on) => document.querySelectorAll(".download-btn").forEach(b => (b.disabled = !on));
  const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  function render() {
    err.textContent = "";
    if (typeof JsBarcode === "undefined") { err.textContent = "Barcode library did not load. Check your connection and refresh."; return false; }
    const value = valueEl.value.trim();
    if (!value) { err.textContent = "Please enter a value."; enable(false); return false; }
    let ok = true;
    try {
      JsBarcode(svg, value, {
        format: fmtEl.value, lineColor: $("bcColor").value, background: $("bcBg").value,
        width: Number($("bcWidth").value), height: Number($("bcHeight").value),
        displayValue: $("bcText").checked, margin: 12, fontSize: 16, valid: (v) => { ok = v; }
      });
    } catch (e) { ok = false; }
    if (!ok) { err.textContent = `Invalid value for ${fmtEl.value}. ${FORMATS[fmtEl.value].hint}`; setText("bcStatus", "CHECK YOUR INPUT"); enable(false); return false; }
    ready = true; enable(true); setText("bcStatus", "BARCODE READY"); return true;
  }
  const live = debounce(() => { if (ready) render(); }, 150);

  function setFormat() {
    const f = FORMATS[fmtEl.value];
    setText("bcHint", f.hint);
    if (!valueEl.value.trim() || valueEl.value === lastSample) valueEl.value = f.sample;
    lastSample = f.sample;
  }

  function svgMarkup() {
    const c = svg.cloneNode(true); c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(c);
  }
  function toCanvas() {
    return new Promise((res, rej) => {
      const w = parseFloat(svg.getAttribute("width")) || svg.getBoundingClientRect().width;
      const h = parseFloat(svg.getAttribute("height")) || svg.getBoundingClientRect().height;
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas"); cv.width = w * 3; cv.height = h * 3;
        const ctx = cv.getContext("2d"); ctx.fillStyle = $("bcBg").value; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height); res({ cv, w, h });
      };
      img.onerror = () => rej(new Error("Could not render the barcode image."));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup());
    });
  }
  function save(href, name) { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  async function download(format) {
    try {
      if (!ready && !render()) return;
      if (format === "svg") {
        const url = URL.createObjectURL(new Blob([svgMarkup()], { type: "image/svg+xml" }));
        save(url, "qrhub-barcode.svg"); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
      }
      const { cv, w, h } = await toCanvas();
      if (format === "pdf") await window.QRHub.savePdf(cv.toDataURL("image/png"), w, h, "qrhub-barcode");
      else save(cv.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.95), "qrhub-barcode." + (format === "jpeg" ? "jpg" : "png"));
    } catch (e) { err.textContent = "Download failed: " + e.message; }
  }

  fmtEl.addEventListener("change", () => { setFormat(); render(); });
  $("bcGenerate")?.addEventListener("click", render);
  valueEl.addEventListener("input", live);
  ["bcColor", "bcBg", "bcWidth", "bcHeight", "bcText"].forEach(id => $(id)?.addEventListener("input", () => {
    setText("bcColorText", $("bcColor").value.toUpperCase()); setText("bcBgText", $("bcBg").value.toUpperCase()); setText("bcHVal", $("bcHeight").value); live();
  }));
  document.querySelectorAll(".download-btn").forEach(b => b.addEventListener("click", () => download(b.dataset.format)));
  setFormat(); render();
})();
