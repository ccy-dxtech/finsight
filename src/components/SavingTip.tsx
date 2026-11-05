export function SavingTip({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg bg-primary-soft p-4 break-keep">
      <h3 className="text-number-md text-ink">{title}</h3>
      <p className="mt-1 text-body-sm text-body">{detail}</p>
    </div>
  );
}
