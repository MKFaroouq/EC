import { AlertTriangle, BadgeCheck, BookOpen } from "lucide-react";
import type { EstimateInput, FeeReductionContext, FeeReliefApplicant } from "../domain/types";

type FeeRelief = NonNullable<EstimateInput["feeRelief"]>;

interface FeeReliefPanelProps {
  value: FeeRelief;
  onChange: (value: FeeRelief) => void;
}

const applicantLabels: Record<FeeReliefApplicant, string> = {
  "ordinary-person": "فرد أو شركة عادية",
  government: "وزارة أو مصلحة حكومية",
  "independent-public-body": "هيئة أو شخص عام مستقل",
  "worker-or-beneficiary": "عامل أو مستحق عنه",
  "social-insurance-authority": "الهيئة القومية للتأمين الاجتماعي",
  "social-insured-or-beneficiary": "مؤمن عليه أو صاحب معاش أو مستحق",
  "universal-health-authority": "إحدى هيئات التأمين الصحي الشامل",
  "universal-health-insured": "مؤمن عليه بالتأمين الصحي الشامل",
  "nasser-social-bank": "بنك ناصر الاجتماعي",
  "disabled-person": "شخص ذو إعاقة",
  "national-disability-council": "المجلس القومي للأشخاص ذوي الإعاقة",
  "childhood-motherhood-council": "المجلس القومي للطفولة والأمومة"
};

const reductionLabels: Record<FeeReductionContext, string> = {
  none: "لا توجد واقعة تخفيض إجرائية",
  "return-invalid-proceedings": "إعادة الدعوى بعد بطلان الإجراءات",
  "return-invalid-summons": "إعادة الدعوى بعد بطلان صحيفة التكليف بالحضور",
  "appeal-deemed-never-filed": "إعادة الاستئناف بعد اعتباره كأن لم يكن",
  "default-judgment-opposition": "معارضة في حكم غيابي",
  "fee-list-opposition": "معارضة في قائمة الرسوم",
  "provisional-distribution-objection": "مناقضة في قائمة توزيع مؤقتة",
  "return-after-strike": "تعجيل الدعوى بعد الشطب"
};

const identityRequired = new Set<FeeReductionContext>([
  "return-invalid-proceedings",
  "return-invalid-summons",
  "appeal-deemed-never-filed",
  "return-after-strike"
]);

export function FeeReliefPanel({ value, onChange }: FeeReliefPanelProps) {
  const update = (patch: Partial<FeeRelief>) => onChange({ ...value, ...patch });
  const socialInsurance = ["social-insurance-authority", "social-insured-or-beneficiary"].includes(value.applicant);
  const universalHealth = ["universal-health-authority", "universal-health-insured"].includes(value.applicant);
  const protectedCouncil = ["national-disability-council", "childhood-motherhood-council"].includes(value.applicant);
  const reductionContext = value.reductionContext ?? "none";

  return (
    <section className="fee-relief-panel span-2" aria-labelledby="fee-relief-title">
      <div className="case-facts-title">
        <BadgeCheck />
        <span>
          <strong id="fee-relief-title">الإعفاءات والتخفيضات القانونية</strong>
          <small>لا يوجد إعفاء يدوي. يختبر النظام الصفة والموضوع والمستند ثم يعرض القاعدة وسندها في النتيجة.</small>
        </span>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>صفة رافع الدعوى أو المستفيد من الإعفاء</span>
          <select value={value.applicant} onChange={(event) => update({ applicant: event.target.value as FeeReliefApplicant })}>
            {Object.entries(applicantLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>قرار المساعدة القضائية</span>
          <select value={value.legalAidDecision ?? "none"} onChange={(event) => update({ legalAidDecision: event.target.value as "none" | "full" | "partial" })}>
            <option value="none">لا يوجد قرار</option>
            <option value="full">إعفاء كلي بقرار نافذ</option>
            <option value="partial">إعفاء جزئي يحتاج تفريغ منطوق القرار</option>
          </select>
        </label>

        {value.applicant === "government" && <label className="check-field span-2"><input type="checkbox" checked={value.governmentActionFiledByGovernment === true} onChange={(event) => update({ governmentActionFiledByGovernment: event.target.checked })} /><span><strong>الدعوى مرفوعة من الحكومة، لا مرفوعة عليها</strong><small>المادة 50 تُفسر تفسيرًا ضيقًا، ولا تشمل الهيئة المستقلة لمجرد كونها شخصًا عامًا.</small></span></label>}
        {value.applicant === "independent-public-body" && <div className="relief-warning span-2"><AlertTriangle /><span><strong>لا إعفاء بالصفة العامة وحدها</strong><small>قضاء النقض لم يمد الإعفاء تلقائيًا إلى الأزهر، وهيئة الأوقاف، والبريد، والمجتمعات العمرانية، والأبنية التعليمية، وبنك الاستثمار القومي وغيرها؛ يلزم نص صريح خاص.</small></span></div>}
        {value.applicant === "disabled-person" && <><label className="check-field"><input type="checkbox" checked={value.disabilityCardVerified === true} onChange={(event) => update({ disabilityCardVerified: event.target.checked })} /><span><strong>بطاقة إثبات الإعاقة سارية ومتحقق منها</strong><small>تُثبت في ملف العملية.</small></span></label><label className="check-field"><input type="checkbox" checked={value.disabilityRightsDispute === true} onChange={(event) => update({ disabilityRightsDispute: event.target.checked })} /><span><strong>النزاع متصل بحماية حق مقرر بسبب الإعاقة</strong><small>لا يكفي توافر الصفة وحدها.</small></span></label></>}
        {socialInsurance && <label className="check-field span-2"><input type="checkbox" checked={value.socialInsuranceLawDispute === true} onChange={(event) => update({ socialInsuranceLawDispute: event.target.checked })} /><span><strong>الدعوى ناشئة عن تطبيق قانون التأمينات الاجتماعية 148 لسنة 2019</strong><small>الإعفاء يخص الرسوم المستحقة للدولة ولا يمتد تلقائيًا إلى مصروفات الخصم.</small></span></label>}
        {universalHealth && <label className="check-field span-2"><input type="checkbox" checked={value.universalHealthLawDispute === true} onChange={(event) => update({ universalHealthLawDispute: event.target.checked })} /><span><strong>الدعوى متعلقة بتنفيذ قانون التأمين الصحي الشامل 2 لسنة 2018</strong><small>لا يكفي أن يكون موضوعها صحيًا بوجه عام.</small></span></label>}
        {protectedCouncil && <label className="check-field span-2"><input type="checkbox" checked={value.protectedEntityLawDispute === true} onChange={(event) => update({ protectedEntityLawDispute: event.target.checked })} /><span><strong>الدعوى مرفوعة من المجلس وفي نطاق الحماية التي أنشئ لها</strong><small>يُراجع اتصال الطلب بالنص الخاص قبل اعتماد الإعفاء.</small></span></label>}

        <div className="relief-divider span-2"><BookOpen /><span><strong>تخفيضات المادة 6 الإجرائية</strong><small>اختيار الواقعة لا يكفي إن كان النص يشترط اتحاد الموضوع والخصوم.</small></span></div>
        <label className="field span-2">
          <span>هل سبقت الدعوى واقعة إجرائية تخفض الرسم؟</span>
          <select value={reductionContext} onChange={(event) => update({ reductionContext: event.target.value as FeeReductionContext, sameSubjectAndParties: false })}>
            {Object.entries(reductionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {identityRequired.has(reductionContext) && <label className="check-field span-2"><input type="checkbox" checked={value.sameSubjectAndParties === true} onChange={(event) => update({ sameSubjectAndParties: event.target.checked })} /><span><strong>اتحاد الموضوع والخصوم مع الدعوى أو الطعن السابق</strong><small>بدون هذا الشرط لا يطبق التخفيض المرتبط بالإعادة أو التعجيل.</small></span></label>}
      </div>
    </section>
  );
}
