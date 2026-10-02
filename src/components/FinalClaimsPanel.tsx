import { BookOpen, Plus, Trash2 } from "lucide-react";
import type { FinalAccrualKind, FinalClaimAggregation, FinalClaimDisposition, FinalClaimRequestKind } from "../domain/types";

export interface FinalClaimDraft {
  id: string;
  label: string;
  requestKind: FinalClaimRequestKind;
  valueKind: "known" | "unknown";
  disposition: FinalClaimDisposition;
  aggregation: FinalClaimAggregation;
  groupKey: string;
  claimedAmount: string;
  awardedAmount: string;
}

export interface FinalAccrualDraft {
  id: string;
  label: string;
  kind: FinalAccrualKind;
  filingBasis: string;
  accruedToJudgment: string;
}

const dispositionNames: Record<FinalClaimDisposition, string> = {
  "awarded-full": "قُضي بالطلب كاملًا",
  "awarded-partial": "قُضي بجزء من الطلب",
  rejected: "رُفض الطلب",
  inadmissible: "لم يُقبل الطلب",
  "ended-without-merits": "انتهى دون فصل أو إلزام"
};

const aggregationNames: Record<FinalClaimAggregation, string> = {
  "sum-same-basis": "يُجمع مع طلبات السند نفسه",
  "separate-basis": "سند مستقل — يُحسب وحده",
  "higher-of-related": "طلب تابع/بديل — يؤخذ أرجح الرسمين"
};

const requestKindNames: Record<FinalClaimRequestKind, string> = {
  original: "طلب أصلي",
  additional: "طلب إضافي",
  incidental: "طلب عارض أو تابع",
  intervention: "طلب تدخل هجومي مستقل"
};

const accrualNames: Record<FinalAccrualKind, string> = {
  rent: "أجرة مستجدة",
  yield: "ريع مستجد",
  "daily-compensation": "تعويض يومي مستجد",
  interest: "فوائد مستجدة"
};

export function newFinalClaim(index: number): FinalClaimDraft {
  return {
    id: `claim-${Date.now()}-${index}`,
    label: index === 1 ? "الطلب الأول" : `الطلب ${index}`,
    requestKind: index === 1 ? "original" : "additional",
    valueKind: "known",
    disposition: "awarded-full",
    aggregation: "separate-basis",
    groupKey: `basis-${index}`,
    claimedAmount: "",
    awardedAmount: ""
  };
}

export function newFinalAccrual(index: number): FinalAccrualDraft {
  return {
    id: `accrual-${Date.now()}-${index}`,
    label: index === 1 ? "الأجرة المستجدة حتى الحكم" : `البند المستجد ${index}`,
    kind: "rent",
    filingBasis: "",
    accruedToJudgment: ""
  };
}

interface Props {
  claims: FinalClaimDraft[];
  onClaimsChange: (claims: FinalClaimDraft[]) => void;
  accruals: FinalAccrualDraft[];
  onAccrualsChange: (accruals: FinalAccrualDraft[]) => void;
}

export function FinalClaimsPanel({ claims, onClaimsChange, accruals, onAccrualsChange }: Props) {
  const updateClaim = (id: string, patch: Partial<FinalClaimDraft>) => onClaimsChange(claims.map((claim) => claim.id === id ? { ...claim, ...patch } : claim));
  const updateAccrual = (id: string, patch: Partial<FinalAccrualDraft>) => onAccrualsChange(accruals.map((item) => item.id === id ? { ...item, ...patch } : item));

  return <div className="final-ledger span-2">
    <div className="case-facts-title">
      <BookOpen />
      <span><strong>سجل الطلبات ومنطوق الحكم</strong><small>كل طلب له نتيجة ووعاء وسند؛ النظام يطبق الجمع أو الاستقلال أو أرجح الرسمين وفق المادة 7.</small></span>
    </div>

    <div className="claim-ledger-list">
      {claims.map((claim, index) => <article className="claim-ledger-card" key={claim.id}>
        <header><span className="claim-number">{index + 1}</span><strong>{claim.label || "طلب بلا تسمية"}</strong>{claims.length > 1 && <button className="icon-danger" type="button" aria-label={`حذف ${claim.label}`} onClick={() => onClaimsChange(claims.filter((item) => item.id !== claim.id))}><Trash2 /></button>}</header>
        <div className="field-grid">
          <label className="field"><span>اسم الطلب كما ورد بالصحيفة أو الحكم</span><input value={claim.label} maxLength={200} onChange={(event) => updateClaim(claim.id, { label: event.target.value })} /></label>
          <label className="field"><span>صفة الطلب</span><select value={claim.requestKind} onChange={(event) => updateClaim(claim.id, { requestKind: event.target.value as FinalClaimRequestKind })}>{Object.entries(requestKindNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>نتيجة هذا الطلب</span><select value={claim.disposition} onChange={(event) => updateClaim(claim.id, { disposition: event.target.value as FinalClaimDisposition })}>{Object.entries(dispositionNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>علاقته بباقي الطلبات</span><select value={claim.aggregation} onChange={(event) => updateClaim(claim.id, { aggregation: event.target.value as FinalClaimAggregation })}>{Object.entries(aggregationNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>رمز السند/المجموعة</span><input value={claim.groupKey} maxLength={80} onChange={(event) => updateClaim(claim.id, { groupKey: event.target.value })} /><small className="field-hint">استخدم الرمز نفسه للطلبات المطلوب جمعها أو أخذ الأرجح بينها.</small></label>
          <label className="field"><span>طبيعة قيمة الطلب</span><select value={claim.valueKind} onChange={(event) => updateClaim(claim.id, { valueKind: event.target.value as "known" | "unknown", claimedAmount: "", awardedAmount: "" })}><option value="known">معلوم القيمة</option><option value="unknown">مجهول القيمة</option></select></label>
          {claim.valueKind === "known" && <label className="field"><span>قيمة الطلب الأصلية</span><div className="money-input"><input type="number" min="0.001" step="0.001" value={claim.claimedAmount} onChange={(event) => updateClaim(claim.id, { claimedAmount: event.target.value })} /><b>جنيه</b></div></label>}
          {claim.valueKind === "known" && claim.disposition === "awarded-partial" && <label className="field"><span>الوعاء المقضي به لهذا الطلب</span><div className="money-input"><input type="number" min="0" step="0.001" value={claim.awardedAmount} onChange={(event) => updateClaim(claim.id, { awardedAmount: event.target.value })} /><b>جنيه</b></div></label>}
        </div>
      </article>)}
    </div>
    <button className="button compact secondary" type="button" onClick={() => onClaimsChange([...claims, newFinalClaim(claims.length + 1)])}><Plus />إضافة طلب آخر</button>

    <div className="accrual-ledger">
      <div className="accrual-heading"><span><strong>تكملات تستجد حتى يوم الحكم</strong><small>للريع والإيجار والتعويض اليومي والفوائد فقط — المادة 11/خامسًا.</small></span><button className="button compact ghost" type="button" onClick={() => onAccrualsChange([...accruals, newFinalAccrual(accruals.length + 1)])}><Plus />إضافة بند مستجد</button></div>
      {accruals.map((item) => <article className="accrual-row" key={item.id}>
        <label className="field"><span>نوع البند</span><select value={item.kind} onChange={(event) => updateAccrual(item.id, { kind: event.target.value as FinalAccrualKind })}>{Object.entries(accrualNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>وصف البند</span><input value={item.label} maxLength={200} onChange={(event) => updateAccrual(item.id, { label: event.target.value })} /></label>
        <label className="field"><span>وعاؤه المحسوب عند الرفع</span><div className="money-input"><input type="number" min="0" step="0.001" value={item.filingBasis} onChange={(event) => updateAccrual(item.id, { filingBasis: event.target.value })} /><b>جنيه</b></div></label>
        <label className="field"><span>المبلغ المستجد من الرفع حتى الحكم</span><div className="money-input"><input type="number" min="0.001" step="0.001" value={item.accruedToJudgment} onChange={(event) => updateAccrual(item.id, { accruedToJudgment: event.target.value })} /><b>جنيه</b></div></label>
        <button className="icon-danger" type="button" aria-label={`حذف ${item.label}`} onClick={() => onAccrualsChange(accruals.filter((candidate) => candidate.id !== item.id))}><Trash2 /></button>
      </article>)}
    </div>
  </div>;
}
