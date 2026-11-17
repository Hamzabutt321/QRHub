/* QRHub shared layout: header, footer, feedback dialog, form sender, PDF helper. */
(function () {
  "use strict";
  // ====== CONFIG: forms need ONE of these to deliver messages ======
  // endpoint: a Formspree / Web3Forms / Getform URL (recommended). email: fallback (opens user's mail app).
  var CONFIG = { endpoint: "", email: "hello@example.com" };
  var JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  var NAV = [["/#generator", "QR Generator"], ["/barcode/", "Barcode"], ["/#tools", "QR Tools"], ["/#faq", "FAQ"], ["/blog/how-to-create-a-qr-code/", "Blog"], ["/advertise/", "Advertise"]];
  var BRAND = '<a class="brand" href="/" aria-label="QRHub home"><img src="/assets/logo.svg" alt="" width="34" height="34"><span>QR<span>Hub</span></span></a>';

  function showMsg(el, type, text) { if (!el) return; el.hidden = false; el.className = "form-msg " + type; el.textContent = text; }

  window.QRHub = {
    CONFIG: CONFIG,
    showMsg: showMsg,
    // Sends a form. Returns "sent" (server) or "mailto" (mail app opened). Throws on failure.
    send: async function (subject, data) {
      if (CONFIG.endpoint) {
        var r = await fetch(CONFIG.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.assign({ _subject: subject }, data)) });
        if (!r.ok) throw new Error("The server rejected the message.");
        return "sent";
      }
      var body = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
      location.href = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      return "mailto";
    },
    loadScript: function (src) {
      return new Promise(function (res, rej) {
        var s = document.createElement("script"); s.src = src; s.onload = res;
        s.onerror = function () { rej(new Error("Could not load " + src)); }; document.head.appendChild(s);
      });
    },
    blobToDataURL: function (blob) {
      return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); });
    },
    savePdf: async function (pngDataUrl, w, h, name) {
      if (!window.jspdf) await this.loadScript(JSPDF);
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
      var r = Math.min(460 / w, 460 / h), iw = w * r, ih = h * r;
      doc.addImage(pngDataUrl, "PNG", (595.28 - iw) / 2, 90, iw, ih);
      doc.save(name + ".pdf");
    }
  };

  function headerHtml() {
    var path = location.pathname.replace(/index\.html$/, "");
    var links = NAV.map(function (l) {
      var cur = l[0].indexOf("#") < 0 && l[0] === path;
      return '<a href="' + l[0] + '"' + (cur ? ' aria-current="page"' : "") + ">" + l[1] + "</a>";
    }).join("");
    return '<header class="site-header">' + BRAND + '<nav id="mainNav" aria-label="Main">' + links + '</nav>' +
      '<a class="btn btn-primary btn-sm header-cta" href="/#generator">Create QR</a>' +
      '<button class="menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false" aria-controls="mainNav">☰</button></header>';
  }
  function footerHtml() {
    return '<footer class="site-footer"><div class="footer-main"><div class="footer-brand">' + BRAND +
      '<p>Free QR code &amp; barcode generator.<br>No sign-up. No watermark.</p></div>' +
      '<div><h4>Explore</h4><a href="/#generator">QR Generator</a><a href="/barcode/">Barcode Generator</a><a href="/#faq">FAQ</a><a href="/blog/how-to-create-a-qr-code/">Blog</a></div>' +
      '<div><h4>Company</h4><a href="/advertise/">Advertise With Us</a><button type="button" class="link-btn" data-open-feedback>Send feedback</button></div></div>' +
      '<div class="footer-bottom"><span>© <span class="year"></span> QRHub. All rights reserved.</span><span>Made for a more connected world <b>✦</b></span></div></footer>';
  }
  function mount(id, html) { var el = document.getElementById(id); if (el) el.outerHTML = html; }

  function buildFeedback() {
    var d = document.createElement("dialog");
    d.id = "feedbackDialog"; d.setAttribute("aria-labelledby", "fbTitle");
    d.innerHTML = '<form id="fbForm" novalidate><h2 id="fbTitle">Send feedback</h2><p class="fb-sub">Tell us what works, what is broken or what you would like to see.</p>' +
      '<label class="field-label" for="fbRating">Your experience</label><select id="fbRating" class="control"><option value="5">★★★★★ Excellent</option><option value="4">★★★★ Good</option><option value="3">★★★ Okay</option><option value="2">★★ Poor</option><option value="1">★ Very poor</option></select>' +
      '<label class="field-label" for="fbType">Type</label><select id="fbType" class="control"><option>Suggestion</option><option>Bug report</option><option>Praise</option><option>Other</option></select>' +
      '<label class="field-label" for="fbMsg">Your feedback</label><textarea id="fbMsg" class="control" maxlength="1500" required></textarea>' +
      '<label class="field-label" for="fbEmail">Email (optional)</label><input id="fbEmail" class="control" type="email" autocomplete="email">' +
      '<input class="hp" id="fbHp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div id="fbStatus" class="form-msg" role="status" aria-live="polite" hidden></div>' +
      '<div class="fb-actions"><button type="button" class="btn btn-ghost" data-close>Close</button><button type="submit" class="btn btn-primary">Send feedback</button></div></form>';
    document.body.appendChild(d);

    var fab = document.createElement("button");
    fab.type = "button"; fab.className = "btn btn-primary btn-sm fb-fab"; fab.setAttribute("data-open-feedback", ""); fab.textContent = "💬 Feedback";
    document.body.appendChild(fab);

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-open-feedback]")) { typeof d.showModal === "function" ? d.showModal() : d.setAttribute("open", ""); }
      else if (e.target.closest("[data-close]") || e.target === d) { d.close ? d.close() : d.removeAttribute("open"); }
    });
    var form = d.querySelector("#fbForm"), status = d.querySelector("#fbStatus");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var msg = d.querySelector("#fbMsg").value.trim(), email = d.querySelector("#fbEmail").value.trim();
      if (d.querySelector("#fbHp").value) return;
      if (msg.length < 5) return showMsg(status, "err", "Please write a little more (at least 5 characters).");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMsg(status, "err", "Please enter a valid email or leave it empty.");
      var btn = form.querySelector("[type=submit]"); btn.disabled = true;
      try {
        var res = await window.QRHub.send("QRHub feedback", { Rating: d.querySelector("#fbRating").value + "/5", Type: d.querySelector("#fbType").value, Message: msg, Email: email || "(not given)", Page: location.href });
        showMsg(status, "ok", res === "sent" ? "Thank you! Your feedback was sent." : "Your email app opened with your feedback. Please press Send to deliver it.");
        if (res === "sent") form.reset();
      } catch (err) { showMsg(status, "err", "Could not send feedback. Please try again later."); }
      btn.disabled = false;
    });
  }

  mount("site-header", headerHtml());
  mount("site-footer", footerHtml());
  document.querySelectorAll(".year").forEach(function (y) { y.textContent = new Date().getFullYear(); });
  var btn = document.querySelector(".menu-toggle"), nav = document.getElementById("mainNav");
  if (btn && nav) {
    btn.addEventListener("click", function () { var o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", String(o)); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
  }
  buildFeedback();
})();
