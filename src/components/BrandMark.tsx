export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark${compact ? " compact" : ""}`} aria-label="نظام حساب الرسوم القضائية - وزارة العدل">
      <span className="brand-seal"><img src="/ministry-of-justice-seal.webp" alt="شعار وزارة العدل المصرية" /></span>
      {!compact && <span><small>وزارة العدل</small><strong>نظام حساب الرسوم القضائية</strong></span>}
    </div>
  );
}
