document.getElementById("guide-content").innerHTML = `
  <header class="panel-head">
    <h1>คู่มือการจัดการเสื้อผ้า &amp; ผลกระทบทางสิ่งแวดล้อม</h1>
    <p class="sub">เข้าใจวงจรชีวิตสิ่งทอ สถิติขยะระดับโลก และวิธีส่งต่อเสื้อผ้าอย่างถูกวิธีผ่านเว็บแอป Re-Wear</p>
  </header>

  <section class="guide-impact-hero" aria-labelledby="guide-impact-title">
    <h2 id="guide-impact-title">🌍 วงจรชีวิตเสื้อผ้า (User Journey) &amp; วิกฤตขยะสิ่งทอ</h2>
    <div class="journey-steps">
      <article class="journey-step">
        <strong>1. ซื้อและครอบครอง (Buy)</strong>
        <p>คนเราซื้อเสื้อผ้ามากขึ้น 60% เมื่อเทียบกับปี 2000 แต่เก็บไว้ใช้นานลดลงเหลือเพียงครึ่งเดียว</p>
      </article>
      <article class="journey-step">
        <strong>2. สวมใส่และดูแล (Wear &amp; Care)</strong>
        <p>การซักผ้าใยสังเคราะห์ปล่อย Microplastics กว่า 0.5 ล้านตันลงสู่มหาสมุทรต่อปี</p>
      </article>
      <article class="journey-step">
        <strong>3. ถูกลืมในตู้ (Unused)</strong>
        <p>เสื้อผ้าในตู้เฉลี่ยมากกว่า 30% ไม่เคยถูกหยิบมาใส่เลยในรอบ 1 ปีเต็ม</p>
      </article>
      <article class="journey-step">
        <strong>4. ปลายทางขยะ (Dispose)</strong>
        <p>87% ของสิ่งทอจบลงด้วยการถูกเผาหรือฝังกลบ มีเพียง 1% เท่านั้นที่ถูกรีไซเคิลเป็นเสื้อผ้าใหม่</p>
      </article>
    </div>

    <div class="stats-grid" aria-label="สถิติผลกระทบจากอุตสาหกรรมสิ่งทอ">
      <div class="guide-stat"><strong>92 ล้านตัน</strong><span>ขยะสิ่งทอทั่วโลกที่เกิดขึ้นต่อปี</span></div>
      <div class="guide-stat"><strong>10%</strong><span>สัดส่วนการปล่อยก๊าซเรือนกระจกโลกจากอุตสาหกรรมแฟชั่น</span></div>
      <div class="guide-stat"><strong>2,700 ลิตร</strong><span>น้ำที่ใช้ผลิตเสื้อยืดฝ้าย 1 ตัว (เพียงพอให้ 1 คนดื่มได้ 2.5 ปี)</span></div>
    </div>
  </section>

  <section class="guide-how-helps" aria-labelledby="guide-how-title">
    <h2 id="guide-how-title">✨ เว็บแอป Re-Wear ช่วยคุณแก้ปัญหานี้อย่างไร?</h2>
    <ul>
      <li><strong>ดิจิทัลตู้เสื้อผ้า (Digital Closet):</strong> บันทึกชนิดผ้า สแกนป้ายด้วย AI OCR และอ่าน Digital Product Passport (DPP) ทำให้เห็นเสื้อผ้าทั้งหมดที่มี ลดการซื้อซ้ำซ้อน</li>
      <li><strong>ฟังก์ชันจับคู่ชุด (Smart Match):</strong> ช่วยแนะนำการแมตช์เสื้อผ้าที่คุณมีอยู่แล้ว ดึงเสื้อผ้าที่ลืมไว้กลับมาหมุนเวียนใส่ เพิ่มจำนวนครั้งในการใช้งาน (Extend Garment Life)</li>
      <li><strong>ประเมินคาร์บอน (Carbon Footprint Tracking):</strong> คำนวณรอยเท้าคาร์บอนของเสื้อผ้าแต่ละชิ้น เพื่อสร้างความตระหนักในการเลือกซื้อและสวมใส่</li>
      <li><strong>ค้นหาจุดส่งต่อตามพิกัด (Location-Based Route):</strong> เชื่อมต่อกับ Leaflet Map ช่วยค้นหาจุดบริจาค ร้านขายต่อ หรือจุดรับรีไซเคิลใกล้คุณได้อย่างแม่นยำ ไม่ปล่อยให้เสื้อผ้ากลายเป็นขยะฝังกลบ</li>
    </ul>
  </section>

  <div class="guide-grid">
    <article class="guide-item guide-item-recycle">
      <p class="guide-kicker">01 · วัสดุกลับมาใช้ใหม่</p>
      <h2>จุดรับรีไซเคิล (Recycling)</h2>
      <p class="guide-summary">เหมาะสำหรับเสื้อผ้าที่ชำรุด ขาด ตะเข็บหลุด หรือผ้าที่ไม่สามารถนำมาใส่ซ้ำหรือบริจาคต่อได้แล้ว</p>
      <div class="guide-section">
        <h3>กระบวนการและสิ่งที่ควรรู้</h3>
        <ul>
          <li><strong>Mechanical Recycling (ทางกล):</strong> ย่อยสลายเส้นใยเพื่อนำไปปั่นด้ายใหม่ หรือทำเป็นฉนวนกันความร้อน ผ้าเช็ดพื้น และวัสดุกันกระแทก (เหมาะกับผ้าฝ้าย 100% หรือผ้าวูล)</li>
          <li><strong>Chemical Recycling (ทางเคมี):</strong> ใช้สารเคมีสกัดโพลีเอสเตอร์และเคมีภัณฑ์เพื่อกลับเป็นเม็ดพลาสติก (เหมาะกับผ้าสังเคราะห์และผ้าใยผสม)</li>
          <li><strong>วิธีเตรียม:</strong> ซักให้สะอาด ซับน้ำให้แห้งสนิทเพื่อป้องกันเชื้อรา ถอดอะไหล่โลหะ ซิป หรือกระดุมออกหากทำได้</li>
        </ul>
      </div>
    </article>

    <article class="guide-item guide-item-resale">
      <p class="guide-kicker">02 · ส่งต่อให้เจ้าของใหม่</p>
      <h2>ขายมือสอง (Resale / Second-hand)</h2>
      <p class="guide-summary">เหมาะสำหรับเสื้อผ้าสภาพดี 70-90%+ ไม่มีรอยเปื้อนฝังลึก เป็นสินค้ายี่ห้อหรือมีดีไซน์เฉพาะตัว</p>
      <div class="guide-section">
        <h3>ข้อแนะนำและขั้นตอนจัดการ</h3>
        <ul>
          <li><strong>การเตรียมสภาพ:</strong> ซักรีดให้เรียบร้อย ตรวจเช็กซิป กระดุม และป้ายกำกับดูแลรักษา (Care Tag) ให้สมบูรณ์</li>
          <li><strong>ช่องทางจัดจำหน่าย:</strong> ตลาดมือสองออนไลน์ (เช่น Thrift+, Instagram, Facebook Group) หรือฝากขายกับร้านรวบรวมเสื้อผ้ามือสอง</li>
          <li><strong>ประโยชน์:</strong> ยืดอายุการใช้งานเสื้อผ้าได้ 9 เดือน ช่วยลด Carbon Footprint ของเสื้อผ้าชิ้นนั้นลงได้ถึง 20-30%</li>
        </ul>
      </div>
    </article>

    <article class="guide-item guide-item-donate">
      <p class="guide-kicker">03 · แบ่งปันให้ผู้ที่ต้องการ</p>
      <h2>จุดรับบริจาค (Donation)</h2>
      <p class="guide-summary">เหมาะสำหรับเสื้อผ้าสภาพดี สะอาด พร้อมใช้งาน และตรงตามความต้องการของมูลนิธิหรือกลุ่มผู้รับ</p>
      <div class="guide-section">
        <h3>เกณฑ์การเลือกและข้อระวัง</h3>
        <ul>
          <li><strong>สภาพที่เหมาะสม:</strong> เสื้อผ้าต้องสะอาด ไม่มีคราบ สภาพดี พร้อมใส่ต่อได้ทันที (หลีกเลี่ยงการบริจาคชุดชั้นในเก่าหรือเสื้อผ้าขาดเปื่อย)</li>
          <li><strong>คัดแยกตามวัตถุประสงค์:</strong> ตรวจสอบว่ามูลนิธิรับประเภทใด เช่น ชุดนักเรียน เสื้อกันหนาว หรือชุดทำงาน</li>
          <li><strong>การแพ็กส่ง:</strong> พับระเบียบและบรรจุใส่ถุงพลาสติกใสเพื่อป้องกันความชื้นและฝุ่นระหว่างขนส่ง</li>
        </ul>
      </div>
    </article>
  </div>

  <section class="guide-references-block" aria-labelledby="guide-references-title">
    <h2 id="guide-references-title">📚 แหล่งอ้างอิงข้อมูลและรายงานศึกษา (References)</h2>
    <ul>
      <li><strong>European Environment Agency (EEA)</strong> — Textile Waste &amp; Circular Economy Strategy: <a href="https://www.eea.europa.eu/publications/textiles-in-europes-circular-economy" target="_blank" rel="noopener noreferrer">https://www.eea.europa.eu/publications/textiles-in-europes-circular-economy</a></li>
      <li><strong>Ellen MacArthur Foundation</strong> — A New Textiles Economy: Redesigning Fashion’s Future: <a href="https://ellenmacarthurfoundation.org/a-new-textiles-economy" target="_blank" rel="noopener noreferrer">https://ellenmacarthurfoundation.org/a-new-textiles-economy</a></li>
      <li><strong>European Parliament</strong> — The Impact of Textile Production and Waste on the Environment: <a href="https://www.europarl.europa.eu/topics/en/article/20201208STO93327/the-impact-of-textile-production-and-waste-on-the-environment" target="_blank" rel="noopener noreferrer">https://www.europarl.europa.eu/topics/en/article/20201208STO93327/the-impact-of-textile-production-and-waste-on-the-environment</a></li>
      <li><strong>UN Environment Programme (UNEP)</strong> — Sustainable Fashion and Textile Value Chains: <a href="https://www.unep.org/news-and-stories/story/environmental-costs-fast-fashion" target="_blank" rel="noopener noreferrer">https://www.unep.org/news-and-stories/story/environmental-costs-fast-fashion</a></li>
      <li><strong>McKinsey &amp; Company</strong> — Scaling Textile Recycling in Europe: <a href="https://www.mckinsey.com/industries/retail/our-insights/scaling-textile-recycling-in-europe-turning-waste-into-value" target="_blank" rel="noopener noreferrer">https://www.mckinsey.com/industries/retail/our-insights/scaling-textile-recycling-in-europe-turning-waste-into-value</a></li>
    </ul>
  </section>
`;