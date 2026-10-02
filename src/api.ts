import type { CalculationResult, CaseType, Court, EstimateInput, LegalSource, RuleChangeRequest, RuleRegisterItem } from "./domain/types";
import type { CourtServiceCalculationResult, CourtServiceInput } from "./domain/service-fees";

export type Role = "estimator" | "supervisor" | "legal_reviewer" | "project_manager" | "leader";

export interface User {
  id: string;
  name: string;
  role: Role;
  courtId?: string;
}

export interface Catalog {
  ruleSet: { id: string; version: string; title: string; effectiveFrom: string };
  courts: Court[];
  caseTypes: CaseType[];
  legalSources: LegalSource[];
  ruleRegister: RuleRegisterItem[];
}

export interface DashboardData {
  assessedMillieme: number;
  collectedMillieme: number;
  outstandingMillieme: number;
  collectionRate: number;
  reportingCourts: number;
  byCourt: Array<{ courtId: string; courtName: string; assessedMillieme: number; collectedMillieme: number }>;
  trend: Array<{ month: string; assessedMillieme: number; collectedMillieme: number }>;
  dataStatus: "demo" | "live";
  asOf: string;
  note: string;
}

export interface NewLegalSourceInput {
  title: string;
  kind: "law" | "regulation" | "circular" | "judgment" | "research" | "workbook" | "legacy-screen";
  status: LegalSource["status"];
  effectiveDate?: string;
  url?: string;
  notes: string;
}

export type NewRuleChangeInput = Pick<RuleChangeRequest, "ruleCode" | "proposedParameters" | "effectiveDate" | "reason" | "sourceIds" | "scope" | "courtId">;

const TOKEN_KEY = "judicial-fees-demo-token";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  if (response.status === 401) clearToken();
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "تعذر الاتصال بالخدمة." }));
    const code = payload.error as string | undefined;
    const messages: Record<string, string> = {
      LEGAL_REVIEW_REQUIRED_MULTIPLE_CLAIMS: "يلزم فصل أوعية الطلبات ومراجعة الأساس القانوني لكل طلب قبل الحساب.",
      LEGAL_REVIEW_REQUIRED_UNKNOWN_FINAL: "لا يمكن تسوية دعوى مجهولة القيمة آليًا دون مراجعة منطوق الحكم وتحديد الوعاء النهائي.",
      UNKNOWN_CASE_TYPE: "نوع الدعوى غير موجود في المصنف القانوني المنشور.",
      CASE_TYPE_VALUE_KIND_MISMATCH: "طبيعة القيمة المختارة لا تتفق مع قاعدة تقدير نوع الدعوى.",
      CASE_TYPE_COURT_LEVEL_UNSUPPORTED: "مسار الطعن أو درجة المحكمة لهذا النوع لم يُعتمد للحساب الآلي بعد.",
      CASE_TYPE_FACTS_REQUIRED: "يلزم استكمال الوقائع الخاصة بهذا النوع قبل حساب وعاء الرسم.",
      CASE_TYPE_LEGAL_REVIEW_REQUIRED: "هذا النوع موقوف عن الحساب الآلي حتى اكتمال تصنيفه وسنده القانوني.",
      CASE_TYPE_EFFECTIVE_DATE_UNSUPPORTED: "تاريخ الحساب خارج فترة السريان الموثقة لهذا النوع؛ يلزم اختيار الإصدار القانوني السابق ومراجعته.",
      FINAL_OUTCOME_REQUIRED: "اختر النتيجة الإجرائية التي انتهت بها الخصومة قبل حساب الرسوم النهائية.",
      FINAL_TIMING_REQUIRED: "حدد توقيت الصلح أو الترك بالنسبة للجلسة الأولى والأحكام السابقة.",
      FINAL_OUTCOME_NOT_TERMINAL: "شطب الدعوى لا ينهي الخصومة بذاته؛ يلزم بيان التعجيل أو انقضاء الخصومة قبل التسوية النهائية.",
      FINAL_OUTCOME_LEGAL_REVIEW_REQUIRED: "هذه النتيجة تحتاج مراجعة الحكم أو قرار الانتهاء قبل إصدار تسوية نهائية.",
      FINAL_OUTCOME_CASE_TYPE_MISMATCH: "النتيجة المختارة لا تتفق مع نوع الدعوى أو جهة القضاء.",
      FINAL_STAGE_NOT_APPLICABLE_TO_OPERATION: "هذا النوع عملية تنفيذ مستقلة وليس دعوى تُسوّى باختيار مرحلة الرسوم النهائية.",
      PREPAID_ORIGINAL_REQUIRED: "أدخل الرسم الأصلي السابق سداده لحساب الرد أو الاستكمال عند الصلح أو الترك.",
      SETTLEMENT_AMOUNT_REQUIRED: "أدخل قيمة الالتزام المالي المعلوم القابل للتنفيذ الوارد بمحضر الصلح.",
      FINAL_CLAIM_FACTS_REQUIRED: "راجع بطاقة كل طلب: الاسم، السند، طبيعة القيمة، القيمة الأصلية والمقضي بها مطلوبة بحسب النتيجة.",
      FINAL_CLAIM_GROUP_MISMATCH: "طلبات المجموعة القانونية الواحدة يجب أن تستخدم طريقة التجميع نفسها.",
      FINAL_CLAIMS_LIMIT_EXCEEDED: "لا يمكن إدخال أكثر من 100 طلب في عملية تسوية واحدة؛ قسّم الملف للمراجعة.",
      FINAL_ACCRUAL_FACTS_REQUIRED: "راجع بنود الريع أو الإيجار أو التعويض اليومي أو الفوائد المستجدة حتى الحكم.",
      RULE_CHANGE_SCOPE_FORBIDDEN: "لا تملك صلاحية إنشاء تعديل بهذا النطاق؛ رئيس القلم مقيد بمحكمته ومدير المشروع المحدد وحده يملك النطاق العام.",
      RULE_CHANGE_NOT_APPROVED: "لا يمكن نشر التعديل قبل اعتماد المراجع القانوني المستقل.",
      RULE_CHANGE_PUBLISH_FORBIDDEN: "لا تملك صلاحية نشر هذا التعديل أو أنه خارج نطاق محكمتك.",
      RULE_CHANGE_ALREADY_PUBLISHED: "هذا التعديل منشور بالفعل ولا يجوز إعادة نشره أو تعديله في مكانه.",
      RULE_CHANGE_SELF_REVIEW_FORBIDDEN: "لا يجوز لمقترح التعديل أن يعتمد مقترحه بنفسه.",
      RULE_PARAMETERS_INVALID: "قيم القاعدة غير مكتملة أو خارج الحدود المسموح بها، أو ترتيب الشرائح غير صحيح.",
      RULE_EFFECTIVE_DATE_REQUIRED: "حدد تاريخ سريان صحيحًا للتعديل قبل إرساله أو نشره.",
      CLAIM_AMOUNT_REQUIRED: "أدخل قيمة للدعوى أكبر من صفر.",
      AWARDED_AMOUNT_REQUIRED: "أدخل المبلغ المقضي به.",
      MANUAL_EXEMPTION_DISABLED: "لا يقبل النظام إعفاءً حرًا غير مرتبط بقاعدة منشورة؛ اختر الصفة والواقعة والمستند من قسم الإعفاءات والتخفيضات.",
      INVALID_SOURCE: "راجع بيانات المصدر: العنوان والملاحظات والرابط الآمن مطلوبة بالصورة الصحيحة.",
      INVALID_SERVICE_INPUT: "راجع رقم الدعوى والقيم المدخلة؛ الأعداد يجب أن تكون صحيحة والمبلغ السابق بين صفر و100 جنيه."
    };
    throw new Error((code && messages[code]) ?? payload.message ?? code ?? "REQUEST_FAILED");
  }
  return response.json() as Promise<T>;
}

export async function demoLogin(username: string, password: string): Promise<User> {
  const payload = await request<{ token: string; user: User }>("/api/auth/demo", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  sessionStorage.setItem(TOKEN_KEY, payload.token);
  return payload.user;
}

export const api = {
  me: () => request<{ user: User }>("/api/me"),
  catalog: () => request<Catalog>("/api/catalog"),
  calculate: (input: EstimateInput) => request<CalculationResult>("/api/calculate", { method: "POST", body: JSON.stringify(input) }),
  calculateService: (courtId: string, service: CourtServiceInput) => request<CourtServiceCalculationResult & { estimateId: string; courtId: string }>("/api/calculate-service", { method: "POST", body: JSON.stringify({ courtId, service }) }),
  dashboard: () => request<DashboardData>("/api/dashboard"),
  estimates: () => request<{ items: Array<Record<string, unknown>> }>("/api/estimates"),
  audit: () => request<{ items: Array<Record<string, unknown>> }>("/api/audit"),
  addSource: (source: NewLegalSourceInput) => request<LegalSource>("/api/sources", { method: "POST", body: JSON.stringify(source) }),
  ruleChanges: () => request<{ items: RuleChangeRequest[] }>("/api/rule-change-requests"),
  proposeRuleChange: (proposal: NewRuleChangeInput) => request<RuleChangeRequest>("/api/rule-change-requests", { method: "POST", body: JSON.stringify(proposal) }),
  reviewRuleChange: (id: string, decision: "approve" | "reject", reviewNote: string) => request<RuleChangeRequest>(`/api/rule-change-requests/${id}/review`, { method: "POST", body: JSON.stringify({ decision, reviewNote }) }),
  publishRuleChange: (id: string) => request<RuleChangeRequest>(`/api/rule-change-requests/${id}/publish`, { method: "POST", body: "{}" })
};
