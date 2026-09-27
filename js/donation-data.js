// ------------------------------------------------------------------
// DONATION_POINTS — sample/placeholder data.
// Replace with your own real drop-off points, or fetch them from an
// API (e.g. your own backend, or a public open-data source) instead
// of hard-coding. Each "accepts" array should use the same fabric
// keywords you expect users to type/scan in the closet tab.
// ------------------------------------------------------------------
const DONATION_POINTS = [
  {
    name: "ตู้รับบริจาคเสื้อผ้า สยามพารากอน",
    address: "ถนนพระรามที่ 1 เขตปทุมวัน กรุงเทพฯ",
    lat: 13.7460, lng: 100.5340,
    accepts: ["ผ้าฝ้าย", "cotton", "โพลีเอสเตอร์", "polyester", "เดนิม", "denim"]
  },
  {
    name: "จุดรับบริจาค มูลนิธิกระจกเงา (สาขาเหม่งจ๋าย)",
    address: "ถนนลาดพร้าว เขตห้วยขวาง กรุงเทพฯ",
    lat: 13.7860, lng: 100.5760,
    accepts: ["ผ้าฝ้าย", "cotton", "ขนสัตว์", "wool", "ลินิน", "linen", "โพลีเอสเตอร์", "polyester"]
  },
  {
    name: "ถังผ้ารีไซเคิล เซ็นทรัลเวิลด์",
    address: "ถนนราชดำริ เขตปทุมวัน กรุงเทพฯ",
    lat: 13.7466, lng: 100.5393,
    accepts: ["โพลีเอสเตอร์", "polyester", "ไนลอน", "nylon", "สแปนเดกซ์", "spandex", "elastane"]
  },
  {
    name: "จุดรับบริจาค วัดสวนแก้ว (สาขากรุงเทพฯ)",
    address: "เขตบางกอกน้อย กรุงเทพฯ",
    lat: 13.7770, lng: 100.4720,
    accepts: ["ผ้าฝ้าย", "cotton", "ผ้าไหม", "silk", "เรยอน", "rayon", "viscose", "ขนสัตว์", "wool"]
  },
  {
    name: "ตู้รับบริจาค H&M (สาขาเซ็นทรัล ลาดพร้าว)",
    address: "ถนนพหลโยธิน เขตจตุจักร กรุงเทพฯ",
    lat: 13.8160, lng: 100.5610,
    accepts: ["ผ้าฝ้าย", "cotton", "โพลีเอสเตอร์", "polyester", "เดนิม", "denim", "สแปนเดกซ์", "spandex"]
  }
];
