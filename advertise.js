(function () {
  "use strict";
  const form = document.getElementById("adForm"), msg = document.getElementById("adMsg");
  if (!form || !msg || !window.QRHub) { console.warn("QRHub: advertise form or layout.js missing."); return; }
  const $ = (id) => document.getElementById(id);
  const validUrl = (u) => { try { return /^https?:$/.test(new URL(/^[a-z]+:\/\//i.test(u) ? u : "https://" + u).protocol) && u.includes("."); } catch { return false; } };
  const RULES = [
    ["adName", (v) => v.length >= 2, "Please enter your name."],
    ["adCompany", (v) => v.length >= 2, "Please enter your company name."],
    ["adEmail", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address."],
    ["adSite", validUrl, "Please enter a valid website URL."],
    ["adBudget", (v) => !!v, "Please choose an advertising budget."],
    ["adMessage", (v) => v.length >= 10, "Please write a message of at least 10 characters."]
  ];
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const [id, test, text] of RULES) {
      if (!test($(id).value.trim())) { QRHub.showMsg(msg, "err", text); $(id).focus(); return; }
    }
    if ($("adHp").value) { QRHub.showMsg(msg, "ok", "Thank you! Your inquiry was received."); return; }
    const btn = form.querySelector("[type=submit]"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const site = $("adSite").value.trim();
      const res = await QRHub.send("QRHub advertising inquiry", {
        Name: $("adName").value.trim(), Company: $("adCompany").value.trim(), Email: $("adEmail").value.trim(),
        Website: /^https?:\/\//i.test(site) ? site : "https://" + site, Budget: $("adBudget").value, Message: $("adMessage").value.trim()
      });
      if (res === "sent") { QRHub.showMsg(msg, "ok", "Thank you! Your inquiry was sent. We will reply by email soon."); form.reset(); }
      else QRHub.showMsg(msg, "ok", "Your email app opened with the inquiry filled in. Please press Send to deliver it.");
    } catch (err) { QRHub.showMsg(msg, "err", "Sorry, we could not send your inquiry. Please try again in a moment."); }
    btn.disabled = false; btn.textContent = label;
  });
})();
