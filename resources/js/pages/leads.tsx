import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Plus,
    MapPin,
    Phone,
    Mail,
    TrendingUp,
    Users,
    Flame,
    BellRing,
    XCircle,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { getUserColor } from '@/lib/user-colors';
import EnquiryModal, { type FullEnquiry, type CrmUser } from '@/components/EnquiryModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SourceRow { source: string; count: number }

interface Stats {
    total: number;
    newThisMonth: number;
    hot: number;
    needFollowup: number;
    lost: number;
    thisMonthLabel: string;
}

interface PageProps extends Record<string, unknown> {
    stats: Stats;
    sourceData: SourceRow[];
    needFollowup: FullEnquiry[];
    recentLeads: FullEnquiry[];
    users: CrmUser[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
    '#1a3a5c', '#0e7490', '#6d28d9', '#b45309',
    '#15803d', '#b91c1c', '#6b7280', '#c2410c', '#0f766e', '#be185d',
];

const STATUS_BADGE: Record<string, string> = {
    New:           'bg-blue-50 text-blue-800',
    Contacted:     'bg-amber-50 text-amber-800',
    Meeting:       'bg-purple-50 text-purple-800',
    '1st Deposit': 'bg-green-50 text-green-800',
    '2nd Deposit': 'bg-teal-50 text-teal-800',
    Closed:        'bg-gray-100 text-gray-600',
    Lost:          'bg-red-50 text-red-700',
};

const AXIS_TICK = { fontSize: 11, fill: '#6b7280' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function repLabel(lead: FullEnquiry) {
    return lead.assignedUser?.name ?? lead.rep ?? '—';
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, accent, icon: Icon, sub,
}: {
    label: string; value: number; accent: string;
    icon: React.ElementType; sub?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <Icon size={18} className="mb-2" style={{ color: accent }} />
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="mt-0.5 text-xs font-medium text-gray-700">{label}</div>
            {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
        </div>
    );
}

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <h2 className="shrink-0 font-serif text-xl font-normal text-gray-900">{label}</h2>
            <div className="flex-1 border-t border-gray-200" />
        </div>
    );
}

function CardWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

function CardTitle({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
        </div>
    );
}

// ─── Lead table ───────────────────────────────────────────────────────────────

type PageSize = 10 | 20 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 'all'];

function LeadTable({ leads, emptyMessage, onSelect }: { leads: FullEnquiry[]; emptyMessage: string; onSelect: (id: number) => void }) {
    const [search, setSearch]     = useState('');
    const [page, setPage]         = useState(1);
    const [pageSize, setPageSize] = useState<PageSize>(10);

    const query = search.toLowerCase().trim();

    const filtered = useMemo(() => {
        if (!query) return leads;
        return leads.filter((lead) =>
            [lead.name, lead.phone, lead.email, lead.type, lead.loc, lead.status, lead.source,
             lead.assignedUser?.name ?? lead.rep]
                .some((field) => field?.toLowerCase().includes(query))
        );
    }, [leads, query]);

    const totalPages  = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageItems   = pageSize === 'all' ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function handleSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function handlePageSize(value: PageSize) {
        setPageSize(value);
        setPage(1);
    }

    if (!leads.length) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400 shadow-sm">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => handleSearch(event.target.value)}
                        placeholder="Search by name, type, location…"
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-8 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                    />
                    {search && (
                        <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={13} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="mr-1">Show:</span>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                        <button
                            key={size}
                            onClick={() => handlePageSize(size)}
                            className={`rounded-md px-2.5 py-1 font-medium transition ${pageSize === size ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {size === 'all' ? 'All' : size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {pageItems.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-400">
                        No leads match your search.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="w-9 px-4 py-3" />
                                    <th className="min-w-[140px] px-4 py-3">Client</th>
                                    <th className="hidden min-w-[100px] px-4 py-3 sm:table-cell">Phone</th>
                                    <th className="hidden min-w-[100px] px-4 py-3 md:table-cell">Type</th>
                                    <th className="hidden min-w-[130px] px-4 py-3 lg:table-cell">Location</th>
                                    <th className="hidden px-4 py-3 sm:table-cell">Source</th>
                                    <th className="hidden px-4 py-3 md:table-cell">Rep</th>
                                    <th className="min-w-[100px] px-4 py-3">Status</th>
                                    <th className="hidden w-20 px-4 py-3 sm:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((lead) => {
                                    const colors = getUserColor(lead.assignedUser?.color ?? undefined);
                                    return (
                                        <tr
                                            key={lead.id}
                                            className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                                            onClick={() => onSelect(lead.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <div
                                                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                                                    style={{ background: colors.bg, color: colors.text }}
                                                >
                                                    {getInitials(lead.name)}
                                                </div>
                                            </td>
                                            <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                                {lead.name}
                                            </td>
                                            <td className="hidden whitespace-nowrap px-4 py-3 text-gray-500 sm:table-cell">
                                                {lead.phone || '—'}
                                            </td>
                                            <td className="hidden px-4 py-3 md:table-cell">
                                                {lead.type && (
                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                                        {lead.type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="hidden overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-gray-500 lg:table-cell">
                                                {lead.loc || '—'}
                                            </td>
                                            <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                                                {lead.source || '—'}
                                            </td>
                                            <td className="hidden px-4 py-3 md:table-cell">
                                                {(lead.assignedUser || lead.rep) && (
                                                    <span
                                                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                                                        style={{ background: colors.bg, color: colors.text }}
                                                    >
                                                        {repLabel(lead)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-gray-400 sm:table-cell">
                                                {formatDate(lead.date)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="px-2 tabular-nums">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Source chart tooltip ─────────────────────────────────────────────────────

function SourceTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
            <p className="font-semibold text-gray-700">{payload[0].name}</p>
            <p className="text-gray-600">{payload[0].value} enquiries</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
    const { stats, sourceData, needFollowup, recentLeads, users } = usePage<PageProps>().props;

    const [selectedId, setSelectedId]   = useState<number | null>(null);
    const [overrides, setOverrides]     = useState<Map<number, Partial<FullEnquiry>>>(new Map());

    const allLeads = [...needFollowup, ...recentLeads];

    const selectedEnquiry = (() => {
        if (selectedId === null) return null;
        const base = allLeads.find((lead) => lead.id === selectedId);
        if (!base) return null;
        return { ...base, ...(overrides.get(selectedId) ?? {}) } as FullEnquiry;
    })();

    function updateEnquiry(updated: FullEnquiry) {
        setOverrides((prev) => new Map(prev).set(updated.id, updated));
    }

    const maxSource = Math.max(...sourceData.map((s) => s.count), 1);

    return (
        <>
            <Head title="Leads" />

            <div className="space-y-6 p-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Incoming leads by source &amp; stage</p>
                    </div>
                    <Link
                        href="/enquiries"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800"
                    >
                        <Plus size={15} /> New enquiry
                    </Link>
                </div>

                {/* ── Stats ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard
                        label="Total leads"
                        value={stats.total}
                        accent="#1a3a5c"
                        icon={Users}
                    />
                    <StatCard
                        label="New this month"
                        value={stats.newThisMonth}
                        accent="#0e7490"
                        icon={TrendingUp}
                        sub={stats.thisMonthLabel}
                    />
                    <StatCard
                        label="Hot (meeting)"
                        value={stats.hot}
                        accent="#6d28d9"
                        icon={Flame}
                    />
                    <StatCard
                        label="Need follow-up"
                        value={stats.needFollowup}
                        accent="#ea580c"
                        icon={BellRing}
                        sub="No response yet"
                    />
                    <StatCard
                        label="Lost"
                        value={stats.lost}
                        accent="#b91c1c"
                        icon={XCircle}
                    />
                </div>

                {/* ── Lead source section ─────────────────────────────────── */}
                <SectionDivider label="Lead sources" />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Doughnut chart */}
                    <CardWrap>
                        <CardTitle
                            title="Lead source breakdown"
                            sub="Where are your enquiries coming from?"
                        />
                        {sourceData.length === 0 ? (
                            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={sourceData.map((item, idx) => ({ ...item, fill: CHART_COLORS[idx % CHART_COLORS.length] }))}
                                        dataKey="count"
                                        nameKey="source"
                                        cx="40%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={95}
                                        paddingAngle={2}
                                        stroke="none"
                                    />
                                    <Legend
                                        layout="vertical"
                                        align="right"
                                        verticalAlign="middle"
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => (
                                            <span style={{ fontSize: 11, color: '#374151' }}>{value}</span>
                                        )}
                                    />
                                    <Tooltip content={<SourceTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardWrap>

                    {/* Source performance table */}
                    <CardWrap>
                        <CardTitle
                            title="Source performance"
                            sub="Volume per lead channel"
                        />
                        <div className="space-y-2">
                            {sourceData.map((row, idx) => (
                                <div key={row.source} className="flex items-center gap-3">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                                    />
                                    <span className="w-32 shrink-0 truncate text-xs text-gray-700">{row.source}</span>
                                    <div className="flex flex-1 items-center gap-2">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.round((row.count / maxSource) * 100)}%`,
                                                    background: CHART_COLORS[idx % CHART_COLORS.length],
                                                }}
                                            />
                                        </div>
                                        <span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-900">
                                            {row.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardWrap>
                </div>

                {/* ── Needs follow-up ────────────────────────────────────── */}
                <SectionDivider label="Active leads needing follow-up" />
                <LeadTable
                    leads={needFollowup}
                    emptyMessage="All active leads have notes — great work!"
                    onSelect={setSelectedId}
                />

                {/* ── Recent leads ───────────────────────────────────────── */}
                <SectionDivider label="Recent leads" />
                <LeadTable
                    leads={recentLeads}
                    emptyMessage="No leads yet."
                    onSelect={setSelectedId}
                />

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

LeadsPage.layout = {
    breadcrumbs: [{ title: 'Leads', href: '/leads' }],
};
