// ============================================================
// STATE + STORAGE
// ============================================================
const STORAGE_KEY = "wardrobe_items_v1";
const OWNER_STORAGE_KEY = "wardrobe_active_owner_v1";
const OWNER_NAMES = ["A", "B", "C", "D"];

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
let currentDetectedPalette = [];
let activeOwner = OWNER_NAMES[0];
try {
  const savedOwner = localStorage.getItem(OWNER_STORAGE_KEY);
  if (OWNER_NAMES.includes(savedOwner)) activeOwner = savedOwner;
} catch (e) {
  console.error("Could not read active wardrobe owner:", e);
}

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

const activeOwnerSelect = document.getElementById("active-owner");
activeOwnerSelect.value = activeOwner;
activeOwnerSelect.addEventListener("change", () => {
  activeOwner = activeOwnerSelect.value;
  try {
    localStorage.setItem(OWNER_STORAGE_KEY, activeOwner);
  } catch (e) {
    console.error("Could not save active wardrobe owner:", e);
  }
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
// MULTI-COLOR PALETTE DETECTION FROM UPLOADED PHOTO
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

function detectItemPalette(imgEl, colorCount = 3) {
  const SIZE = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  const imgW = imgEl.naturalWidth || imgEl.width;
  const imgH = imgEl.naturalHeight || imgEl.height;
  if (!imgW || !imgH) return null;

  const scale = Math.min(SIZE / imgW, SIZE / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const drawX = (SIZE - drawW) / 2;
  const drawY = (SIZE - drawH) / 2;
  ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);

  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

  // Background estimation from edges
  const left = Math.floor(drawX), top = Math.floor(drawY);
  const right = Math.ceil(drawX + drawW), bottom = Math.ceil(drawY + drawH);
  const edgeBand = Math.max(1, Math.round(Math.min(drawW, drawH) * 0.08));
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

  // Extract color palette
  const BIN = 24;
  const bins = new Map();
  let counted = 0;

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * SIZE + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] < 128) continue;
      if (background && Math.hypot(r - background.r, g - background.g, b - background.b) < 38) continue;
      const key = [Math.floor(r / BIN) * BIN, Math.floor(g / BIN) * BIN, Math.floor(b / BIN) * BIN].join(",");
      const bin = bins.get(key) || { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      bin.count++; bin.rSum += r; bin.gSum += g; bin.bSum += b;
      bins.set(key, bin);
      counted++;
    }
  }

  if (!counted) return null;

  const sortedBins = [...bins.values()].sort((a, b) => b.count - a.count);
  const palette = sortedBins.slice(0, colorCount).map(bin => {
    const r = Math.round(bin.rSum / bin.count);
    const g = Math.round(bin.gSum / bin.count);
    const b = Math.round(bin.bSum / bin.count);
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  });

  const dominantR = Math.round(sortedBins[0].rSum / sortedBins[0].count);
  const dominantG = Math.round(sortedBins[0].gSum / sortedBins[0].count);
  const dominantB = Math.round(sortedBins[0].bSum / sortedBins[0].count);
  const dominantHex = "#" + [dominantR, dominantG, dominantB].map(v => v.toString(16).padStart(2, "0")).join("");
  const [h, s, l] = rgbToHsl(dominantR, dominantG, dominantB);
  const confidence = Math.round((sortedBins[0].count / counted) * 100);

  return {
    hex: dominantHex,
    palette,
    bucket: bucketFromHue(h, s, l),
    confidence
  };
}

document.getElementById("f-image").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const status = document.getElementById("color-detect-status");
  if (!file) { status.textContent = ""; return; }
  status.textContent = "กำลังตรวจจับสีและพาเลตจากรูป…";
  try {
    const dataUrl = await fileToDataURL(file);
    const img = await loadImageEl(dataUrl);
    const result = detectItemPalette(img);
    if (result) {
      document.getElementById("f-color").value = result.hex;
      document.getElementById("f-colorbucket").value = result.bucket;
      currentDetectedPalette = result.palette;
      status.textContent = `ตรวจพบสีหลัก ${result.hex} และพาเลตประจำชิ้น (${result.palette.join(", ")}) — ความมั่นใจ ${result.confidence}%`;
    } else {
      status.textContent = "ตรวจจับสีจากรูปไม่สำเร็จ กรุณาเลือกสีเอง";
      currentDetectedPalette = [];
    }
  } catch (err) {
    console.error(err);
    status.textContent = "ตรวจจับสีจากรูปไม่สำเร็จ กรุณาเลือกสีเอง";
    currentDetectedPalette = [];
  }
});

// ============================================================
// DPP (Digital Product Passport) QR SCAN
// ============================================================
const dppScanBtn = document.getElementById("dpp-scan-btn");
const dppScanInput = document.getElementById("dpp-scan-input");
const dppStatus = document.getElementById("dpp-status");
const dppDemoSelect = document.getElementById("dpp-demo-select");

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
  currentDetectedPalette = record.palette || (record.color ? [record.color] : []);
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
// TAG SCAN (on-device OCR via Tesseract.js)
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
  const chosenColor = document.getElementById("f-color").value;

  const item = {
    ...existingItem,
    id: existingItem ? existingItem.id : Date.now().toString(36),
    name: document.getElementById("f-name").value.trim(),
    brand: document.getElementById("f-brand").value.trim() || null,
    owner: existingItem ? existingItem.owner || "ไม่ระบุ" : activeOwner,
    type,
    color: chosenColor,
    palette: currentDetectedPalette.length ? currentDetectedPalette : (existingItem?.palette || [chosenColor]),
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
  currentDetectedPalette = [];
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
  currentDetectedPalette = item.palette || [];
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
  const brandFilter = document.getElementById("filter-brand");
  const ownerFilter = document.getElementById("filter-owner");
  updateFilterOptions(brandFilter, items.map(item => item.brand), "ทุกแบรนด์");
  updateFilterOptions(ownerFilter, items.map(item => item.owner || "ไม่ระบุ"), "ทุกคน");
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<div class="empty-note">ตู้เสื้อผ้ายังว่างอยู่ — เพิ่มชิ้นแรกของคุณทางซ้าย</div>`;
    return;
  }
  const colorFilter = document.getElementById("filter-color").value;
  const typeFilter = document.getElementById("filter-type").value;
  const visibleItems = items.filter(item =>
    (!colorFilter || item.colorBucket === colorFilter) &&
    (!brandFilter.value || item.brand === brandFilter.value) &&
    (!ownerFilter.value || (item.owner || "ไม่ระบุ") === ownerFilter.value) &&
    (!typeFilter || item.type === typeFilter)
  );
  if (!visibleItems.length) {
    grid.innerHTML = `<div class="empty-note">ไม่พบเสื้อผ้าที่ตรงกับตัวกรอง</div>`;
    return;
  }
  visibleItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    const carbon = item.carbonFootprintKg;
    const itemPaletteHtml = (item.palette || [itemColor(item)])
      .map(c => `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${c};margin-right:3px;border:1px solid rgba(0,0,0,0.1)"></span>`)
      .join("");

    card.innerHTML = `
      <div class="item-thumb" style="${item.image ? `background-image:url('${item.image}')` : ""}">
        ${item.image ? "" : "👕"}
      </div>
      <div class="item-body">
        <div class="item-name">${escapeHTML(item.name)}</div>
        ${item.brand ? `<div class="item-meta">${escapeHTML(item.brand)}</div>` : ""}
        <div class="item-meta">เจ้าของ: ${escapeHTML(item.owner || "ไม่ระบุ")}</div>
        <div class="item-meta">${TYPE_LABEL[item.type] || item.type} · ${(item.seasons || []).map(s => SEASON_LABEL[s]).join(", ") || "ทุกฤดู"}</div>
        <div class="item-meta" style="display:flex;align-items:center;margin-top:4px;">พาเลต: ${itemPaletteHtml}</div>
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

function updateFilterOptions(select, values, allLabel) {
  const currentValue = select.value;
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.replaceChildren(new Option(allLabel, ""));
  options.forEach(value => select.add(new Option(value, value)));
  select.value = options.includes(currentValue) ? currentValue : "";
}

document.querySelectorAll("#filter-color, #filter-brand, #filter-owner, #filter-type")
  .forEach(select => select.addEventListener("change", renderCloset));
document.getElementById("clear-filters").addEventListener("click", () => {
  document.querySelectorAll("#filter-color, #filter-brand, #filter-owner, #filter-type")
    .forEach(select => { select.value = ""; });
  renderCloset();
});

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ============================================================
// PALETTE MATCHING ALGORITHM
// ============================================================
function itemColor(item) {
  if (typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color)) return item.color;
  return { neutral: "#A9A29A", warm: "#B5533C", cool: "#587887" }[item.colorBucket] || "#8A7F6A";
}

function itemPaletteColors(item) {
  const colors = Array.isArray(item.palette) ? item.palette : [];
  return [...new Set([itemColor(item), ...colors].filter(color => /^#[0-9a-f]{6}$/i.test(color)))];
}

function pairHarmonyScore(firstColor, secondColor) {
  const parseRgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const firstHsl = rgbToHsl(...parseRgb(firstColor));
  const secondHsl = rgbToHsl(...parseRgb(secondColor));
  const firstNeutral = firstHsl[1] < 0.18 || firstHsl[2] > 0.9 || firstHsl[2] < 0.12;
  const secondNeutral = secondHsl[1] < 0.18 || secondHsl[2] > 0.9 || secondHsl[2] < 0.12;
  if (firstNeutral || secondNeutral) return 88;

  const hueDifference = Math.abs(firstHsl[0] - secondHsl[0]);
  const hueGap = Math.min(hueDifference, 360 - hueDifference);
  let score = 56;
  if (hueGap <= 18) score = 94;
  else if (hueGap <= 38) score = 86;
  else if (hueGap <= 70) score = 76;
  else if (hueGap >= 155) score = 90;
  else if (hueGap >= 125) score = 82;

  const lightnessGap = Math.abs(firstHsl[2] - secondHsl[2]);
  return Math.max(40, score - Math.max(0, lightnessGap - 0.45) * 30);
}

function getBestMatchingPalette(outfitItems) {
  const colors = [...new Set(outfitItems.flatMap(itemPaletteColors))];
  const pairScores = [];
  for (let first = 0; first < colors.length; first++) {
    for (let second = first + 1; second < colors.length; second++) {
      pairScores.push(pairHarmonyScore(colors[first], colors[second]));
    }
  }
  const score = pairScores.length
    ? Math.round(pairScores.reduce((sum, value) => sum + value, 0) / pairScores.length)
    : 100;
  return {
    palette: { name: "พาเลตจากสีเสื้อผ้าในชุด", colors },
    score
  };
}

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
    .map(candidate => {
      const outfit = [base, candidate];
      const paletteMatch = getBestMatchingPalette(outfit);
      const totalScore = Math.min(100, paletteMatch.score + (seasonOverlap(base.seasons, candidate.seasons) * 10));

      return {
        item: candidate,
        score: totalScore,
        matchedPalette: paletteMatch.palette
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    results.innerHTML = `<div class="empty-note">ยังไม่มีชิ้นที่จับคู่กับ “${escapeHTML(base.name)}” ได้ ลองเพิ่มชิ้นอื่นในตู้</div>`;
    return;
  }

  scored.slice(0, 6).forEach(({ item, score, matchedPalette }) => {
    const row = document.createElement("div");
    row.className = "match-pair";
    row.innerHTML = `
      <div class="match-thumb" style="${item.image ? `background-image:url('${item.image}')` : `background:${item.color}`}"></div>
      <div>
        <div class="item-name">${escapeHTML(item.name)}</div>
        <div class="item-meta">${TYPE_LABEL[item.type]} · ${escapeHTML(item.fabric)}</div>
        <div class="item-meta">โทนพาเลต: <strong>${escapeHTML(matchedPalette.name)}</strong></div>
        <div class="match-palette" aria-label="สีในพาเลตชุดนี้">${matchedPalette.colors.map(color =>
          `<span class="match-palette-swatch" style="background:${color}" title="${color}"></span>`).join("")}</div>
      </div>
      <span class="score">${score}% เข้ากัน</span>
      <button class="btn-ghost btn-look" data-id="${item.id}">ดูลุคเต็ม</button>`;
    results.appendChild(row);
  });

  results.querySelectorAll(".btn-look").forEach(btn => {
    btn.addEventListener("click", () => openOutfitModal(base, items.find(i => i.id === btn.dataset.id)));
  });
}

// ------------------------------------------------------------
// Full outfit build
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
      .map(candidate => {
        const testOutfit = [...outfit, candidate];
        const match = getBestMatchingPalette(testOutfit);
        return { item: candidate, score: match.score };
      })
      .sort((a, b) => b.score - a.score);

    if (candidates.length && candidates[0].score > 40) {
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

  const bestMatch = getBestMatchingPalette(outfit);

  document.getElementById("outfit-modal-title").textContent = `ลุค: ${outfit.map(i => i.name).join(" + ")} (เข้ากับพาเลต: ${bestMatch.palette.name})`;

  board.innerHTML = outfit.map(i => `
    <div class="outfit-piece outfit-piece--${i.type}">
      <div class="outfit-thumb" style="${i.image ? `background-image:url('${i.image}')` : `background:${i.color}`}"></div>
      <div class="outfit-piece-name">${escapeHTML(i.name)}</div>
      <div class="outfit-piece-meta">${TYPE_LABEL[i.type]} · ${escapeHTML(i.fabric)}</div>
    </div>`).join("");

  palette.innerHTML = bestMatch.palette.colors.map(colorHex => `
    <div class="palette-swatch" style="background:${colorHex}" title="Color: ${colorHex}"></div>`).join("");

  const totalCarbon = outfit.reduce((s, i) => s + (i.carbonFootprintKg || 0), 0);
  const avgRecycled = Math.round(outfit.reduce((s, i) => s + (i.recycledContent || 0), 0) / outfit.length);
  impact.innerHTML = `🎨 คะแนนความเข้ากันของพาเลตสี: <strong>${bestMatch.score}%</strong> (${bestMatch.palette.name})<br>
    🌍 คาร์บอนฟุตพรินท์รวม ≈ <strong>${totalCarbon.toFixed(1)} กก. CO2e</strong>
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
const destinationTypeSelect = document.getElementById("destination-type");
destinationTypeSelect.addEventListener("change", () => {
  document.getElementById("locate-status").textContent = "";
  displayDestinationPoints();
});

function renderDonateSelect() {
  const sel = document.getElementById("donate-select");
  sel.innerHTML = items.map(i => `<option value="${i.id}">${escapeHTML(i.name)} — ${escapeHTML(i.fabric)}</option>`).join("");
  displayDestinationPoints();
}

function displayDestinationPoints() {
  const points = DONATION_POINTS.filter(point => point.category === destinationTypeSelect.value);
  const status = document.getElementById("locate-status");
  if (!points.length) {
    const category = DESTINATION_CATEGORIES.find(entry => entry.id === destinationTypeSelect.value);
    status.textContent = `ยังไม่มีข้อมูล${category?.name || "จุดปลายทางประเภทนี้"} — เพิ่มจุดจริงใน js/donation-data.js`;
  }
  renderDonateResults(points);
  renderDonateMap(points, null);
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
  const selectedCategory = DESTINATION_CATEGORIES.find(category => category.id === destinationTypeSelect.value);
  impactNote.textContent = `ประเภทปลายทาง: ${selectedCategory?.name || "ไม่ระบุ"} · คาร์บอนฟุตพรินท์ของเสื้อผ้าชิ้นนี้ประมาณ ${carbon.toFixed(1)} กก. CO2e (ค่าประมาณ ไม่ใช่คาร์บอนที่ลดได้)`;

  const categoryPoints = DONATION_POINTS.filter(point => point.category === destinationTypeSelect.value);
  if (!categoryPoints.length) {
    status.textContent = `ยังไม่มีข้อมูล${selectedCategory?.name || "จุดปลายทางประเภทนี้"} — เพิ่มจุดจริงใน js/donation-data.js`;
    renderDonateResults([]);
    renderDonateMap([], null);
    return;
  }

  const fabricLower = item.fabric.toLowerCase();
  const matches = categoryPoints.filter(p =>
    p.accepts.some(a => fabricLower.includes(a.toLowerCase()) || a.toLowerCase().includes(fabricLower.split(" ")[0]))
  );
  const pool = matches.length ? matches : categoryPoints;

  if (!navigator.geolocation) {
    status.textContent = `อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง แสดง${selectedCategory?.name || "จุดปลายทาง"}แทน`;
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
        ? `พบ ${matches.length} จุด${selectedCategory?.name || ""}ที่รับผ้าประเภทนี้ เรียงตามระยะทาง`
        : `ไม่พบจุดที่รับผ้าประเภทนี้โดยเฉพาะ แสดง${selectedCategory?.name || "จุดปลายทาง"}ใกล้ที่สุดแทน`;
      renderDonateResults(withDist);
      renderDonateMap(withDist, { lat: latitude, lng: longitude });
    },
    () => {
      status.textContent = `ไม่สามารถเข้าถึงตำแหน่งได้ แสดง${selectedCategory?.name || "จุดปลายทาง"}แทน`;
      const list = pool.map(p => ({ ...p }));
      renderDonateResults(list);
      renderDonateMap(list, null);
    }
  );
});

// Map view
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
    const category = DESTINATION_CATEGORIES.find(entry => entry.id === p.category);
    const marker = L.marker([p.lat, p.lng]).addTo(donateMapInstance).bindPopup(`
      <strong>${escapeHTML(p.name)}</strong><br>
      ${escapeHTML(category?.name || "จุดปลายทาง")}<br>
      ${escapeHTML(p.address)}${p.distanceKm != null ? `<br>ห่างประมาณ ${p.distanceKm.toFixed(1)} กม.` : ""}<br>
      รับ: ${p.accepts.slice(0, 4).map(escapeHTML).join(", ")}<br>
      <a href="${mapsUrl}" target="_blank" rel="noopener">เปิดใน Google Maps</a>
    `);
    donateMapMarkers.push(marker);
    bounds.push([p.lat, p.lng]);
  });

  if (bounds.length) donateMapInstance.fitBounds(bounds, { padding: [30, 30] });
  else donateMapInstance.setView([13.7563, 100.5018], 11);
  setTimeout(() => donateMapInstance.invalidateSize(), 150);
}

function renderDonateResults(points) {
  const wrap = document.getElementById("donate-results");
  wrap.innerHTML = "";
  if (!points.length) {
    wrap.innerHTML = `<div class="empty-note">ยังไม่มีจุดปลายทางประเภทนี้ในข้อมูล</div>`;
    return;
  }
  points.forEach(p => {
    const card = document.createElement("div");
    card.className = "donate-card";
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    const category = DESTINATION_CATEGORIES.find(entry => entry.id === p.category);
    card.innerHTML = `
      <h3>${escapeHTML(p.name)}</h3>
      <div class="donate-category">${escapeHTML(category?.name || "จุดปลายทาง")}</div>
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