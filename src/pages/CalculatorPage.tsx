import { AlertTriangle, ArrowLeft, BookOpen, Calculator, CheckCircle2, ChevronDown, FileText, Landmark, LockKeyhole, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Catalog } from "../api";
import { useAuth } from "../auth";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { FeeResultCard } from "../components/FeeResultCard";
import { FeeReliefPanel } from "../components/FeeReliefPanel";
import { FinalClaimsPanel, newFinalClaim, type FinalAccrualDraft, type FinalClaimDraft } from "../components/FinalClaimsPanel";
import type { CalculationResult, ClaimStructure, CourtLevel, EstimateInput, EstimateStage, FinalOutcome, FinalTiming, TaxDisputeRoute } from "../domain/types";

interface TaxPeriodDraft {
  id: string;
  label: string;
  disputedProfit: string;
}

const levelNames: Record<CourtLevel, string> = { partial: "جزئي", primary: "ابتدائي", appeal: "استئناف", cassation: "نقض" };
const jurisdictionNames = {
  "ordinary-civil": "القضاء المدني",
  "ordinary-commercial": "القضاء التجاري",
  economic: "المحكمة الاقتصادية",
  family: "محكمة الأسرة",
  labour: "المحكمة العمالية",
  "state-council": "مجلس الدولة",
  criminal: "القضاء الجنائي",
  enforcement: "قضاء التنفيذ",
  arbitration: "التحكيم",
  bankruptcy: "الإفلاس وإعادة الهيكلة",
  constitutional: "القضاء الدستوري"
} as const;
const claimStructureNames: Record<ClaimStructure, string> = {
  single: "طلب واحد",
  "same-basis": "طلبات متعددة ناشئة عن سند واحد",
  "different-bases": "طلبات ناشئة عن سندات قانونية مختلفة",
  "rent-termination": "إنهاء أو فسخ إيجار مع أجرة أو متأخرات",
  unsure: "غير متأكد من أساس الطلبات"
};
const generalFinalOutcomeNames: Partial<Record<FinalOutcome, string>> = {
  "judgment-full": "حكم بإجابة الطلب كاملًا",
  "judgment-partial": "حكم بجزء من الطلب",
  rejected: "رفض الدعوى",
  inadmissible: "عدم قبول الدعوى",
  settled: "انتهاء الخصومة صلحًا",
  abandoned: "ترك الخصومة أو التنازل عنها",
  struck: "شطب الدعوى دون انقضاء الخصومة",
  lapsed: "انتهاء أو سقوط الخصومة دون فصل في الموضوع أو إلزام",
  "deemed-never-filed": "اعتبار الدعوى كأن لم تكن",
  "cassation-referral": "إحالة بعد النقض"
};
const criminalFinalOutcomeNames: Partial<Record<FinalOutcome, string>> = {
  "criminal-conviction": "إدانة - حسب الوصف النهائي للجريمة",
  "criminal-acquittal": "براءة"
};
const constitutionalFinalOutcomeNames: Partial<Record<FinalOutcome, string>> = {
  "constitutional-accepted": "قبول الدعوى - رد الكفالة",
  "constitutional-rejected": "رفض الدعوى - مصادرة الكفالة",
  "constitutional-inadmissible": "عدم قبول الدعوى - مصادرة الكفالة"
};
const appealFinalOutcomeNames: Partial<Record<FinalOutcome, string>> = {
  "appeal-affirmed": "تأييد الحكم المستأنف",
  "appeal-modified": "تعديل الحكم المستأنف",
  "appeal-cancelled": "إلغاء الحكم المستأنف دون قضاء مالي بديل",
  settled: "انتهاء خصومة الاستئناف صلحًا",
  abandoned: "ترك خصومة الاستئناف أو التنازل عنها",
  inadmissible: "عدم قبول الاستئناف",
  lapsed: "انتهاء خصومة الاستئناف دون فصل أو إلزام",
  "deemed-never-filed": "اعتبار الاستئناف كأن لم يكن"
};
const finalTimingNames: Record<FinalTiming, string> = {
  "first-session-before-pleading": "الجلسة الأولى قبل بدء المرافعة",
  "before-dispositive-judgment": "بعد الجلسة الأولى وقبل حكم قطعي أو تمهيدي",
  "after-dispositive-judgment": "بعد حكم قطعي في مسألة فرعية أو حكم تمهيدي"
};

export function CalculatorPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [courtId, setCourtId] = useState("");
  const [caseTypeId, setCaseTypeId] = useState("");
  const [caseQuery, setCaseQuery] = useState("");
  const [courtLevel, setCourtLevel] = useState<CourtLevel>("primary");
  const [stage, setStage] = useState<EstimateStage>("filing");
  const [valueKind, setValueKind] = useState<"known" | "unknown">("known");
  const [claimStructure, setClaimStructure] = useState<ClaimStructure>("single");
  const [claimAmount, setClaimAmount] = useState("40000");
  const [awardedAmount, setAwardedAmount] = useState("10000");
  const [prepaid, setPrepaid] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementHasKnownExecutableTerms, setSettlementHasKnownExecutableTerms] = useState(false);
  const [settlementReducedFeeCase, setSettlementReducedFeeCase] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<FinalOutcome>("judgment-partial");
  const [finalTiming, setFinalTiming] = useState<FinalTiming>("first-session-before-pleading");
  const [useDetailedFinalClaims, setUseDetailedFinalClaims] = useState(false);
  const [finalClaims, setFinalClaims] = useState<FinalClaimDraft[]>([newFinalClaim(1)]);
  const [finalAccruals, setFinalAccruals] = useState<FinalAccrualDraft[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [feeRelief, setFeeRelief] = useState<NonNullable<EstimateInput["feeRelief"]>>({
    applicant: "ordinary-person",
    legalAidDecision: "none",
    reductionContext: "none"
  });
  const [leaseMonthlyRent, setLeaseMonthlyRent] = useState("1000");
  const [leaseMonths, setLeaseMonths] = useState("12");
  const [leaseIncludesArrears, setLeaseIncludesArrears] = useState(false);
  const [leaseArrears, setLeaseArrears] = useState("0");
  const [contractSubjectValue, setContractSubjectValue] = useState("40000");
  const [contractCounterValue, setContractCounterValue] = useState("");
  const [propertyKind, setPropertyKind] = useState<"agricultural" | "built">("built");
  const [propertyAnnualBase, setPropertyAnnualBase] = useState("12000");
  const [propertyShareNumerator, setPropertyShareNumerator] = useState("1");
  const [propertyShareDenominator, setPropertyShareDenominator] = useState("1");
  const [periodicAnnualAmount, setPeriodicAnnualAmount] = useState("12000");
  const [periodicTerm, setPeriodicTerm] = useState<"permanent" | "life" | "temporary">("permanent");
  const [periodicYears, setPeriodicYears] = useState("1");
  const [stateCouncilIncludesStay, setStateCouncilIncludesStay] = useState(false);
  const [executionAmount, setExecutionAmount] = useState("10000");
  const [labourClaimantRole, setLabourClaimantRole] = useState<"employee" | "employer" | "other">("employee");
  const [labourArisesUnderLaw14, setLabourArisesUnderLaw14] = useState(true);
  const [companyInterestValue, setCompanyInterestValue] = useState("40000");
  const [personalStatusUnitCount, setPersonalStatusUnitCount] = useState("1");
  const [personalStatusAdditionalSheets, setPersonalStatusAdditionalSheets] = useState("0");
  const [personalStatusPriorFee, setPersonalStatusPriorFee] = useState("0");
  const [taxRoute, setTaxRoute] = useState<TaxDisputeRoute>("court-action");
  const [taxPeriods, setTaxPeriods] = useState<TaxPeriodDraft[]>([
    { id: "tax-period-1", label: "2025", disputedProfit: "40000" }
  ]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const resultRef = useRef<HTMLElement>(null);

  const loadCatalog = () => {
    setCatalogError("");
    api.catalog().then((value) => {
      setCatalog(value);
      setCourtId((current) => current || user?.courtId || value.courts[0]?.id || "");
      setCaseTypeId((current) => {
        const next = current || value.caseTypes[0]?.id || "";
        setCaseQuery(value.caseTypes.find((item) => item.id === next)?.name ?? "");
        return next;
      });
    }).catch((reason) => setCatalogError(reason instanceof Error ? reason.message : "تعذر التحميل"));
  };
  useEffect(loadCatalog, [user?.courtId]);
  useEffect(() => {
    if (!result || !window.matchMedia("(max-width: 1120px)").matches) return;
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    });
  }, [result]);

  const selectedCase = useMemo(() => catalog?.caseTypes.find((item) => item.id === caseTypeId), [catalog, caseTypeId]);
  const canCalculate = user?.role === "estimator" || user?.role === "supervisor";
  const isLeaseProfile = selectedCase?.profileId === "lease-termination";
  const isContractProfile = selectedCase?.valuationTemplate === "contract-value";
  const isPropertyProfile = selectedCase?.valuationTemplate === "property-derived-value";
  const isPeriodicProfile = selectedCase?.valuationTemplate === "periodic-payment";
  const isStateSupremeAppeal = selectedCase?.id === "state-council-supreme-appeal";
  const isExecutionApplication = selectedCase?.valuationTemplate === "enforcement-amount" && ["execution-first", "execution-repeat", "arbitration-award-execution"].includes(selectedCase.id);
  const isLabourProfile = selectedCase?.profileId === "labour-dispute";
  const isCompanyProfile = selectedCase?.valuationTemplate === "company-interest";
  const isPersonalStatusUnitCase = selectedCase?.id === "family-consensual-divorce-petition";
  const isPersonalStatusSheetsCase = selectedCase?.id === "family-parentage-acknowledgment-record";
  const isWillDeposit = selectedCase?.id === "family-will-deposit";
  const isTaxProfitAssessment = selectedCase?.id === "tax-profit-assessment-dispute";
  const isOrdinaryAppeal = selectedCase ? ["civil-appeal-known", "civil-appeal-unknown"].includes(selectedCase.id) : false;
  const finalStageNotApplicable = selectedCase?.finalSettlementPolicy === "operation-not-applicable";
  const finalOutcomeNames = isOrdinaryAppeal
    ? appealFinalOutcomeNames
    : selectedCase?.jurisdiction === "criminal"
    ? criminalFinalOutcomeNames
    : selectedCase?.jurisdiction === "constitutional"
      ? constitutionalFinalOutcomeNames
      : generalFinalOutcomeNames;
  const finalOutcomeNeedsTiming = finalOutcome === "settled" || finalOutcome === "abandoned";
  const detailedFinalSupported = stage === "final"
    && !isOrdinaryAppeal
    && !isExecutionApplication
    && !["criminal", "constitutional"].includes(selectedCase?.jurisdiction ?? "")
    && ["judgment-full", "judgment-partial", "rejected", "inadmissible"].includes(finalOutcome);
  const hasDetailedFinalClaims = detailedFinalSupported && useDetailedFinalClaims;
  const detailedFinalClaimsComplete = finalClaims.length > 0 && finalClaims.every((claim) => {
    if (!claim.label.trim() || !claim.groupKey.trim()) return false;
    if (claim.valueKind === "unknown") return claim.disposition !== "awarded-partial";
    const claimed = Number(claim.claimedAmount);
    if (!Number.isFinite(claimed) || claimed <= 0) return false;
    if (claim.disposition !== "awarded-partial") return true;
    const awarded = Number(claim.awardedAmount);
    return Number.isFinite(awarded) && awarded >= 0;
  }) && finalAccruals.every((item) => {
    const filingBasis = Number(item.filingBasis);
    const accrued = Number(item.accruedToJudgment);
    return Boolean(item.label.trim()) && Number.isFinite(filingBasis) && filingBasis >= 0 && Number.isFinite(accrued) && accrued > 0;
  });
  const settlementDetailsRequired = stage === "final"
    && finalOutcome === "settled"
    && finalTiming !== "first-session-before-pleading";
  const usesDerivedValue = isLeaseProfile || isContractProfile || isPropertyProfile || isPeriodicProfile || isExecutionApplication || isTaxProfitAssessment || (isCompanyProfile && valueKind === "known");
  const leaseFactsComplete = isLeaseProfile
    && Number.isFinite(Number(leaseMonthlyRent)) && Number(leaseMonthlyRent) > 0
    && Number.isInteger(Number(leaseMonths)) && Number(leaseMonths) > 0
    && (!leaseIncludesArrears || (Number.isFinite(Number(leaseArrears)) && Number(leaseArrears) >= 0));
  const contractFactsComplete = isContractProfile && Number.isFinite(Number(contractSubjectValue)) && Number(contractSubjectValue) > 0
    && (contractCounterValue === "" || (Number.isFinite(Number(contractCounterValue)) && Number(contractCounterValue) > 0));
  const propertyFactsComplete = isPropertyProfile && Number.isFinite(Number(propertyAnnualBase)) && Number(propertyAnnualBase) > 0
    && Number.isInteger(Number(propertyShareNumerator)) && Number(propertyShareNumerator) > 0
    && Number.isInteger(Number(propertyShareDenominator)) && Number(propertyShareDenominator) >= Number(propertyShareNumerator);
  const periodicFactsComplete = isPeriodicProfile && Number.isFinite(Number(periodicAnnualAmount)) && Number(periodicAnnualAmount) > 0
    && (periodicTerm !== "temporary" || (Number.isInteger(Number(periodicYears)) && Number(periodicYears) > 0 && Number(periodicYears) <= 10));
  const executionFactsComplete = isExecutionApplication && Number.isFinite(Number(executionAmount)) && Number(executionAmount) > 0;
  const labourFactsComplete = isLabourProfile && typeof labourArisesUnderLaw14 === "boolean" && Boolean(labourClaimantRole);
  const companyFactsComplete = isCompanyProfile && valueKind === "known" && Number.isFinite(Number(companyInterestValue)) && Number(companyInterestValue) > 0;
  const taxFactsComplete = isTaxProfitAssessment
    && taxRoute === "court-action"
    && taxPeriods.length > 0
    && taxPeriods.every((period) => period.label.trim() && Number.isFinite(Number(period.disputedProfit)) && Number(period.disputedProfit) > 0);
  const conditionalFactsComplete = leaseFactsComplete || contractFactsComplete || propertyFactsComplete || periodicFactsComplete || executionFactsComplete || labourFactsComplete || companyFactsComplete || taxFactsComplete;
  const finalPolicyCanResolveConditional = stage === "final" && selectedCase?.finalSettlementPolicy === "value-kind-dependent";
  const caseTypeNeedsReview = (selectedCase?.coverage === "blocked" || (selectedCase?.coverage === "conditional" && !conditionalFactsComplete && !finalPolicyCanResolveConditional))
    || (selectedCase ? !selectedCase.allowedValueKinds.includes(valueKind) : true)
    || (selectedCase ? !selectedCase.supportedCourtLevels.includes(courtLevel) : true);
  const needsLegalReview = caseTypeNeedsReview || (["different-bases", "rent-termination", "unsure"].includes(claimStructure) && !hasDetailedFinalClaims)
    || (claimStructure === "same-basis" && valueKind === "unknown" && !hasDetailedFinalClaims)
    || (stage === "final" && isExecutionApplication)
    || (stage === "final" && finalStageNotApplicable)
    || (stage === "final" && finalOutcome === "struck")
    || (isTaxProfitAssessment && taxRoute !== "court-action")
    || (isTaxProfitAssessment && stage === "final" && !hasDetailedFinalClaims)
    || (stage === "final" && valueKind === "unknown" && finalOutcome === "judgment-partial" && !hasDetailedFinalClaims)
    || (hasDetailedFinalClaims && (!detailedFinalClaimsComplete || prepaid === ""))
    || (stage === "final" && finalOutcomeNeedsTiming && prepaid === "")
    || (settlementDetailsRequired && valueKind === "unknown" && settlementHasKnownExecutableTerms && settlementAmount === "");

  const chooseCase = (id: string) => {
    setCaseTypeId(id);
    const item = catalog?.caseTypes.find((candidate) => candidate.id === id);
    if (item) {
      setCaseQuery(item.name);
      setValueKind(item.defaultValueKind);
      if (item.supportedCourtLevels.length === 1) setCourtLevel(item.supportedCourtLevels[0]);
      if (item.finalSettlementPolicy === "operation-not-applicable") setStage("filing");
      setFinalOutcome(["civil-appeal-known", "civil-appeal-unknown"].includes(item.id)
        ? "appeal-affirmed"
        : item.jurisdiction === "criminal"
        ? "criminal-conviction"
        : item.jurisdiction === "constitutional"
          ? "constitutional-accepted"
          : item.defaultValueKind === "unknown" ? "judgment-full" : "judgment-partial");
    }
    setResult(null);
  };

  const chooseCaseByName = (name: string) => {
    setCaseQuery(name);
    const normalized = name.replace(/\s+/g, " ").trim();
    const item = catalog?.caseTypes.find((candidate) => candidate.name === normalized);
    if (item) chooseCase(item.id);
  };

  const calculate = async () => {
    if (!canCalculate) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const claim = Number(claimAmount);
      const awarded = Number(awardedAmount);
      const paid = prepaid === "" ? undefined : Number(prepaid);
      const settlement = settlementAmount === "" ? undefined : Number(settlementAmount);
      if (valueKind === "known" && (!Number.isFinite(claim) || claim < 0)) throw new Error("أدخل قيمة صحيحة للدعوى.");
      if (stage === "final" && !hasDetailedFinalClaims && ["judgment-partial", "appeal-modified"].includes(finalOutcome) && valueKind === "known" && (!Number.isFinite(awarded) || awarded < 0)) throw new Error("أدخل قيمة صحيحة للوعاء المقضي به.");
      if (settlementDetailsRequired && settlement !== undefined && (!Number.isFinite(settlement) || settlement < 0)) throw new Error("أدخل قيمة صحيحة للمصالح عليه.");
      if (settlementDetailsRequired && valueKind === "unknown" && settlementHasKnownExecutableTerms && (!Number.isFinite(settlement) || (settlement ?? 0) <= 0)) throw new Error("أدخل قيمة الالتزام المالي المعلوم القابل للتنفيذ.");
      const caseFacts = isTaxProfitAssessment ? {
        taxKind: "income-profit-assessment" as const,
        taxRoute,
        taxDisputedPeriods: taxPeriods.map((period) => ({
          id: period.id,
          label: period.label.trim(),
          disputedProfitMillieme: Math.round(Number(period.disputedProfit) * 1000)
        }))
      } : isLeaseProfile ? {
        leaseMonthlyRentMillieme: Math.round(Number(leaseMonthlyRent) * 1000),
        leaseMonthsForValuation: Number(leaseMonths),
        leaseIncludesArrears,
        leaseArrearsMillieme: leaseIncludesArrears ? Math.round(Number(leaseArrears) * 1000) : undefined
      } : isContractProfile ? {
        contractSubjectValueMillieme: Math.round(Number(contractSubjectValue) * 1000),
        contractCounterValueMillieme: contractCounterValue === "" ? undefined : Math.round(Number(contractCounterValue) * 1000)
      } : isPropertyProfile ? {
        propertyKind,
        propertyAnnualTaxMillieme: propertyKind === "agricultural" ? Math.round(Number(propertyAnnualBase) * 1000) : undefined,
        propertyAnnualRentalValueMillieme: propertyKind === "built" ? Math.round(Number(propertyAnnualBase) * 1000) : undefined,
        propertyShareNumerator: Number(propertyShareNumerator),
        propertyShareDenominator: Number(propertyShareDenominator)
      } : isPeriodicProfile ? {
        periodicAnnualAmountMillieme: Math.round(Number(periodicAnnualAmount) * 1000),
        periodicTerm,
        periodicYears: periodicTerm === "temporary" ? Number(periodicYears) : undefined
      } : isExecutionApplication ? {
        executionAmountMillieme: Math.round(Number(executionAmount) * 1000)
      } : isLabourProfile ? {
        labourClaimantRole,
        labourArisesUnderLaw14
      } : isCompanyProfile ? {
        companyInterestValueMillieme: valueKind === "known" ? Math.round(Number(companyInterestValue) * 1000) : undefined
      } : isPersonalStatusUnitCase ? {
        personalStatusUnitCount: Number(personalStatusUnitCount)
      } : isPersonalStatusSheetsCase ? {
        personalStatusAdditionalSheets: Number(personalStatusAdditionalSheets)
      } : isWillDeposit ? {
        personalStatusPriorFeeMillieme: Math.round(Number(personalStatusPriorFee) * 1000)
      } : isStateSupremeAppeal ? { stateCouncilIncludesStay } : undefined;
      const detailedKnownClaimTotal = finalClaims
        .filter((item) => item.valueKind === "known")
        .reduce((sum, item) => sum + Number(item.claimedAmount || 0), 0);
      const taxClaimTotal = taxPeriods.reduce((sum, period) => sum + Number(period.disputedProfit || 0), 0);
      const response = await api.calculate({
        courtId,
        caseTypeId,
        courtLevel,
        stage,
        finalOutcome: stage === "final" ? finalOutcome : undefined,
        finalTiming: stage === "final" && finalOutcomeNeedsTiming ? finalTiming : undefined,
        valueKind,
        claimStructure,
        claimAmountMillieme: valueKind === "known" ? Math.round((hasDetailedFinalClaims ? detailedKnownClaimTotal : isTaxProfitAssessment ? taxClaimTotal : claim) * 1000) : undefined,
        awardedAmountMillieme: valueKind === "known" && stage === "final" && !hasDetailedFinalClaims && ["judgment-partial", "appeal-modified"].includes(finalOutcome) ? Math.round(awarded * 1000) : undefined,
        prepaidOriginalMillieme: stage === "final" && paid !== undefined ? Math.round(paid * 1000) : undefined,
        settlementAmountMillieme: settlementDetailsRequired && settlement !== undefined ? Math.round(settlement * 1000) : undefined,
        settlementHasKnownExecutableTerms: settlementDetailsRequired && valueKind === "unknown" ? settlementHasKnownExecutableTerms : undefined,
        settlementReducedFeeCase: settlementDetailsRequired ? settlementReducedFeeCase : undefined,
        finalClaims: hasDetailedFinalClaims ? finalClaims.map((item) => ({
          id: item.id,
          label: item.label.trim(),
          requestKind: item.requestKind,
          valueKind: item.valueKind,
          disposition: item.disposition,
          aggregation: item.aggregation,
          groupKey: item.groupKey.trim(),
          claimedAmountMillieme: item.valueKind === "known" ? Math.round(Number(item.claimedAmount) * 1000) : undefined,
          awardedAmountMillieme: item.valueKind === "known" && item.disposition === "awarded-partial" ? Math.round(Number(item.awardedAmount) * 1000) : undefined
        })) : undefined,
        finalAccruals: hasDetailedFinalClaims && finalAccruals.length ? finalAccruals.map((item) => ({
          id: item.id,
          label: item.label.trim(),
          kind: item.kind,
          filingBasisMillieme: Math.round(Number(item.filingBasis) * 1000),
          accruedToJudgmentMillieme: Math.round(Number(item.accruedToJudgment) * 1000)
        })) : undefined,
        urgent,
        exempt: false,
        feeRelief,
        calculationDate: new Date().toISOString().slice(0, 10),
        caseFacts
      });
      setResult(response);
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "تعذر الحساب");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setCourtLevel("primary"); setStage("filing"); setValueKind("known"); setClaimStructure("single"); setClaimAmount("40000");
    setAwardedAmount("10000"); setPrepaid(""); setSettlementAmount(""); setSettlementHasKnownExecutableTerms(false); setSettlementReducedFeeCase(false); setFinalOutcome("judgment-partial"); setFinalTiming("first-session-before-pleading"); setUrgent(false); setFeeRelief({ applicant: "ordinary-person", legalAidDecision: "none", reductionContext: "none" }); setResult(null); setSubmitError("");
    setLeaseMonthlyRent("1000"); setLeaseMonths("12"); setLeaseIncludesArrears(false); setLeaseArrears("0");
    setContractSubjectValue("40000"); setContractCounterValue(""); setPropertyKind("built"); setPropertyAnnualBase("12000");
    setPropertyShareNumerator("1"); setPropertyShareDenominator("1"); setPeriodicAnnualAmount("12000"); setPeriodicTerm("permanent"); setPeriodicYears("1"); setStateCouncilIncludesStay(false);
    setExecutionAmount("10000");
    setLabourClaimantRole("employee"); setLabourArisesUnderLaw14(true); setCompanyInterestValue("40000");
    setPersonalStatusUnitCount("1"); setPersonalStatusAdditionalSheets("0"); setPersonalStatusPriorFee("0");
    setTaxRoute("court-action"); setTaxPeriods([{ id: "tax-period-1", label: "2025", disputedProfit: "40000" }]);
    setUseDetailedFinalClaims(false); setFinalClaims([newFinalClaim(1)]); setFinalAccruals([]);
  };

  if (catalogError) return <ErrorState message={catalogError} retry={loadCatalog} />;
  if (!catalog) return <LoadingState label="جارٍ تحميل القواعد المنشورة…" />;

  return (
    <div className="stack-xl">
      <div className="page-intro calculator-intro">
        <div><h2>التقدير</h2></div>
        <div className="rule-version"><CheckCircle2 /><span><small>الإصدار المنشور</small><strong>{catalog.ruleSet.version}</strong></span></div>
      </div>

      {!canCalculate && <div className="permission-note"><LockKeyhole /><span><strong>وضع القراءة فقط</strong> دورك يسمح بمراجعة القواعد والنتائج ولا يسمح بإنشاء تقدير مالي.</span></div>}

      <div className="calculator-layout">
        <section className="form-panel">
          <div className="form-section-heading"><span>١</span><div><h3>الدعوى</h3></div></div>
          <div className="field-grid">
            <label className="field span-2"><span>المحكمة</span><div className="select-wrap"><Landmark /><select value={courtId} onChange={(event) => { setCourtId(event.target.value); setResult(null); }}>{catalog.courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select><ChevronDown /></div></label>
            <label className="field"><span>درجة المحكمة</span><select value={courtLevel} onChange={(event) => { setCourtLevel(event.target.value as CourtLevel); setResult(null); }}>{Object.entries(levelNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="field"><span id="stage-label">مرحلة الحساب</span><div className="segmented" role="group" aria-labelledby="stage-label"><button className={stage === "filing" ? "active" : ""} onClick={() => { setStage("filing"); setResult(null); }} type="button" aria-pressed={stage === "filing"}>عند الرفع</button><button className={stage === "final" ? "active" : ""} onClick={() => { setStage("final"); setFinalOutcome(isOrdinaryAppeal ? "appeal-affirmed" : selectedCase?.jurisdiction === "criminal" ? "criminal-conviction" : selectedCase?.jurisdiction === "constitutional" ? "constitutional-accepted" : selectedCase?.defaultValueKind === "unknown" ? "judgment-full" : "judgment-partial"); setResult(null); }} type="button" aria-pressed={stage === "final"} disabled={finalStageNotApplicable} title={finalStageNotApplicable ? "هذا طلب أو إجراء مستقل وليس خصومة ذات تسوية نهائية" : undefined}>التسوية النهائية</button></div>{finalStageNotApplicable && <small className="field-hint">هذا طلب أو إجراء مستقل؛ يُحسب عند تقديمه ولا تُنشأ له تسوية نهاية خصومة.</small>}</div>
            <label className="field span-2"><span>نوع الدعوى</span><div className="select-wrap searchable"><FileText /><input list="case-types-list" value={caseQuery} onChange={(event) => chooseCaseByName(event.target.value)} onBlur={() => setCaseQuery(selectedCase?.name ?? "")} placeholder="اكتب للبحث في أنواع الدعاوى…" autoComplete="off" /><Search /></div><datalist id="case-types-list">{catalog.caseTypes.map((item) => <option key={item.id} value={item.name} />)}</datalist><small className="field-hint">{catalog.caseTypes.length.toLocaleString("ar-EG")} نوعًا مفهرسًا؛ كل نوع مرتبط بملف قانوني وطريقة تقدير.</small></label>
            {selectedCase && <div className={`case-profile-card span-2 ${selectedCase.coverage}`}><BookOpen /><span><strong>{selectedCase.profileName}</strong><small>{jurisdictionNames[selectedCase.jurisdiction]} · {selectedCase.coverage === "calculable" || conditionalFactsComplete || (stage === "final" && selectedCase.finalSettlementPolicy === "value-kind-dependent") ? "الحساب الآلي متاح" : selectedCase.coverage === "conditional" ? "يلزم استكمال وقائع النوع" : "موقوف للمراجعة القانونية"}</small>{selectedCase.requiredFacts.length > 0 && <small>المطلوب: {selectedCase.requiredFacts.join("، ")}</small>}{selectedCase.reviewNote && <small>{selectedCase.reviewNote}</small>}</span></div>}
          </div>

          <div className="form-divider" />
          <div className="form-section-heading"><span>٢</span><div><h3>الوعاء</h3></div></div>
          <div className="field-grid">
            {stage === "final" && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>نتيجة الخصومة الحاكمة للتسوية</strong><small>الرسوم النهائية تُبنى على منطوق الحكم وطريقة انتهاء الخصومة، لا على قيمة الصحيفة وحدها.</small></span></div><div className="field-grid"><label className="field span-2"><span>النتيجة الإجرائية النهائية</span><select aria-label="النتيجة الإجرائية النهائية" value={finalOutcome} onChange={(event) => { setFinalOutcome(event.target.value as FinalOutcome); setSettlementAmount(""); setSettlementHasKnownExecutableTerms(false); setSettlementReducedFeeCase(false); setResult(null); }}>{Object.entries(finalOutcomeNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{finalOutcomeNeedsTiming && <label className="field span-2"><span>توقيت الصلح أو الترك</span><select aria-label="توقيت الصـلح أو الترك" value={finalTiming} onChange={(event) => { setFinalTiming(event.target.value as FinalTiming); setResult(null); }}>{Object.entries(finalTimingNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small className="field-hint">{finalOutcome === "abandoned" ? "ربع المسدد فقط إذا وقع الترك في الجلسة الأولى قبل بدء المرافعة؛ وبعدها لا يطبق تخفيض النصف الخاص بالصلح." : "ربع المسدد في الجلسة الأولى قبل المرافعة، ونصف الرسم قبل الحكم القطعي/التمهيدي، وكامل الرسم بعده."}</small></label>}{settlementDetailsRequired && valueKind === "known" && <label className="field span-2"><span>قيمة المصالح عليه المثبتة في المحضر <small>(اتركها فارغة إن لم تُبيَّن)</small></span><div className="money-input"><input aria-label="قيمة المصالح عليه المثبتة في المحضر" type="number" min="0" step="0.001" value={settlementAmount} onChange={(event) => { setSettlementAmount(event.target.value); setResult(null); }} /><b>جنيه</b></div><small className="field-hint">تستخدم قيمة الطلب، إلا إذا جاوزها المصالح عليه؛ وإذا تجاوزت الدعوى ألف جنيه وكان الصلح على أقل منها يكون الوعاء ألف جنيه.</small></label>}{settlementDetailsRequired && valueKind === "unknown" && <><label className="check-field span-2"><input type="checkbox" checked={settlementHasKnownExecutableTerms} onChange={(event) => { setSettlementHasKnownExecutableTerms(event.target.checked); if (!event.target.checked) setSettlementAmount(""); setResult(null); }} /><span><strong>محضر الصلح يتضمن التزامًا ماليًا معلومًا قابلًا للتنفيذ دون قضاء جديد</strong><small>عند تحققه يستحق الرسم النسبي على هذا الالتزام فضلًا عن الرسم الثابت.</small></span></label>{settlementHasKnownExecutableTerms && <label className="field span-2"><span>قيمة الالتزام المالي في محضر الصلح</span><div className="money-input"><input aria-label="قيمة الالتزام المالي في محضر الصلح" type="number" min="0.001" step="0.001" value={settlementAmount} onChange={(event) => { setSettlementAmount(event.target.value); setResult(null); }} /><b>جنيه</b></div></label>}</>}{settlementDetailsRequired && <label className="check-field span-2"><input type="checkbox" checked={settlementReducedFeeCase} onChange={(event) => { setSettlementReducedFeeCase(event.target.checked); setResult(null); }} /><span><strong>الدعوى من الدعاوى مخفضة القيمة أو الرسم</strong><small>المادة 20 تمنع رد شيء من الرسوم في هذه الحالة عند الصلح؛ فعّلها فقط إذا ثبت وصف التخفيض.</small></span></label>}</div></div>}
            <div className="field span-2"><span id="value-kind-label">طبيعة القيمة</span><div className="segmented" role="group" aria-labelledby="value-kind-label"><button className={valueKind === "known" ? "active" : ""} onClick={() => { setValueKind("known"); setResult(null); }} type="button" aria-pressed={valueKind === "known"} disabled={selectedCase ? !selectedCase.allowedValueKinds.includes("known") : false}>معلومة القيمة</button><button className={valueKind === "unknown" ? "active" : ""} onClick={() => { setValueKind("unknown"); setResult(null); }} type="button" aria-pressed={valueKind === "unknown"} disabled={selectedCase ? !selectedCase.allowedValueKinds.includes("unknown") : false}>مجهولة القيمة</button></div></div>
            <label className="field span-2"><span>بنية الطلبات في الصحيفة</span><select value={claimStructure} onChange={(event) => { const next = event.target.value as ClaimStructure; setClaimStructure(next); if (stage === "final" && ["same-basis", "different-bases", "rent-termination"].includes(next)) setUseDetailedFinalClaims(true); setResult(null); }}>{Object.entries(claimStructureNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small className="field-hint">المادة 7 تفرق بين الطلبات الناشئة عن سند واحد والطلبات الناشئة عن سندات مختلفة.</small></label>
            {detailedFinalSupported && <label className="check-field span-2 detailed-final-switch"><input type="checkbox" checked={useDetailedFinalClaims} onChange={(event) => { setUseDetailedFinalClaims(event.target.checked); setResult(null); }} /><span><strong>تسوية متقدمة: تحليل منطوق الحكم طلبًا بطلب</strong><small>فعّلها عند تعدد الطلبات، اختلاف الأسانيد، وجود طلب تابع أو عارض، أو اختلاف نتيجة كل طلب.</small></span></label>}
            {hasDetailedFinalClaims && <FinalClaimsPanel claims={finalClaims} onClaimsChange={(items) => { setFinalClaims(items); setResult(null); }} accruals={finalAccruals} onAccrualsChange={(items) => { setFinalAccruals(items); setResult(null); }} />}
            {isTaxProfitAssessment && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>فترات منازعة تقدير الأرباح الضريبية</strong><small>المادة 6 تخفض الرسم إلى النصف، والمادة 75 تجعل الوعاء هو الأرباح المتنازع عليها لا مبلغ الضريبة.</small></span></div><div className="field-grid"><label className="field span-2"><span>المسار الحالي</span><select value={taxRoute} onChange={(event) => { setTaxRoute(event.target.value as TaxDisputeRoute); setResult(null); }}><option value="court-action">طعن قضائي أمام مجلس الدولة</option><option value="appeal-committee">اعتراض أو لجنة طعن ضريبي</option><option value="termination-committee">طلب إنهاء منازعة وفق القانون 79 لسنة 2016</option></select><small className="field-hint">اللجان هيئات إدارية؛ لا تُسعّر كصحيفة دعوى قضائية. تجديد إنهاء المنازعات ممتد حتى 31 ديسمبر 2026.</small></label>{taxRoute === "court-action" ? <div className="tax-periods span-2">{taxPeriods.map((period, index) => <div className="tax-period-row" key={period.id}><label className="field"><span>السنة أو الفترة</span><input value={period.label} onChange={(event) => { setTaxPeriods((items) => items.map((item) => item.id === period.id ? { ...item, label: event.target.value } : item)); setResult(null); }} placeholder="مثال: 2025" maxLength={120} /></label><label className="field"><span>الأرباح المتنازع عليها</span><div className="money-input"><input type="number" min="0.001" step="0.001" value={period.disputedProfit} onChange={(event) => { setTaxPeriods((items) => items.map((item) => item.id === period.id ? { ...item, disputedProfit: event.target.value } : item)); setResult(null); }} /><b>جنيه</b></div></label><button className="button ghost compact" type="button" onClick={() => { setTaxPeriods((items) => items.filter((item) => item.id !== period.id)); setResult(null); }} disabled={taxPeriods.length === 1}>حذف</button><small>فترة {index + 1}: تُطبق عليها الشرائح مستقلة قبل عامل النصف.</small></div>)}<button className="button ghost compact" type="button" onClick={() => { setTaxPeriods((items) => [...items, { id: `tax-period-${Date.now()}`, label: "", disputedProfit: "" }]); setResult(null); }}>إضافة سنة أو فترة</button></div> : <div className="legal-scope-note span-2"><BookOpen /><span><strong>هذا إجراء إداري وليس قيد دعوى</strong><small>لا ينشئ رسم صحيفة قضائية بذاته. إذا كانت هناك دعوى قائمة، تسجل آثار وقفها أو إنهائها في التسوية الخاصة بها.</small></span></div>}{stage === "final" && <div className="legal-scope-note span-2"><BookOpen /><span><strong>التسوية النهائية تفصل كل فترة</strong><small>فعّل التحليل المتقدم أعلاه وأنشئ بطاقة طلب مستقلة لكل سنة وفق منطوق الحكم.</small></span></div>}</div></div>}
            {isLeaseProfile && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع تقدير الدعوى الإيجارية</strong><small>يشتق النظام الوعاء؛ لا تدخل قيمة إجمالية يدويًا.</small></span></div><div className="field-grid"><label className="field"><span>الأجرة الشهرية</span><div className="money-input"><input type="number" min="0.01" step="0.01" value={leaseMonthlyRent} onChange={(event) => { setLeaseMonthlyRent(event.target.value); setResult(null); }} /><b>جنيه</b></div></label><label className="field"><span>عدد الأشهر محل التقدير</span><input type="number" min="1" max="1200" step="1" value={leaseMonths} onChange={(event) => { setLeaseMonths(event.target.value); setResult(null); }} /></label><label className="check-field"><input type="checkbox" checked={leaseIncludesArrears} onChange={(event) => { setLeaseIncludesArrears(event.target.checked); setResult(null); }} /><span><strong>يوجد طلب متأخرات مرتبط</strong><small>يستخدم الأعلى ولا يجمع الطلبين آليًا</small></span></label>{leaseIncludesArrears && <label className="field"><span>قيمة المتأخرات</span><div className="money-input"><input type="number" min="0" step="0.01" value={leaseArrears} onChange={(event) => { setLeaseArrears(event.target.value); setResult(null); }} /><b>جنيه</b></div></label>}</div></div>}
            {isContractProfile && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع تقدير العقد أو التصرف</strong><small>الوعاء هو قيمة الشيء محل العقد؛ وفي البدل تستخدم القيمة الأعلى.</small></span></div><div className="field-grid"><label className="field"><span>قيمة محل العقد</span><div className="money-input"><input type="number" min="0.01" step="0.01" value={contractSubjectValue} onChange={(event) => { setContractSubjectValue(event.target.value); setResult(null); }} /><b>جنيه</b></div></label><label className="field"><span>قيمة المقابل الآخر في البدل <small>(اختياري)</small></span><div className="money-input"><input type="number" min="0.01" step="0.01" value={contractCounterValue} onChange={(event) => { setContractCounterValue(event.target.value); setResult(null); }} /><b>جنيه</b></div></label></div></div>}
            {isPropertyProfile && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع تقدير الحق العقاري</strong><small>المادة 75 تربط الوعاء بالتكليف الضريبي ونسبة الحق، لا بتقدير حر.</small></span></div><div className="field-grid"><label className="field"><span>نوع العقار</span><select value={propertyKind} onChange={(event) => { setPropertyKind(event.target.value as "agricultural" | "built"); setResult(null); }}><option value="agricultural">أرض زراعية</option><option value="built">عقار مبني</option></select></label><label className="field"><span>{propertyKind === "agricultural" ? "الضريبة الأصلية السنوية" : "القيمة الإيجارية السنوية المتخذة أساسًا للضريبة"}</span><div className="money-input"><input type="number" min="0.001" step="0.001" value={propertyAnnualBase} onChange={(event) => { setPropertyAnnualBase(event.target.value); setResult(null); }} /><b>جنيه</b></div></label><label className="field"><span>بسط الحصة المطلوبة</span><input type="number" min="1" step="1" value={propertyShareNumerator} onChange={(event) => { setPropertyShareNumerator(event.target.value); setResult(null); }} /></label><label className="field"><span>مقام الحصة</span><input type="number" min="1" step="1" value={propertyShareDenominator} onChange={(event) => { setPropertyShareDenominator(event.target.value); setResult(null); }} /></label></div></div>}
            {isPeriodicProfile && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع تقدير الاستحقاق الدوري</strong><small>يطبق معامل الاستحقاق الدائم أو مدى الحياة أو المدة المؤقتة بحد أقصى عشر سنوات.</small></span></div><div className="field-grid"><label className="field"><span>القيمة السنوية</span><div className="money-input"><input type="number" min="0.01" step="0.01" value={periodicAnnualAmount} onChange={(event) => { setPeriodicAnnualAmount(event.target.value); setResult(null); }} /><b>جنيه</b></div></label><label className="field"><span>نوع الاستحقاق</span><select value={periodicTerm} onChange={(event) => { setPeriodicTerm(event.target.value as "permanent" | "life" | "temporary"); setResult(null); }}><option value="permanent">دائم - 20 ضعف القيمة السنوية</option><option value="life">مدى الحياة - 10 أضعاف</option><option value="temporary">مؤقت - بعدد السنوات بحد أقصى 10</option></select></label>{periodicTerm === "temporary" && <label className="field"><span>عدد السنوات</span><input type="number" min="1" max="10" step="1" value={periodicYears} onChange={(event) => { setPeriodicYears(event.target.value); setResult(null); }} /></label>}</div></div>}
            {isExecutionApplication && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع رسم التنفيذ</strong><small>{selectedCase?.id === "execution-repeat" ? "سيحسب تسع الرسم الأصلي مع ثلث الرسم الثابت المصاحب." : "سيحسب ثلث الرسم الأصلي مع الرسم الثابت المصاحب."}</small></span></div><div className="field-grid"><label className="field"><span>{selectedCase?.id === "arbitration-award-execution" ? "مبلغ حكم التحكيم المطلوب تنفيذه" : "المبلغ المطلوب تنفيذه"}</span><div className="money-input"><input type="number" min="0.01" step="0.01" value={executionAmount} onChange={(event) => { setExecutionAmount(event.target.value); setResult(null); }} /><b>جنيه</b></div></label></div></div>}
            {isLabourProfile && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع أهلية الإعفاء العمالي</strong><small>لا يقرر الإعفاء من كلمة «عمالية» وحدها.</small></span></div><div className="field-grid"><label className="field"><span>صفة رافع الدعوى</span><select value={labourClaimantRole} onChange={(event) => { setLabourClaimantRole(event.target.value as "employee" | "employer" | "other"); setResult(null); }}><option value="employee">عامل/متدرب/متلمذ أو مستحق عنه</option><option value="employer">صاحب العمل</option><option value="other">صفة أخرى</option></select></label><label className="check-field"><input type="checkbox" checked={labourArisesUnderLaw14} onChange={(event) => { setLabourArisesUnderLaw14(event.target.checked); setResult(null); }} /><span><strong>الدعوى ناشئة عن تطبيق قانون العمل 14 لسنة 2025</strong><small>يُراجع تاريخ السريان تلقائيًا</small></span></label></div></div>}
            {isCompanyProfile && valueKind === "known" && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>وقائع المصلحة المالية في نزاع الشركة</strong><small>لا يستخدم رأس مال الشركة كاملًا إلا إذا كان هو محل النزاع.</small></span></div><div className="field-grid"><label className="field"><span>قيمة الحصة أو المصلحة المالية محل النزاع</span><div className="money-input"><input type="number" min="0.01" step="0.01" value={companyInterestValue} onChange={(event) => { setCompanyInterestValue(event.target.value); setResult(null); }} /><b>جنيه</b></div></label></div></div>}
            {isPersonalStatusUnitCase && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>موضوعات اتفاق التطليق بالتراضي</strong><small>يتعدد رسم الجنيه بتعدد الموضوعات مجهولة القيمة؛ أما الموضوع المالي فله وعاء مستقل.</small></span></div><div className="field-grid"><label className="field"><span>عدد الموضوعات مجهولة القيمة</span><input type="number" min="1" max="1000" step="1" value={personalStatusUnitCount} onChange={(event) => { setPersonalStatusUnitCount(event.target.value); setResult(null); }} /></label></div></div>}
            {isPersonalStatusSheetsCase && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>أوراق إشهاد الإقرار بالنسب</strong><small>الرسم جنيه، ويضاف 200 مليم عن كل ورقة بعد الأولى.</small></span></div><div className="field-grid"><label className="field"><span>عدد الأوراق الزائدة على الأولى</span><input type="number" min="0" max="100000" step="1" value={personalStatusAdditionalSheets} onChange={(event) => { setPersonalStatusAdditionalSheets(event.target.value); setResult(null); }} /></label></div></div>}
            {isWillDeposit && <div className="case-facts-panel span-2"><div className="case-facts-title"><BookOpen /><span><strong>خصم الرسم السابق لحفظ الوصية</strong><small>يحسب نصف في المائة من المال الموصى به الموجود في مصر، ثم يخصم ما سبق دفعه عن تعيين المنفذ أو مدير التركة.</small></span></div><div className="field-grid"><label className="field"><span>الرسم السابق القابل للخصم</span><div className="money-input"><input type="number" min="0" step="0.001" value={personalStatusPriorFee} onChange={(event) => { setPersonalStatusPriorFee(event.target.value); setResult(null); }} /><b>جنيه</b></div></label></div></div>}
            {isStateSupremeAppeal && <label className="check-field span-2"><input type="checkbox" checked={stateCouncilIncludesStay} onChange={(event) => { setStateCouncilIncludesStay(event.target.checked); setResult(null); }} /><span><strong>الطعن يتضمن طلب وقف تنفيذ</strong><small>يضاف رسم الطلب الثابت كوعاء مستقل ومفسر</small></span></label>}
            {claimStructure === "same-basis" && valueKind === "known" && !hasDetailedFinalClaims && <div className="legal-scope-note span-2"><BookOpen /><span><strong>سيحسب الرسم على مجموع الطلبات</strong><small>أدخل في خانة القيمة إجمالي الطلبات المعلومة الناشئة عن السند القانوني نفسه.</small></span></div>}
            {needsLegalReview && <div className="legal-review-stop span-2"><AlertTriangle /><span><strong>توقف آمن للمراجعة القانونية</strong><small>{caseTypeNeedsReview ? "نوع الدعوى يحتاج الوقائع المبينة في ملفه القانوني أو استكمال اعتماده؛ لن تُستخدم له المعادلة المدنية العامة." : "هذه الحالة تحتاج فصل أوعية الطلبات أو قاعدة تقدير خاصة. لن يصدر النظام رقمًا تقديريًا قد يكون مضللًا."}</small></span></div>}
            {valueKind === "known" && !usesDerivedValue && !hasDetailedFinalClaims && <>
              <label className="field"><span>{claimStructure === "same-basis" ? "إجمالي قيم الطلبات" : "قيمة الدعوى"}</span><div className="money-input"><input type="number" min="0.01" step="0.01" value={claimAmount} onChange={(event) => { setClaimAmount(event.target.value); setResult(null); }} /><b>جنيه</b></div></label>
              {stage === "final" && ["judgment-partial", "appeal-modified"].includes(finalOutcome) && <label className="field"><span>{finalOutcome === "appeal-modified" ? "القيمة التي انتهى إليها الحكم الاستئنافي" : "الوعاء القانوني للجزء المقضي به"}</span><div className="money-input"><input type="number" min="0" step="0.01" value={awardedAmount} onChange={(event) => { setAwardedAmount(event.target.value); setResult(null); }} /><b>جنيه</b></div></label>}
            </>}
            {stage === "final" && <label className="field"><span>الرسم الأصلي السابق سداده {finalOutcomeNeedsTiming ? "" : <small>(اختياري عند الحكم)</small>}</span><div className="money-input"><input type="number" min="0" step="0.001" placeholder={finalOutcomeNeedsTiming ? "إلزامي لحساب الرد أو الاستكمال" : "يُحسب تلقائيًا عند تركه"} value={prepaid} onChange={(event) => { setPrepaid(event.target.value); setResult(null); }} /><b>جنيه</b></div></label>}
            <label className="check-field"><input type="checkbox" checked={urgent} onChange={(event) => { setUrgent(event.target.checked); setResult(null); }} /><span><strong>طلب مستعجل</strong><small>يؤثر في الرسم الثابت وأتعاب المحاماة</small></span></label>
            <FeeReliefPanel value={feeRelief} onChange={(next) => { setFeeRelief(next); setResult(null); }} />
          </div>
          {submitError && <div className="inline-error"><AlertTriangle />{submitError}</div>}
          <div className="form-actions"><button className="button ghost" type="button" onClick={reset}><RotateCcw />مسح البيانات</button><button className="button primary large" type="button" onClick={calculate} disabled={!canCalculate || needsLegalReview || submitting}>{submitting ? <span className="spinner light" /> : <Calculator />} {submitting ? "جارٍ الحساب…" : needsLegalReview ? "يلزم مراجعة قانونية" : "احسب التقدير"}<ArrowLeft /></button></div>
        </section>

        <aside className="estimate-side" ref={resultRef} tabIndex={-1} aria-live="polite">
          {result ? <FeeResultCard result={result} /> : <div className="empty-result"><span className="empty-icon"><Calculator /></span><h3>النتيجة</h3><p>أدخل البيانات ثم نفّذ الحساب.</p><div className="empty-proof"><BookOpen /><span><strong>السند</strong><small>المصدر، المادة، الإصدار، والحساب</small></span></div></div>}
        </aside>
      </div>
    </div>
  );
}
