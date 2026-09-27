// ============================================================
// STATE + STORAGE
// ============================================================
const STORAGE_KEY = "wardrobe_items_v1";

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read wardrobe data:", e);
    return [];
  }
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Could not save wardrobe data:", e);
  }
}

let items = loadItems();
let editingItemId = null;

const TYPE_LABEL = {
  top: "เสื้อ", bottom: "กางเกง/กระโปรง", dress: "ชุดเดรส",
  outer: "เสื้อคลุม", accessory: "เครื่องประดับ", shoes: "รองเท้า"
};
const SEASON_LABEL = { hot: "ร้อน", rainy: "ฝน", cool: "เย็น", formal: "ทางการ" };

// ============================================================
// TABS
// ============================================================
document.querySelectorAll(".rail-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".rail-tab").forEach(b => b.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("is-active");
    if (btn.dataset.tab === "match") renderMatchSelect();
    if (btn.dataset.tab === "donate") renderDonateSelect();
  });
});

// ============================================================
// SEASON CHIPS (multi-select toggle)
// ============================================================
const selectedSeasons = new Set();
document.querySelectorAll("#f-season .chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const v = chip.dataset.val;
    if (selectedSeasons.has(v)) { selectedSeasons.delete(v); chip.classList.remove("is-on"); }
    else { selectedSeasons.add(v); chip.classList.add("is-on"); }
  });
});

// ============================================================
// IMAGE HELPERS
// ============================================================
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageEl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ============================================================
// AUTO COLOR DETECTION FROM UPLOADED PHOTO
// ------------------------------------------------------------
// Downscales the photo without changing its proportions, estimates
// the background from image edges, then finds the most common
// remaining color as the garment color.
// Runs entirely on-device — no upload, no API.
// ============================================================
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

function bucketFromHue(h, s, l) {
  if (s < 0.15 || l > 0.92 || l < 0.08) return "neutral";
  if (h < 70 || h >= 335) return "warm";
  return "cool";
}

function detectDominantColor(imgEl) {
  const SIZE = 64;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const imageWidth = imgEl.naturalWidth || imgEl.width;
  const imageHeight = imgEl.naturalHeight || imgEl.height;
  if (!imageWidth || !imageHeight) return null;
  const scale = Math.min(SIZE / imageWidth, SIZE / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (SIZE - drawWidth) / 2;
  const drawY = (SIZE - drawHeight) / 2;
  ctx.drawImage(imgEl, drawX, drawY, drawWidth, drawHeight);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

  const left = Math.floor(drawX), top = Math.floor(drawY);
  const right = Math.ceil(drawX + drawWidth), bottom = Math.ceil(drawY + drawHeight);
  const edgeBand = Math.max(1, Math.round(Math.min(drawWidth, drawHeight) * 0.08));
  const edgeBins = new Map();

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (x >= left + edgeBand && x < right - edgeBand &&
          y >= top + edgeBand && y < bottom - edgeBand) continue;
      const index = (y * SIZE + x) * 4;
      if (data[index + 3] < 128) continue;
      const r = data[index], g = data[index + 1], b = data[index + 2];
      const key = [Math.floor(r / 24), Math.floor(g / 24), Math.floor(b / 24)].join(",");
      const bin = edgeBins.get(key) || { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      bin.count++; bin.rSum += r; bin.gSum += g; bin.bSum += b;
      edgeBins.set(key, bin);
    }
  }

  let background = null;
  for (const bin of edgeBins.values()) {
    if (!background || bin.count > background.count) background = bin;
  }
  if (background) {
    background = {
      r: background.rSum / background.count,
      g: background.gSum / background.count,
      b: background.bSum / background.count
    };
  }

  const BIN = 24;
  const bins = new Map();
  let counted = 0;

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * SIZE + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] < 128) continue;
      if (background && Math.hypot(r - background.r, g - background.g, b - background.b) < 38) continue;
      const key = [Math.floor(r / BIN), Math.floor(g / BIN), Math.floor(b / BIN)].join(",");
      const bin = bins.get(key) || { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      bin.count++; bin.rSum += r; bin.gSum += g; bin.bSum += b;
      bins.set(key, bin);
      counted++;
    }
  }

  if (!counted) return null;
  let winner = null;
  for (const bin of bins.values()) if (!winner || bin.count > winner.count) winner = bin;

  const r = Math.round(winner.rSum / winner.count);
  const g = Math.round(winner.gSum / winner.count);
  const b = Math.round(winner.bSum / winner.count);
  const hex = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  const [h, s, l] = rgbToHsl(r, g, b);
  const confidence = Math.round((winner.count / counted) * 100);
  return { hex, bucket: bucketFromHue(h, s, l), confidence };
}

document.getElementById("f-image").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const status = document.getElementById("color-detect-status");
  if (!file) { status.textContent = ""; return; }
  status.textContent = "กำลังตรวจจับสีจากรูป…";
  try {
    const dataUrl = await fileToDataURL(file);
    const img = await loadImageEl(dataUrl);
    const result = detectDominantColor(img);
    if (result) {
      document.getElementById("f-color").value = result.hex;
      document.getElementById("f-colorbucket").value = result.bucket;
      status.textContent = `ตรวจพบสีหลักของเสื้อผ้า ${result.hex} (ความมั่นใจ ${result.confidence}% ของพิกเซลที่แยกจากพื้นหลัง) — แก้ไขได้ถ้าไม่ตรง`;
    } else {
      status.textContent = "ตรวจจับสีจากรูปไม่สำเร็จ กรุณาเลือกสีเอง";
    }
  } catch (err) {
    console.error(err);
    status.textContent = "ตรวจจับสีจากรูปไม่สำเร็จ กรุณาเลือกสีเอง";
  }
});

// ============================================================
// DPP (Digital Product Passport) QR SCAN — see js/dpp-data.js
// for what this demo layer can and can't do.
// ============================================================
const dppScanBtn = document.getElementById("dpp-scan-btn");
const dppScanInput = document.getElementById("dpp-scan-input");
const dppStatus = document.getElementById("dpp-status");
const dppDemoSelect = document.getElementById("dpp-demo-select");

// populate the "try a sample DPP" dropdown from the mock registry
Object.entries(MOCK_DPP_REGISTRY).forEach(([id, rec]) => {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = `${rec.name} (${id})`;
  dppDemoSelect.appendChild(opt);
});

function applyDPPRecord(record) {
  document.getElementById("f-name").value = record.name || "";
  document.getElementById("f-brand").value = record.brand || "";
  if (record.color) document.getElementById("f-color").value = record.color;
  if (record.colorBucket) document.getElementById("f-colorbucket").value = record.colorBucket;
  if (record.type) document.getElementById("f-type").value = record.type;
  if (record.composition) {
    document.getElementById("f-fabric").value = record.composition
      .map(c => `${c.material} ${c.percent}%`).join(" + ");
  }
  if (record.carbonFootprintKg != null) document.getElementById("f-carbon").value = record.carbonFootprintKg;
  if (record.recycledContent != null) document.getElementById("f-recycled").value = record.recycledContent;
  currentDPPImage = record.image || null;
  currentDPPCare = record.care || null;
  currentDPPComposition = record.composition || null;
}

let currentDPPCare = null;
let currentDPPComposition = null;
let currentDPPImage = null;

dppDemoSelect.addEventListener("change", () => {
  const rec = MOCK_DPP_REGISTRY[dppDemoSelect.value];
  if (!rec) return;
  applyDPPRecord(rec);
  dppStatus.textContent = `ดึงข้อมูลจาก DPP ตัวอย่าง "${rec.name}" เรียบร้อย — ตรวจสอบก่อนบันทึก`;
});

dppScanBtn.addEventListener("click", () => dppScanInput.click());

dppScanInput.addEventListener("change", async () => {
  const file = dppScanInput.files[0];
  if (!file) return;
  dppScanBtn.disabled = true;
  dppStatus.textContent = "กำลังอ่าน QR…";
  try {
    const dataUrl = await fileToDataURL(file);
    const img = await loadImageEl(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code) {
      dppStatus.textContent = "ไม่พบ QR ในรูป ลองถ่ายให้ชัดและเต็มเฟรมกว่านี้";
      return;
    }
    const record = resolveDPP(code.data);
    if (record) {
      applyDPPRecord(record);
      dppStatus.textContent = `อ่าน DPP สำเร็จ: "${record.name}" — ข้อมูลถูกกรอกให้อัตโนมัติ ตรวจสอบก่อนบันทึก`;
    } else {
      dppStatus.textContent = "อ่าน QR ได้ แต่ไม่พบข้อมูล DPP ที่ตรงกันในฐานข้อมูลตัวอย่าง";
    }
  } catch (err) {
    console.error(err);
    dppStatus.textContent = "สแกน QR ไม่สำเร็จ";
  } finally {
    dppScanBtn.disabled = false;
    dppScanInput.value = "";
  }
});

// ============================================================
// TAG SCAN (on-device OCR via Tesseract.js — no server needed)
// ============================================================
const FABRIC_KEYWORDS = [
  { match: /cotton|ฝ้าย/i, label: "ผ้าฝ้าย (Cotton)" },
  { match: /polyester|โพลีเอสเตอร์/i, label: "โพลีเอสเตอร์ (Polyester)" },
  { match: /silk|ไหม/i, label: "ผ้าไหม (Silk)" },
  { match: /wool|ขนสัตว์|ขนแกะ/i, label: "ขนสัตว์ (Wool)" },
  { match: /linen|ลินิน/i, label: "ลินิน (Linen)" },
  { match: /denim|ยีนส์|เดนิม/i, label: "เดนิม/ยีนส์ (Denim)" },
  { match: /spandex|elastane|สแปนเดกซ์/i, label: "สแปนเดกซ์ (Spandex/Elastane)" },
  { match: /nylon|ไนลอน/i, label: "ไนลอน (Nylon)" },
  { match: /rayon|viscose|เรยอน/i, label: "เรยอน (Rayon/Viscose)" }
];

const scanBtn = document.getElementById("scan-btn");
const scanInput = document.getElementById("scan-input");
const scanStatus = document.getElementById("scan-status");
const fabricField = document.getElementById("f-fabric");

scanBtn.addEventListener("click", () => scanInput.click());

scanInput.addEventListener("change", async () => {
  const file = scanInput.files[0];
  if (!file) return;
  scanBtn.disabled = true;
  scanStatus.textContent = "กำลังอ่านป้าย…";
  try {
    const dataUrl = await fileToDataURL(file);
    const { data } = await Tesseract.recognize(dataUrl, "eng");
    const text = data.text || "";
    const found = FABRIC_KEYWORDS.filter(f => f.match.test(text));
    if (found.length) {
      fabricField.value = found.map(f => f.label).join(" + ");
      scanStatus.textContent = "พบข้อมูลชนิดผ้าจากป้าย โปรดตรวจสอบก่อนบันทึก";
    } else {
      scanStatus.textContent = "อ่านป้ายไม่ชัดเจน กรุณาพิมพ์ชนิดผ้าเอง";
    }
  } catch (e) {
    console.error(e);
    scanStatus.textContent = "สแกนไม่สำเร็จ กรุณาพิมพ์ชนิดผ้าเอง";
  } finally {
    scanBtn.disabled = false;
    scanInput.value = "";
  }
});

// ============================================================
// ADD ITEM
// ============================================================
const form = document.getElementById("item-form");
const cancelEditBtn = document.getElementById("cancel-edit");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const imageFile = document.getElementById("f-image").files[0];
  const imageData = imageFile ? await fileToDataURL(imageFile) : null;

  const type = document.getElementById("f-type").value;
  const fabric = fabricField.value.trim() || "ไม่ระบุ";
  const carbonInput = document.getElementById("f-carbon").value.trim();
  const recycledInput = document.getElementById("f-recycled").value.trim();
  const existingItem = items.find(i => i.id === editingItemId);

  const item = {
    ...existingItem,
    id: existingItem ? existingItem.id : Date.now().toString(36),
    name: document.getElementById("f-name").value.trim(),
    brand: document.getElementById("f-brand").value.trim() || null,
    type,
    color: document.getElementById("f-color").value,
    colorBucket: document.getElementById("f-colorbucket").value,
    fabric,
    composition: currentDPPComposition ?? existingItem?.composition ?? null,
    care: currentDPPCare ?? existingItem?.care ?? null,
    carbonFootprintKg: carbonInput ? parseFloat(carbonInput) : estimateCarbonKg(type, fabric),
    carbonIsEstimated: !carbonInput,
    recycledContent: recycledInput ? parseInt(recycledInput, 10) : 0,
    seasons: Array.from(selectedSeasons),
    image: imageData || currentDPPImage || existingItem?.image || null
  };
  if (existingItem) items = items.map(i => i.id === item.id ? item : i);
  else items.push(item);
  saveItems(items);
  resetItemForm();
  renderCloset();
});

function resetItemForm() {
  form.reset();
  editingItemId = null;
  selectedSeasons.clear();
  document.querySelectorAll("#f-season .chip").forEach(c => c.classList.remove("is-on"));
  scanStatus.textContent = "";
  dppStatus.textContent = "";
  document.getElementById("color-detect-status").textContent = "";
  currentDPPCare = null;
  currentDPPComposition = null;
  currentDPPImage = null;
  form.querySelector('[type="submit"]').textContent = "บันทึกลงตู้เสื้อผ้า";
  cancelEditBtn.hidden = true;
}

function startEditingItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingItemId = item.id;
  document.getElementById("f-name").value = item.name || "";
  document.getElementById("f-brand").value = item.brand || "";
  document.getElementById("f-type").value = item.type;
  document.getElementById("f-color").value = item.color || "#8a7f6a";
  document.getElementById("f-colorbucket").value = item.colorBucket || "neutral";
  document.getElementById("f-fabric").value = item.fabric || "";
  document.getElementById("f-carbon").value = item.carbonIsEstimated ? "" : item.carbonFootprintKg ?? "";
  document.getElementById("f-recycled").value = item.recycledContent ?? 0;
  document.getElementById("f-image").value = "";
  currentDPPCare = item.care || null;
  currentDPPComposition = item.composition || null;

  selectedSeasons.clear();
  (item.seasons || []).forEach(season => selectedSeasons.add(season));
  document.querySelectorAll("#f-season .chip").forEach(chip => {
    chip.classList.toggle("is-on", selectedSeasons.has(chip.dataset.val));
  });

  form.querySelector('[type="submit"]').textContent = "บันทึกการแก้ไข";
  cancelEditBtn.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("f-name").focus({ preventScroll: true });
}

cancelEditBtn.addEventListener("click", resetItemForm);

// ============================================================
// RENDER CLOSET
// ============================================================
function renderCloset() {
  const grid = document.getElementById("closet-grid");
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<div class="empty-note">ตู้เสื้อผ้ายังว่างอยู่ — เพิ่มชิ้นแรกของคุณทางซ้าย</div>`;
    return;
  }
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    const carbon = item.carbonFootprintKg;
    card.innerHTML = `
      <div class="item-thumb" style="${item.image ? `background-image:url('${item.image}')` : ""}">
        ${item.image ? "" : "👕"}
      </div>
      <div class="item-body">
        <div class="item-name">${escapeHTML(item.name)}</div>
        ${item.brand ? `<div class="item-meta">${escapeHTML(item.brand)}</div>` : ""}
        <div class="item-meta">${TYPE_LABEL[item.type] || item.type} · ${(item.seasons || []).map(s => SEASON_LABEL[s]).join(", ") || "ทุกฤดู"}</div>
        <span class="fabric-tag">${escapeHTML(item.fabric)}</span>
        ${item.care ? `<div class="item-meta item-care">🧺 ${escapeHTML(item.care)}</div>` : ""}
        <div class="eco-badges">
          <span class="eco-badge" title="${item.carbonIsEstimated ? "ค่าประมาณ" : "จาก DPP/ระบุเอง"}">🌍 ${carbon != null ? carbon.toFixed(1) : "?"} กก. CO2e${item.carbonIsEstimated ? " (ประมาณ)" : ""}</span>
          <span class="eco-badge">♻️ รีไซเคิล ${item.recycledContent || 0}%</span>
        </div>
        <div class="item-actions">
          <button class="item-edit" data-id="${item.id}">แก้ไข</button>
          <button class="item-remove" data-id="${item.id}">ลบ</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  grid.querySelectorAll(".item-edit").forEach(btn => {
    btn.addEventListener("click", () => startEditingItem(btn.dataset.id));
  });
  grid.querySelectorAll(".item-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      items = items.filter(i => i.id !== btn.dataset.id);
      saveItems(items);
      renderCloset();
    });
  });
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ============================================================
// MATCH TAB
// ============================================================
// Neutrals pair freely; nearby and complementary hues score well.
function itemColor(item) {
  if (typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color)) return item.color;
  return { neutral: "#A9A29A", warm: "#B5533C", cool: "#587887" }[item.colorBucket] || "#8A7F6A";
}

function colorScore(firstItem, secondItem) {
  const colors = [firstItem, secondItem].map(item => {
    const hex = itemColor(item);
    const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    return rgbToHsl(...rgb);
  });
  const [[firstHue, firstSaturation, firstLightness], [secondHue, secondSaturation, secondLightness]] = colors;
  const firstNeutral = firstSaturation < 0.18 || firstLightness > 0.9 || firstLightness < 0.12;
  const secondNeutral = secondSaturation < 0.18 || secondLightness > 0.9 || secondLightness < 0.12;
  if (firstNeutral || secondNeutral) return 3;

  const hueDistance = Math.abs(firstHue - secondHue);
  const hueGap = Math.min(hueDistance, 360 - hueDistance);
  if (hueGap <= 25) return 3;
  if (hueGap <= 65 || hueGap >= 150) return 2;
  return 1;
}
// Very light type-pairing rule: don't pair a top with a top, etc.
function typesPair(a, b) {
  const pairable = {
    top: ["bottom", "outer", "accessory", "shoes"],
    bottom: ["top", "outer", "accessory", "shoes"],
    dress: ["outer", "accessory", "shoes"],
    outer: ["top", "bottom", "dress", "accessory", "shoes"],
    accessory: ["top", "bottom", "dress", "outer", "shoes"],
    shoes: ["top", "bottom", "dress", "outer", "accessory"]
  };
  return (pairable[a] || []).includes(b);
}
function seasonOverlap(a, b) {
  if (!a.length || !b.length) return 1;
  return a.some(s => b.includes(s)) ? 1 : 0;
}

function renderMatchSelect() {
  const sel = document.getElementById("match-select");
  sel.innerHTML = items.map(i => `<option value="${i.id}">${escapeHTML(i.name)}</option>`).join("");
  if (!sel.dataset.bound) {
    sel.addEventListener("change", renderMatches);
    sel.dataset.bound = "1";
  }
  renderMatches();
}

function renderMatches() {
  const sel = document.getElementById("match-select");
  const results = document.getElementById("match-results");
  results.innerHTML = "";
  if (!items.length) {
    results.innerHTML = `<div class="empty-note">เพิ่มเสื้อผ้าในตู้ก่อน เพื่อให้แอปช่วยจับคู่ได้</div>`;
    return;
  }
  const base = items.find(i => i.id === sel.value) || items[0];
  const scored = items
    .filter(i => i.id !== base.id && typesPair(base.type, i.type))
    .map(i => ({
      item: i,
      score: colorScore(base, i) + seasonOverlap(base.seasons, i.seasons)
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    results.innerHTML = `<div class="empty-note">ยังไม่มีชิ้นที่จับคู่กับ “${escapeHTML(base.name)}” ได้ ลองเพิ่มชิ้นอื่นในตู้</div>`;
    return;
  }
  scored.slice(0, 6).forEach(({ item, score }) => {
    const row = document.createElement("div");
    row.className = "match-pair";
    row.innerHTML = `
      <div class="match-thumb" style="${item.image ? `background-image:url('${item.image}')` : `background:${item.color}`}"></div>
      <div>
        <div class="item-name">${escapeHTML(item.name)}</div>
        <div class="item-meta">${TYPE_LABEL[item.type]} · ${escapeHTML(item.fabric)}</div>
      </div>
      <span class="score">${score >= 4 ? "เข้ากันมาก" : score >= 2 ? "เข้ากันได้" : "พอเข้ากัน"}</span>
      <button class="btn-ghost btn-look" data-id="${item.id}">ดูลุคเต็ม</button>`;
    results.appendChild(row);
  });
  results.querySelectorAll(".btn-look").forEach(btn => {
    btn.addEventListener("click", () => openOutfitModal(base, items.find(i => i.id === btn.dataset.id)));
  });
}

// ------------------------------------------------------------
// Full outfit "build": takes the base item + the chosen match,
// then rounds out the look by picking the best-scoring item
// from any other still-unused categories (outer/shoes/accessory
// etc.), so the popup shows a complete outfit, not just a pair.
// ------------------------------------------------------------
function buildFullOutfit(baseItem, chosenMatch) {
  const outfit = [baseItem, chosenMatch];
  const usedTypes = new Set(outfit.map(i => i.type));
  const usedIds = new Set(outfit.map(i => i.id));
  const remainingTypes = ["top", "bottom", "outer", "shoes", "accessory", "dress"]
    .filter(t => !usedTypes.has(t));

  remainingTypes.forEach(type => {
    const candidates = items
      .filter(i => !usedIds.has(i.id) && i.type === type)
      .filter(i => outfit.every(o => typesPair(o.type, i.type) || o.type === i.type))
      .map(i => ({
        item: i,
        score: outfit.reduce((s, o) => s + colorScore(o, i) + seasonOverlap(o.seasons, i.seasons), 0)
      }))
      .sort((a, b) => b.score - a.score);
    if (candidates.length) {
      outfit.push(candidates[0].item);
      usedIds.add(candidates[0].item.id);
    }
  });
  return outfit;
}

function openOutfitModal(baseItem, chosenMatch) {
  const outfit = buildFullOutfit(baseItem, chosenMatch);
  const board = document.getElementById("outfit-board");
  const palette = document.getElementById("outfit-palette");
  const impact = document.getElementById("outfit-impact");
  document.getElementById("outfit-modal-title").textContent = `ลุค: ${outfit.map(i => i.name).join(" + ")}`;

  board.innerHTML = outfit.map(i => `
    <div class="outfit-piece outfit-piece--${i.type}">
      <div class="outfit-thumb" style="${i.image ? `background-image:url('${i.image}')` : `background:${i.color}`}"></div>
      <div class="outfit-piece-name">${escapeHTML(i.name)}</div>
      <div class="outfit-piece-meta">${TYPE_LABEL[i.type]} · ${escapeHTML(i.fabric)}</div>
    </div>`).join("");

  palette.innerHTML = outfit.map(i => `
    <div class="palette-swatch" style="background:${itemColor(i)}" title="${escapeHTML(i.name)}: ${itemColor(i)}"></div>`).join("");

  const totalCarbon = outfit.reduce((s, i) => s + (i.carbonFootprintKg || 0), 0);
  const avgRecycled = Math.round(outfit.reduce((s, i) => s + (i.recycledContent || 0), 0) / outfit.length);
  impact.innerHTML = `🌍 คาร์บอนฟุตพรินท์รวมของลุคนี้ ≈ <strong>${totalCarbon.toFixed(1)} กก. CO2e</strong> (ค่าประมาณ)
    &nbsp;·&nbsp; ♻️ เนื้อผ้ารีไซเคิลเฉลี่ย <strong>${avgRecycled}%</strong>`;

  document.getElementById("outfit-modal").classList.add("is-open");
}

document.getElementById("outfit-modal-close").addEventListener("click", () => {
  document.getElementById("outfit-modal").classList.remove("is-open");
});
document.getElementById("outfit-modal").addEventListener("click", (e) => {
  if (e.target.id === "outfit-modal") document.getElementById("outfit-modal").classList.remove("is-open");
});

// ============================================================
// DONATE TAB
// ============================================================
function renderDonateSelect() {
  const sel = document.getElementById("donate-select");
  sel.innerHTML = items.map(i => `<option value="${i.id}">${escapeHTML(i.name)} — ${escapeHTML(i.fabric)}</option>`).join("");
  if (!donateMapInstance) {
    renderDonateResults(DONATION_POINTS);
    renderDonateMap(DONATION_POINTS, null);
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

document.getElementById("locate-btn").addEventListener("click", () => {
  const status = document.getElementById("locate-status");
  const sel = document.getElementById("donate-select");
  const item = items.find(i => i.id === sel.value);
  if (!item) { status.textContent = "เพิ่มเสื้อผ้าในตู้ก่อน"; return; }

  const impactNote = document.getElementById("impact-note");
  const carbon = item.carbonFootprintKg || estimateCarbonKg(item.type, item.fabric);
  impactNote.innerHTML = `🌍 การส่งต่อ/บริจาค "${escapeHTML(item.name)}" แทนการทิ้ง ช่วยลดความจำเป็นในการผลิตชิ้นใหม่ทดแทน — ประหยัดคาร์บอนได้ประมาณ <strong>${carbon.toFixed(1)} กก. CO2e</strong> และลดผ้าที่ต้องไปฝังกลบ/เผา (ตัวเลขเป็นค่าประมาณเพื่อการรับรู้ทั่วไป ไม่ใช่ค่าที่วัดจริง)`;

  const fabricLower = item.fabric.toLowerCase();
  const matches = DONATION_POINTS.filter(p =>
    p.accepts.some(a => fabricLower.includes(a.toLowerCase()) || a.toLowerCase().includes(fabricLower.split(" ")[0]))
  );
  const pool = matches.length ? matches : DONATION_POINTS;

  if (!navigator.geolocation) {
    status.textContent = "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง แสดงจุดรับบริจาคทั้งหมดแทน";
    const list = pool.map(p => ({ ...p }));
    renderDonateResults(list);
    renderDonateMap(list, null);
    return;
  }

  status.textContent = "กำลังค้นหาตำแหน่งของคุณ…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const withDist = pool
        .map(p => ({ ...p, distanceKm: haversineKm(latitude, longitude, p.lat, p.lng) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      status.textContent = matches.length
        ? `พบ ${matches.length} จุดที่รับผ้าประเภทนี้ เรียงตามระยะทาง`
        : `ไม่พบจุดที่รับผ้าประเภทนี้โดยเฉพาะ แสดงจุดที่ใกล้ที่สุดแทน`;
      renderDonateResults(withDist);
      renderDonateMap(withDist, { lat: latitude, lng: longitude });
    },
    () => {
      status.textContent = "ไม่สามารถเข้าถึงตำแหน่งได้ แสดงจุดรับบริจาคทั้งหมดแทน";
      const list = pool.map(p => ({ ...p }));
      renderDonateResults(list);
      renderDonateMap(list, null);
    }
  );
});

// ------------------------------------------------------------
// Map view (Leaflet + OpenStreetMap tiles — free, no API key).
// Behaves like a Google Maps pin view: markers with popups that
// deep-link out to Google Maps for turn-by-turn directions.
// ------------------------------------------------------------
let donateMapInstance = null;
let donateMapMarkers = [];

function renderDonateMap(points, userLoc) {
  const container = document.getElementById("donate-map");
  if (!donateMapInstance) {
    donateMapInstance = L.map(container);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(donateMapInstance);
  }
  donateMapMarkers.forEach(m => donateMapInstance.removeLayer(m));
  donateMapMarkers = [];

  const bounds = [];
  if (userLoc) {
    const meMarker = L.circleMarker([userLoc.lat, userLoc.lng], {
      radius: 8, color: "#B5533C", fillColor: "#B5533C", fillOpacity: 0.9
    }).addTo(donateMapInstance).bindPopup("ตำแหน่งของคุณ");
    donateMapMarkers.push(meMarker);
    bounds.push([userLoc.lat, userLoc.lng]);
  }
  points.forEach(p => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    const marker = L.marker([p.lat, p.lng]).addTo(donateMapInstance).bindPopup(`
      <strong>${escapeHTML(p.name)}</strong><br>
      ${escapeHTML(p.address)}${p.distanceKm != null ? `<br>ห่างประมาณ ${p.distanceKm.toFixed(1)} กม.` : ""}<br>
      รับ: ${p.accepts.slice(0, 4).map(escapeHTML).join(", ")}<br>
      <a href="${mapsUrl}" target="_blank" rel="noopener">เปิดใน Google Maps</a>
    `);
    donateMapMarkers.push(marker);
    bounds.push([p.lat, p.lng]);
  });

  if (bounds.length) donateMapInstance.fitBounds(bounds, { padding: [30, 30] });
  else donateMapInstance.setView([13.7563, 100.5018], 11); // fallback: Bangkok
  setTimeout(() => donateMapInstance.invalidateSize(), 150);
}

function renderDonateResults(points) {
  const wrap = document.getElementById("donate-results");
  wrap.innerHTML = "";
  points.forEach(p => {
    const card = document.createElement("div");
    card.className = "donate-card";
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    card.innerHTML = `
      <h3>${escapeHTML(p.name)}</h3>
      <div class="donate-meta">${escapeHTML(p.address)}${p.distanceKm != null ? ` · ห่างประมาณ ${p.distanceKm.toFixed(1)} กม.` : ""}</div>
      <div class="donate-accepts">รับ: ${p.accepts.slice(0, 4).map(escapeHTML).join(", ")}${p.accepts.length > 4 ? " …" : ""}</div>
      <a class="donate-link" href="${mapsUrl}" target="_blank" rel="noopener">เปิดใน Google Maps</a>`;
    wrap.appendChild(card);
  });
}

// ============================================================
// INIT
// ============================================================
renderCloset();
