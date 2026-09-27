// ============================================================
// DIGITAL PRODUCT PASSPORT (DPP) — demo layer
// ------------------------------------------------------------
// The EU's Digital Product Passport for textiles (under the
// Ecodesign for Sustainable Products Regulation, ESPR) is still
// being finalised — the delegated act defining mandatory data
// fields for textiles is expected in the second half of 2027,
// with phased rollout after that. There is no single public
// registry yet that a static front-end app can query for real
// garments.
//
// So this file ships a small MOCK registry that behaves the way
// a real DPP lookup should: scanning a QR code returns a
// structured record (composition, origin, care, carbon
// footprint, recycled content, brand). Swap MOCK_DPP_REGISTRY
// for a real API call once a registry is available to you, or
// point DPP_RESOLVE at your own backend.
// ============================================================

const MOCK_DPP_REGISTRY = {
  "DPP-DEMO-COAT": {
    name: "เสื้อโค้ตสีเขียวครีม (ตัวอย่าง)",
    brand: "Wardrobe Demo · ข้อมูลสาธิต",
    composition: [{ material: "ขนสัตว์ (Wool)", percent: 60 },
                  { material: "โพลีเอสเตอร์ (Polyester)", percent: 40 }],
    color: "#d3ffd6",
    colorBucket: "warm",
    care: "ข้อมูลการดูแลจำลอง — ตรวจสอบจากป้ายจริง",
    carbonFootprintKg: 20.0,
    recycledContent: 0,
    type: "outer",
    image: "assets/clothes/coat.jpg"
  },
  "DPP-DEMO-CREAM": {
    name: "เสื้อสีครีม (ตัวอย่าง)",
    brand: "Wardrobe Demo · ข้อมูลสาธิต",
    composition: [{ material: "ผ้าฝ้าย (Cotton)", percent: 100 }],
    color: "#E8E1D3",
    colorBucket: "neutral",
    care: "ข้อมูลการดูแลจำลอง — ตรวจสอบจากป้ายจริง",
    carbonFootprintKg: 9.1,
    recycledContent: 0,
    type: "top",
    image: "assets/clothes/cream.jpg"
  },
  "DPP-DEMO-JEANS": {
    name: "กางเกงยีนส์ (ตัวอย่าง)",
    brand: "Wardrobe Demo · ข้อมูลสาธิต",
    composition: [{ material: "ผ้าฝ้าย (Cotton)", percent: 98 },
                  { material: "อีลาสเทน (Elastane)", percent: 2 }],
    color: "#3B4A63",
    colorBucket: "cool",
    care: "ข้อมูลการดูแลจำลอง — ตรวจสอบจากป้ายจริง",
    carbonFootprintKg: 18.5,
    recycledContent: 0,
    type: "bottom",
    image: "assets/clothes/jeans.jpg"
  },
  "DPP-DEMO-COAT-RECYCLED": {
    name: "เสื้อโค้ตรีไซเคิล (ตัวอย่าง)",
    brand: "Wardrobe Demo · ข้อมูลสาธิต",
    composition: [{ material: "โพลีเอสเตอร์รีไซเคิล (Recycled Polyester)", percent: 100 }],
    color: "#75856A",
    colorBucket: "cool",
    care: "ซักน้ำเย็น แนะนำให้ซ่อมก่อนเปลี่ยนใหม่",
    carbonFootprintKg: 15.2,
    recycledContent: 100,
    type: "outer",
    image: "assets/clothes/coat.jpg",
    palette: ["#75856A", "#D8D2C2", "#465549"],
    image: "assets/clothes/coat2.jpg"
  },
  "DPP-DEMO-CREAM-LINEN": {
    name: "เสื้อครีมลินิน (ตัวอย่าง)",
    brand: "Wardrobe Demo · ข้อมูลสาธิต",
    composition: [{ material: "ลินิน (Linen)", percent: 100 }],
    color: "#E8E1D3",
    colorBucket: "neutral",
    care: "ซักโปรแกรมถนอมผ้า ตากผึ่งลม",
    carbonFootprintKg: 6.3,
    recycledContent: 0,
    type: "top",
    image: "assets/clothes/cream.jpg",
    palette: ["#E8E1D3", "#C8BCA8", "#F5F1E8"],
    image: "assets/clothes/cream-linen.jpg"
  },
  "DPP-DEMO-JEANS-RECYCLED": {
    name: "กางเกงยีนส์ผ้าฝ้ายรีไซเคิล (ตัวอย่าง)",
    brand: "Wardrobe Demo · ข้อมูลสาธิต",
    composition: [{ material: "ผ้าฝ้ายรีไซเคิล (Recycled Cotton)", percent: 80 },
                  { material: "โพลีเอสเตอร์รีไซเคิล (Recycled Polyester)", percent: 18 },
                  { material: "อีลาสเทน (Elastane)", percent: 2 }],
    color: "#3B4A63",
    colorBucket: "cool",
    care: "ซักกลับด้าน น้ำเย็น ตากผึ่งลม",
    carbonFootprintKg: 12.4,
    recycledContent: 98,
    type: "bottom",
    image: "assets/clothes/jeans2.jpg",
    palette: ["#3B4A63", "#8292A5", "#222D3D"]
  }
};

// Try to make sense of whatever a QR code contains:
// 1) raw JSON matching our schema
// 2) a URL/string containing one of our mock DPP ids (e.g. a GS1
//    Digital Link style URL: https://id.example.eu/dpp/DPP-DEMO-COAT)
// 3) a bare id like "DPP-000123"
function resolveDPP(scannedText) {
  if (!scannedText) return null;

  // 1) direct JSON payload
  try {
    const obj = JSON.parse(scannedText);
    if (obj && obj.name) return obj;
  } catch (_) { /* not JSON, keep trying */ }

  // 2) / 3) look for a known id anywhere in the string
  const idMatch = Object.keys(MOCK_DPP_REGISTRY).find(id => scannedText.includes(id));
  if (idMatch) return MOCK_DPP_REGISTRY[idMatch];

  return null;
}

// ============================================================
// CARBON FOOTPRINT — illustrative estimates only
// ------------------------------------------------------------
// These are rough, illustrative cradle-to-gate figures for
// general awareness, NOT a verified life-cycle assessment (LCA).
// Real per-garment figures vary a lot by supply chain; use a
// verified DPP/label figure when you have one instead.
// ============================================================
const BASE_CARBON_BY_TYPE = {
  top: 7, bottom: 10, dress: 12, outer: 20, accessory: 2, shoes: 14
};
const CARBON_MULTIPLIER_BY_FABRIC = [
  { match: /wool|ขนสัตว์/i, mult: 1.6 },
  { match: /silk|ไหม/i, mult: 1.8 },
  { match: /cotton|ฝ้าย/i, mult: 1.3 },
  { match: /denim|ยีนส์/i, mult: 1.4 },
  { match: /nylon|ไนลอน/i, mult: 1.1 },
  { match: /polyester|โพลีเอสเตอร์/i, mult: 0.8 },
  { match: /linen|ลินิน/i, mult: 0.9 },
  { match: /spandex|elastane|สแปนเดกซ์/i, mult: 0.9 },
  { match: /rayon|viscose|เรยอน/i, mult: 1.0 }
];

function estimateCarbonKg(type, fabricText) {
  const base = BASE_CARBON_BY_TYPE[type] ?? 8;
  const rule = CARBON_MULTIPLIER_BY_FABRIC.find(r => r.match.test(fabricText || ""));
  const mult = rule ? rule.mult : 1.0;
  return Math.round(base * mult * 10) / 10;
}
