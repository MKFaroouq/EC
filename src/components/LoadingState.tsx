export function LoadingState({ label = "جارٍ تحميل البيانات…" }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state"><strong>تعذر إتمام الطلب</strong><span>{message}</span>{retry && <button className="button secondary" onClick={retry}>إعادة المحاولة</button>}</div>;
}
