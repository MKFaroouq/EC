import { ChevronDown, FileText, Info } from "lucide-react";
import { formatMoney } from "../domain/calculate";
import type { FeeLine } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

interface ExplainableFeeResult {
  estimateId?: string;
  totalMillieme: number;
  refundableMillieme?: number;
  ruleSetVersion: string;
  lines: FeeLine[];
  warnings: string[];
  appliedRuleChanges?: Array<{
    id: string;
    ruleCode: string;
    scope: "court" | "global";
    courtId?: string;
    effectiveDate: string;
  }>;
}

export function FeeResultCard({ result, totalLabel = "إجمالي المطلوب حاليًا" }: { result: ExplainableFeeResult; totalLabel?: string }) {
  const depositMillieme = result.lines
    .filter((line) => line.financialClass === "deposit")
    .reduce((sum, line) => sum + line.amountMillieme, 0);
  const feeMillieme = Math.max(0, result.totalMillieme - depositMillieme);
  return <div className="result-card">
    <div className="result-head"><div><span className="eyebrow">التقدير الحالي</span><h3>{result.estimateId?.slice(0, 8).toUpperCase() ?? "غير محفوظ"}</h3></div><StatusBadge tone="warning">مسودة للمراجعة</StatusBadge></div>
    <div className="result-total"><span>{totalLabel}</span><strong>{formatMoney(result.totalMillieme)}</strong><small>وفق إصدار القواعد {result.ruleSetVersion}</small></div>
    {depositMillieme > 0 && <div className="result-breakdown" aria-label="فصل الرسوم عن الأمانات">
      <div><span>رسوم ومبالغ مستحقة</span><strong>{formatMoney(feeMillieme)}</strong></div>
      <div><span>أمانات وكفالات قابلة للرد أو المصادرة</span><strong>{formatMoney(depositMillieme)}</strong></div>
    </div>}
    {!!result.appliedRuleChanges?.length && <div className="applied-rules" aria-label="القواعد المعدلة المطبقة">
      <strong>قواعد معدلة مطبقة على هذا التقدير</strong>
      {result.appliedRuleChanges.map((change) => <div key={change.id}>
        <code>{change.ruleCode}</code>
        <span>{change.scope === "court" ? "تعديل خاص بهذه المحكمة" : "تعديل عام"} · سارٍ من {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(`${change.effectiveDate}T00:00:00`))}</span>
      </div>)}
    </div>}
    {(result.refundableMillieme ?? 0) > 0 && <div className="result-refund"><span>مبلغ رد تقديري</span><strong>{formatMoney(result.refundableMillieme ?? 0)}</strong><small>لا يُصرف دون أمر مالي ومراجعة الإيصال والسابق رده</small></div>}
    <div className="fee-lines">{result.lines.map((line) => <details key={line.code} className="fee-line"><summary><span><strong>{line.label}</strong><small>{line.basis}</small></span><b>{formatMoney(line.amountMillieme)}</b><ChevronDown /></summary><div className="line-explanation"><p><span>الحساب</span>{line.calculation}</p><p><span>السند</span>{line.source.title}: {line.source.article}</p>{line.source.url && <a href={line.source.url} target="_blank" rel="noreferrer">فتح المصدر القانوني ←</a>}</div></details>)}</div>
    {result.warnings.map((warning) => <div className="result-warning" key={warning}><Info />{warning}</div>)}
    <button className="button secondary full" type="button" onClick={() => window.print()}><FileText />طباعة بيان التقدير</button>
  </div>;
}
