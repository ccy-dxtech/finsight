import Link from "next/link";
import { FileText } from "lucide-react";
import { formatDate, formatNumber, formatPeriod } from "@/lib/format";

type ReportListItemProps = {
  id: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: bigint;
  createdAt: string;
};

export function ReportListItem({ id, fileName, periodStart, periodEnd, totalAmount, createdAt }: ReportListItemProps) {
  return (
    <li className="group border-b border-hairline last:border-0">
      <Link href={`/dashboard/reports/${id}`} className="flex min-h-14 flex-wrap items-center gap-4 rounded-md py-3 hover:shadow-soft">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-body group-first:bg-primary-soft group-first:text-primary"><FileText size={20} strokeWidth={1.5} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="wrap-anywhere text-number-md text-ink">{fileName}</p>
          <p className="text-body-sm text-muted tabular-nums">{formatPeriod(periodStart, periodEnd)} · 생성 {formatDate(createdAt)}</p>
        </div>
        <p className="ml-auto text-right text-number-md text-ink tabular-nums">{formatNumber(totalAmount)}<span className="text-caption">원</span></p>
      </Link>
    </li>
  );
}
