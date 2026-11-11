const $ = (id) => document.getElementById(id);
const typeSelect = $("qrType");
const fields = $("dynamicFields");
const preview = $("qrPreview");
const errorBox = $("formError");
let logoData = "";
let qrCode = null;
let currentPayload = "";

const fieldTemplates = {
  url: `<div class="field-wrap full"><label class="field-label">Website URL</label><input id="url" type="url" placeholder="https://example.com" value="https://example.com"></div>`,
  text: `<div class="field-wrap full"><label class="field-label">Your text</label><textarea id="text" placeholder="Type your message here...">Hello from QRHub!</textarea></div>`,
  wifi: `<div class="field-wrap full"><label class="field-label">Network name (SSID)</label><input id="ssid" placeholder="Your Wi-Fi name"></div><div class="field-wrap"><label class="field-label">Password</label><input id="password" type="text" placeholder="Wi-Fi password"></div><div class="field-wrap"><label class="field-label">Security</label><select id="security"><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">No password</option></select></div><div class="field-wrap full"><label><input id="hidden" type="checkbox"> <span class="muted">Hidden network</span></label></div>`,
  email: `<div class="field-wrap full"><label class="field-label">Email address</label><input id="email" type="email" placeholder="hello@example.com"></div><div class="field-wrap full"><label class="field-label">Subject (optional)</label><input id="subject" placeholder="Hello"></div><div class="field-wrap full"><label class="field-label">Message (optional)</label><textarea id="message" placeholder="Write a message..."></textarea></div>`,
  phone: `<div class="field-wrap full"><label class="field-label">Phone number</label><input id="phone" type="tel" placeholder="+1 555 123 4567"></div>`,
  whatsapp: `<div class="field-wrap full"><label class="field-label">WhatsApp number</label><input id="waPhone" type="tel" placeholder="923001234567"><small class="muted">Include country code, without + or spaces.</small></div><div class="field-wrap full"><label class="field-label">Prefilled message (optional)</label><textarea id="waMessage" placeholder="Hi! I would like to know more."></textarea></div>`,
  sms: `<div class="field-wrap full"><label class="field-label">Phone number</label><input id="smsPhone" type="tel" placeholder="+1 555 123 4567"></div><div class="field-wrap full"><label class="field-label">Message (optional)</label><textarea id="smsMessage" placeholder="Your message..."></textarea></div>`,
  vcard: `<div class="field-wrap"><label class="field-label">First name</label><input id="firstName" placeholder="Alex"></div><div class="field-wrap"><label class="field-label">Last name</label><input id="lastName" placeholder="Morgan"></div><div class="field-wrap full"><label class="field-label">Organization (optional)</label><input id="organization" placeholder="Company name"></div><div class="field-wrap"><label class="field-label">Phone</label><input id="vPhone" type="tel" placeholder="+1 555 123 4567"></div><div class="field-wrap"><label class="field-label">Email</label><input id="vEmail" type="email" placeholder="alex@example.com"></div><div class="field-wrap full"><label class="field-label">Website (optional)</label><input id="website" placeholder="https://example.com"></div>`,
  location: `<div class="field-wrap"><label class="field-label">Latitude</label><input id="lat" type="number" step="any" placeholder="40.7128"></div><div class="field-wrap"><label class="field-label">Longitude</label><input id="lng" type="number" step="any" placeholder="-74.0060"></div>`,
  pdf: `<div class="field-wrap full"><label class="field-label">Public PDF URL</label><input id="pdfUrl" type="url" placeholder="https://example.com/document.pdf"></div>`,
  social: `<div class="field-wrap full"><label class="field-label">Social profile URL</label><input id="socialUrl" type="url" placeholder="https://instagram.com/yourprofile"></div>`
};

function renderFields() {
  fields.innerHTML = fieldTemplates[typeSelect.value] || fieldTemplates.url;
  fields.querySelectorAll("input,textarea,select").forEach(el => {
    el.addEventListener("input", () => { if (qrCode) generate(); });
    el.addEventListener("change", () => { if (qrCode) generate(); });
  });
  errorBox.textContent = "";
}
function val(id) { return ($(id)?.value || "").trim(); }
function required(value, label) { if (!value) throw new Error(`Please enter ${label}.`); return value; }
function buildPayload() {
  switch (typeSelect.value) {
    case "url": return required(val("url"), "a website URL");
    case "text": return required(val("text"), "some text");
    case "wifi": {
      const ssid = required(val("ssid"), "your Wi-Fi network name");
      const security = val("security") || "WPA";
      const password = val("password");
      return `WIFI:T:${security};S:${ssid.replace(/[\\;,:"]/g, "\\$&")};P:${password.replace(/[\\;,:"]/g, "\\$&")};H:${$("hidden").checked ? "true" : "false"};;`;
    }
    case "email": {
      const email = required(val("email"), "an email address");
      return `mailto:${email}?subject=${encodeURIComponent(val("subject"))}&body=${encodeURIComponent(val("message"))}`;
    }
    case "phone": return `tel:${required(val("phone"), "a phone number")}`;
    case "whatsapp": {
      const phone = required(val("waPhone"), "a WhatsApp number").replace(/[^\d]/g, "");
      if (phone.length < 7) throw new Error("Enter a valid WhatsApp number with country code.");
      return `https://wa.me/${phone}${val("waMessage") ? `?text=${encodeURIComponent(val("waMessage"))}` : ""}`;
    }
    case "sms": {
      const phone = required(val("smsPhone"), "a phone number");
      return `SMSTO:${phone}:${val("smsMessage")}`;
    }
    case "vcard": {
      const first = required(val("firstName"), "a first name");
      const last = val("lastName");
      return `BEGIN:VCARD\nVERSION:3.0\nN:${last};${first};;;\nFN:${first} ${last}\nORG:${val("organization")}\nTEL:${val("vPhone")}\nEMAIL:${val("vEmail")}\nURL:${val("website")}\nEND:VCARD`;
    }
    case "location": {
      const lat = required(val("lat"), "a latitude"), lng = required(val("lng"), "a longitude");
      if (Number(lat) < -90 || Number(lat) > 90 || Number(lng) < -180 || Number(lng) > 180) throw new Error("Enter valid latitude and longitude values.");
      return `geo:${lat},${lng}`;
    }
    case "pdf": return required(val("pdfUrl"), "a public PDF URL");
    case "social": return required(val("socialUrl"), "a social profile URL");
    default: return required(val("url"), "a URL");
  }
}
function getOptions() {
  const size = Number($("qrSize").value);
  const dots = $("qrStyle").value;
  const map = {square:"square",dots:"dots",rounded:"rounded",classy:"classy"};
  return {
    width:size,height:size,type:"canvas",data:currentPayload,
    margin:12,
    qrOptions:{errorCorrectionLevel:logoData ? "H" : "Q"},
    image:logoData || undefined,
    imageOptions:{hideBackgroundDots:true,imageSize:0.23,margin:5,crossOrigin:"anonymous"},
    dotsOptions:{color:$("qrColor").value,type:map[dots]},
    backgroundOptions:{color:$("bgColor").value},
    cornersSquareOptions:{color:$("qrColor").value,type:"extra-rounded"},
    cornersDotOptions:{color:$("qrColor").value,type:"dot"}
  };
}
function setPreviewStatus(text) { $("previewStatus").textContent = text; }
function generate() {
  try {
    if (typeof QRCodeStyling === "undefined") throw new Error("QR library did not load. Check your internet connection and refresh the page.");
    currentPayload = buildPayload();
    const options = getOptions();
    if (!qrCode) qrCode = new QRCodeStyling(options);
    else qrCode.update(options);
    preview.innerHTML = "";
    qrCode.append(preview);
    errorBox.textContent = "";
    $("previewTitle").textContent = "Your QR code is ready.";
    $("previewDescription").textContent = "Customize further or download your design.";
    setPreviewStatus("QR CODE READY");
    document.querySelectorAll(".download-btn").forEach(btn => btn.disabled = false);
  } catch (err) {
    errorBox.textContent = err.message;
    setPreviewStatus("CHECK YOUR INPUT");
  }
}
typeSelect.addEventListener("change", () => { renderFields(); if (qrCode) generate(); });
$("generateBtn").addEventListener("click", generate);
["qrColor","bgColor","qrStyle","qrSize"].forEach(id => $(id).addEventListener("input", () => {
  if (id === "qrSize") $("sizeValue").textContent = $("qrSize").value;
  $("qrColorText").textContent = $("qrColor").value.toUpperCase();
  $("bgColorText").textContent = $("bgColor").value.toUpperCase();
  if (qrCode) generate();
}));
$("logoUpload").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) { logoData = ""; return; }
  if (file.size > 1024 * 1024) { errorBox.textContent = "Logo must be 1 MB or smaller."; event.target.value = ""; return; }
  if (!["image/png","image/jpeg","image/svg+xml"].includes(file.type)) { errorBox.textContent = "Please choose a PNG, JPG or SVG image."; event.target.value = ""; return; }
  const reader = new FileReader();
  reader.onload = () => { logoData = reader.result; $("logoName").textContent = file.name; if (qrCode) generate(); };
  reader.readAsDataURL(file);
});
document.querySelectorAll(".download-btn").forEach(btn => btn.addEventListener("click", () => {
  if (!qrCode) return;
  const format = btn.dataset.format;
  qrCode.download({name:"qrhub-code",extension:format});
}));
document.querySelectorAll(".tool-card").forEach(btn => btn.addEventListener("click", () => {
  typeSelect.value = btn.dataset.type; renderFields(); document.querySelector("#generator").scrollIntoView({behavior:"smooth"});
}));
document.querySelectorAll("[data-footer-type]").forEach(link => link.addEventListener("click", () => {
  typeSelect.value = link.dataset.footerType; renderFields();
}));
const menuButton = document.querySelector(".menu-toggle");
menuButton.addEventListener("click", () => document.querySelector(".site-header nav").classList.toggle("open"));
document.querySelectorAll(".site-header nav a").forEach(a => a.addEventListener("click", () => document.querySelector(".site-header nav").classList.remove("open")));
$("year").textContent = new Date().getFullYear();
renderFields();
