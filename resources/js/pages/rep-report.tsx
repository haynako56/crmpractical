import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { BellRing, Clock, Check, Calendar, Download, Printer, RefreshCw } from 'lucide-react';
import { getUserColor } from '@/lib/user-colors';
import EnquiryModal, { type FullEnquiry, type CrmUser } from '@/components/EnquiryModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusCounts {
    New: number;
    Contacted: number;
    Meeting: number;
    '1st Deposit': number;
    '2nd Deposit': number;
    Cold: number;
    Lost: number;
}

interface RepEnquiry extends FullEnquiry {
    alertLevel: 'urgent' | 'warning' | 'ok';
    elapsed: string | null;
}

interface RepData {
    id: number;
    name: string;
    title: string;
    email: string;
    phone: string;
    color: number;
    statusCounts: StatusCounts;
    urgentCount: number;
    warningCount: number;
    enquiries: RepEnquiry[];
}

interface Summary {
    total: number;
    newToday: number;
    newWeek: number;
    meetings: number;
    deposits: number;
    totalAlerts: number;
}

interface PageProps extends Record<string, unknown> {
    summary: Summary;
    reps: RepData[];
    users: CrmUser[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['New', 'Contacted', 'Meeting', '1st Deposit', '2nd Deposit', 'Cold', 'Lost'] as const;

const STATUS_BADGE: Record<string, string> = {
    New:           'bg-blue-50 text-blue-800',
    Contacted:     'bg-amber-50 text-amber-800',
    Meeting:       'bg-purple-50 text-purple-800',
    '1st Deposit': 'bg-green-50 text-green-800',
    '2nd Deposit': 'bg-teal-50 text-teal-800',
    Cold:          'bg-gray-100 text-gray-600',
    Lost:          'bg-red-50 text-red-700',
};

const TYPE_BADGE: Record<string, string> = {
    'H&L':               'bg-teal-50 text-teal-700',
    'KDRB':              'bg-amber-50 text-amber-700',
    'KDRB/Dual Living':  'bg-amber-50 text-amber-700',
    'Contract':          'bg-purple-50 text-purple-700',
    'Duplex':            'bg-orange-50 text-orange-700',
    'Custom Duplex':     'bg-orange-50 text-orange-700',
    'Dual Living':       'bg-gray-100 text-gray-600',
};

const STATUS_COLOR: Record<string, string> = {
    New:           '#1e40af',
    Contacted:     '#b45309',
    Meeting:       '#6d28d9',
    '1st Deposit': '#15803d',
    '2nd Deposit': '#065f46',
    Cold:          '#6b7280',
    Lost:          '#b91c1c',
};

const STATUS_BG: Record<string, string> = {
    New:           '#dbeafe',
    Contacted:     '#fef3c7',
    Meeting:       '#ede9fe',
    '1st Deposit': '#dcfce7',
    '2nd Deposit': '#d1fae5',
    Cold:          '#f3f4f6',
    Lost:          '#fee2e2',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((word) => word[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

type Period = 'daily' | 'weekly';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
            <div className="mt-1 text-xs font-medium text-gray-700">{label}</div>
        </div>
    );
}

function RepSection({
    rep,
    onSelect,
}: {
    rep: RepData;
    onSelect: (enquiry: RepEnquiry) => void;
}) {
    const colors = getUserColor(rep.color);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Rep header */}
            <div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"
                style={{ backgroundColor: colors.bg + '28' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: colors.bg, color: colors.text }}
                    >
                        {getInitials(rep.name)}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{rep.name}</div>
                        <div className="text-xs text-gray-500">{rep.title} · {rep.enquiries.length} total enquiries</div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {rep.urgentCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            <BellRing size={11} /> {rep.urgentCount} overdue
                        </span>
                    )}
                    {rep.warningCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                            <Clock size={11} /> {rep.warningCount} warning
                        </span>
                    )}
                    {rep.urgentCount === 0 && rep.warningCount === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            <Check size={11} /> All up to date
                        </span>
                    )}
                </div>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-4">
                {STATUSES.map((status) => {
                    const count = rep.statusCounts[status] ?? 0;
                    if (count === 0) return null;
                    return (
                        <div
                            key={status}
                            className="min-w-[68px] rounded-lg px-3 py-2 text-center"
                            style={{ backgroundColor: STATUS_BG[status] }}
                        >
                            <div className="text-lg font-bold leading-tight" style={{ color: STATUS_COLOR[status] }}>{count}</div>
                            <div className="mt-0.5 text-[10px] font-medium leading-tight" style={{ color: STATUS_COLOR[status] }}>{status}</div>
                        </div>
                    );
                })}
                {rep.enquiries.length === 0 && (
                    <p className="text-sm italic text-gray-400">No enquiries assigned.</p>
                )}
            </div>

            {/* Enquiries table */}
            {rep.enquiries.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="px-4 py-3">Client</th>
                                <th className="hidden w-24 px-4 py-3 sm:table-cell">Type</th>
                                <th className="hidden w-36 px-4 py-3 md:table-cell">Location</th>
                                <th className="w-28 px-4 py-3">Status</th>
                                <th className="hidden w-24 px-4 py-3 lg:table-cell">Date</th>
                                <th className="hidden px-4 py-3 xl:table-cell">Latest note</th>
                                <th className="w-24 px-4 py-3">Alert</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rep.enquiries.map((enquiry) => {
                                const latestNote = enquiry.followUps?.[enquiry.followUps.length - 1]?.message ?? null;
                                return (
                                    <tr
                                        key={enquiry.id}
                                        onClick={() => onSelect(enquiry)}
                                        className={`cursor-pointer border-t border-gray-100 transition-colors ${
                                            enquiry.alertLevel === 'urgent'
                                                ? 'bg-red-50 hover:bg-red-100'
                                                : enquiry.alertLevel === 'warning'
                                                ? 'bg-orange-50 hover:bg-orange-100'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900">{enquiry.name}</td>
                                        <td className="hidden px-4 py-3 sm:table-cell">
                                            {enquiry.type && (
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[enquiry.type] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {enquiry.type}
                                                </span>
                                            )}
                                        </td>
                                        <td className="hidden max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-xs text-gray-500 md:table-cell">
                                            {enquiry.loc || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[enquiry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {enquiry.status}
                                            </span>
                                        </td>
                                        <td className="hidden px-4 py-3 text-xs text-gray-500 lg:table-cell">
                                            {formatDate(enquiry.date)}
                                        </td>
                                        <td className="hidden max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-xs text-gray-500 xl:table-cell">
                                            {latestNote ?? <em className="opacity-50">No notes yet</em>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {enquiry.alertLevel === 'urgent' && (
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                    <BellRing size={10} /> {enquiry.elapsed}
                                                </span>
                                            )}
                                            {enquiry.alertLevel === 'warning' && (
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                                    <Clock size={10} /> {enquiry.elapsed}
                                                </span>
                                            )}
                                            {enquiry.alertLevel === 'ok' && (
                                                <Check size={14} className="text-green-600" />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RepReportPage() {
    const { summary, reps, users } = usePage<PageProps>().props;

    const [period, setPeriod]       = useState<Period>('daily');
    const [selected, setSelected]   = useState<RepEnquiry | null>(null);
    const [overrides, setOverrides] = useState<Map<number, Partial<RepEnquiry>>>(new Map());

    const now         = new Date();
    const newCount    = period === 'daily' ? summary.newToday : summary.newWeek;
    const newLabel    = period === 'daily' ? 'New today' : 'New this week';
    const periodLabel = period === 'daily'
        ? `Today — ${now.toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`
        : `Last 7 days — to ${now.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    function handleSelect(enquiry: RepEnquiry) {
        const override = overrides.get(enquiry.id);
        setSelected(override ? { ...enquiry, ...override } : enquiry);
    }

    function handleEnquiryChange(updated: FullEnquiry) {
        setOverrides((prev) => new Map(prev).set(updated.id, updated as Partial<RepEnquiry>));
        setSelected((prev) => (prev ? { ...prev, ...updated } as RepEnquiry : null));
    }

    function exportCsv() {
        const rows: string[][] = [['Rep', 'Client', 'Type', 'Location', 'Status', 'Date', 'Latest Note', 'Alert']];
        reps.forEach((rep) => {
            rep.enquiries.forEach((enquiry) => {
                const latestNote = enquiry.followUps?.[enquiry.followUps.length - 1]?.message ?? '';
                rows.push([
                    rep.name,
                    enquiry.name,
                    enquiry.type,
                    enquiry.loc,
                    enquiry.status,
                    enquiry.date ?? '',
                    `"${latestNote.replace(/"/g, '""')}"`,
                    enquiry.alertLevel === 'urgent' ? 'Overdue'
                        : enquiry.alertLevel === 'warning' ? 'Warning'
                        : 'OK',
                ]);
            });
        });
        const csv  = rows.map((row) => row.join(',')).join('\n');
        const link = document.createElement('a');
        link.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `RepReport_${period}_${now.toISOString().slice(0, 10)}.csv`;
        link.click();
    }

    return (
        <>
            <Head title="Rep Report" />

            <div className="space-y-6 p-6">

                {/* ── Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Rep Report</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Daily &amp; weekly lead status breakdown by salesperson</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                            {(['daily', 'weekly'] as Period[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setPeriod(tab)}
                                    className={`px-4 py-2 text-sm font-medium capitalize transition ${
                                        period === tab ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                    style={period === tab ? { backgroundColor: '#1a3a5c' } : {}}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => router.reload()}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                        >
                            <Printer size={14} /> Print
                        </button>
                        <button
                            onClick={exportCsv}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* ── Period label ── */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>Report period: <strong className="text-gray-700">{periodLabel}</strong></span>
                    <span className="ml-auto text-xs">
                        Generated {now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* ── Summary stats ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Total enquiries" value={summary.total}       accent="#1a3a5c" />
                    <StatCard label={newLabel}         value={newCount}            accent="#0e7490" />
                    <StatCard label="In meetings"      value={summary.meetings}    accent="#6d28d9" />
                    <StatCard label="Deposits taken"   value={summary.deposits}    accent="#15803d" />
                    <StatCard label="Active alerts"    value={summary.totalAlerts} accent="#dc2626" />
                </div>

                {/* ── Per-rep sections ── */}
                {reps.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                        No data available.
                    </div>
                ) : (
                    reps.map((rep) => (
                        <RepSection key={rep.id} rep={rep} onSelect={handleSelect} />
                    ))
                )}
            </div>

            {/* ── Detail modal ── */}
            {selected && (
                <EnquiryModal
                    key={selected.id}
                    enquiry={selected}
                    users={users}
                    onClose={() => setSelected(null)}
                    onEnquiryChange={handleEnquiryChange}
                />
            )}
        </>
    );
}

RepReportPage.layout = {
    breadcrumbs: [{ title: 'Rep Report', href: '/rep-report' }],
};
