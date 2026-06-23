import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, DollarSign, Users, CalendarDays, Building2 } from 'lucide-react';
import { getUserColor } from '@/lib/user-colors';
import EnquiryModal, { type FullEnquiry, type CrmUser } from '@/components/EnquiryModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
    dep1Count: number;
    dep2Count: number;
    pipeline: number;
    closed: number;
    total: number;
}

interface PageProps extends Record<string, unknown> {
    dep1: FullEnquiry[];
    dep2: FullEnquiry[];
    pipeline: FullEnquiry[];
    closed: FullEnquiry[];
    users: CrmUser[];
    stats: Stats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function metaLine(row: FullEnquiry) {
    return [row.type, row.loc, row.phone].filter(Boolean).join(' · ');
}

function repLabel(row: FullEnquiry) {
    return row.assignedUser?.name ?? (row.rep || null);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, icon: Icon }: {
    label: string; value: number; accent: string; icon: React.ElementType;
}) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <Icon size={20} className="mb-2.5" style={{ color: accent }} />
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <h2 className="shrink-0 font-serif text-xl font-normal text-gray-900">{label}</h2>
            <div className="flex-1 border-t border-gray-200" />
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
            {message}
        </div>
    );
}

// ─── Deposit card ─────────────────────────────────────────────────────────────

function DepositCard({ row, depositNum, onSelect }: {
    row: FullEnquiry;
    depositNum: 1 | 2 | '?';
    onSelect: (id: number) => void;
}) {
    const colors = getUserColor(row.assignedUser?.color ?? undefined);
    const rep    = repLabel(row);

    const numClass =
        depositNum === 2
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-green-100 text-green-700';

    const notes = row.notes
        ? row.notes.length > 60 ? row.notes.substring(0, 60) + '…' : row.notes
        : null;

    return (
        <div
            className="grid cursor-pointer grid-cols-[44px_1fr] items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:grid-cols-[44px_1fr_auto]"
            onClick={() => onSelect(row.id)}
        >
            {/* number circle */}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${numClass}`}>
                {depositNum}
            </div>

            {/* info */}
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{row.name}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{metaLine(row)}</p>
                {notes && <p className="mt-0.5 truncate text-xs italic text-gray-400">{notes}</p>}
            </div>

            {/* date + rep — hidden on mobile */}
            <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                <span className="text-xs text-gray-400">{formatDate(row.date)}</span>
                {rep && (
                    <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: colors.bg, color: colors.text }}
                    >
                        {rep}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepositsPage() {
    const { dep1, dep2, pipeline, closed, users, stats } = usePage<PageProps>().props;

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [overrides, setOverrides]   = useState<Map<number, Partial<FullEnquiry>>>(new Map());

    const allRows = [...dep1, ...dep2, ...pipeline, ...closed];

    const selectedEnquiry = (() => {
        if (selectedId === null) return null;
        const base = allRows.find((row) => row.id === selectedId);
        if (!base) return null;
        return { ...base, ...(overrides.get(selectedId) ?? {}) } as FullEnquiry;
    })();

    function updateEnquiry(updated: FullEnquiry) {
        setOverrides((prev) => new Map(prev).set(updated.id, updated));
    }

    return (
        <>
            <Head title="Deposits" />

            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Deposits</h1>
                        <p className="mt-0.5 text-sm text-gray-500">1st and 2nd deposit tracking</p>
                    </div>
                    <Link
                        href="/enquiries"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800"
                    >
                        <Plus size={15} /> New enquiry
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="1st deposits"    value={stats.dep1Count} accent="#15803d" icon={DollarSign}   />
                    <StatCard label="2nd deposits"    value={stats.dep2Count} accent="#0d9488" icon={DollarSign}   />
                    <StatCard label="Total enquiries" value={stats.total}     accent="#1a3a5c" icon={Users}         />
                    <StatCard label="In meetings"     value={stats.pipeline}  accent="#6d28d9" icon={CalendarDays} />
                    <StatCard label="Cold"          value={stats.closed}    accent="#6b7280" icon={Building2}    />
                </div>

                {/* 1st Deposits */}
                <SectionDivider label="1st Deposits" />
                {dep1.length === 0
                    ? <EmptyState message="No 1st deposits recorded yet." />
                    : <div className="space-y-2.5">{dep1.map((row) => <DepositCard key={row.id} row={row} depositNum={1} onSelect={setSelectedId} />)}</div>
                }

                {/* 2nd Deposits */}
                <SectionDivider label="2nd Deposits" />
                {dep2.length === 0
                    ? <EmptyState message="No 2nd deposits recorded yet." />
                    : <div className="space-y-2.5">{dep2.map((row) => <DepositCard key={row.id} row={row} depositNum={2} onSelect={setSelectedId} />)}</div>
                }

                {/* Pipeline */}
                <SectionDivider label="Deposit pipeline" />
                {pipeline.length === 0 ? (
                    <EmptyState message="No active meetings in the pipeline." />
                ) : (
                    <div className="space-y-2.5">
                        <p className="text-sm text-gray-500">
                            These enquiries are at meeting stage and may convert soon.
                        </p>
                        {pipeline.map((row) => <DepositCard key={row.id} row={row} depositNum="?" onSelect={setSelectedId} />)}
                    </div>
                )}

                {/* Cold */}
                {closed.length > 0 && (
                    <>
                        <SectionDivider label="Cold" />
                        <div className="space-y-2.5">
                            {closed.map((row) => <DepositCard key={row.id} row={row} depositNum="?" onSelect={setSelectedId} />)}
                        </div>
                    </>
                )}

            </div>

            {selectedEnquiry && (
                <EnquiryModal
                    key={selectedEnquiry.id}
                    enquiry={selectedEnquiry}
                    users={users}
                    onClose={() => setSelectedId(null)}
                    onEnquiryChange={updateEnquiry}
                />
            )}
        </>
    );
}

DepositsPage.layout = {
    breadcrumbs: [{ title: 'Deposits', href: '/deposits' }],
};
