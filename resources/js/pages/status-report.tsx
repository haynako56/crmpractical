import { Head, router, usePage } from '@inertiajs/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusRow {
    status: string;
    count: number;
    pct: number;
}

interface MonthlyFlowRow {
    label: string;
    New: number;
    Contacted: number;
    Meeting: number;
    '1st Deposit': number;
    '2nd Deposit': number;
    Cold: number;
    Lost: number;
}

interface AvailableMonth {
    value: string;
    label: string;
}

interface Totals {
    total: number;
    active: number;
    closed: number;
    lost: number;
    deposits: number;
}

interface PageProps extends Record<string, unknown> {
    statusData: StatusRow[];
    monthlyFlow: MonthlyFlowRow[];
    selectedMonth: string;
    availableMonths: AvailableMonth[];
    totals: Totals;
    filteredTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['New', 'Contacted', 'Meeting', '1st Deposit', '2nd Deposit', 'Cold', 'Lost'] as const;

// Chart fill colors (saturated, clearly distinct)
const STATUS_CHART_COLORS: Record<string, string> = {
    New:           '#3b82f6',
    Contacted:     '#f59e0b',
    Meeting:       '#8b5cf6',
    '1st Deposit': '#22c55e',
    '2nd Deposit': '#0d9488',
    Cold:        '#9ca3af',
    Lost:          '#ef4444',
};

// Badge colors (light bg, dark text) matching enquiries page
const STATUS_BADGE: Record<string, string> = {
    New:           'bg-blue-50 text-blue-800',
    Contacted:     'bg-amber-50 text-amber-800',
    Meeting:       'bg-purple-50 text-purple-800',
    '1st Deposit': 'bg-green-50 text-green-800',
    '2nd Deposit': 'bg-teal-50 text-teal-800',
    Cold:        'bg-gray-100 text-gray-600',
    Lost:          'bg-red-50 text-red-700',
};

const AXIS_TICK = { fontSize: 11, fill: '#6b7280' };

const TOOLTIP_STYLE = {
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,.08)',
};

// ─── Shared components ────────────────────────────────────────────────────────

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

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

function SimpleTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
            {label && <p className="mb-1.5 font-semibold text-gray-700">{label}</p>}
            {payload.filter((p) => p.value > 0).map((entry, idx) => (
                <p key={idx} className="flex items-center gap-1.5 text-gray-600">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.fill }} />
                    {entry.name}: <span className="font-semibold text-gray-900">{entry.value}</span>
                </p>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatusReportPage() {
    const { statusData, monthlyFlow, selectedMonth, availableMonths, totals, filteredTotal } =
        usePage<PageProps>().props;

    function changeMonth(value: string) {
        router.get('/status-report', { month: value }, { preserveState: false });
    }

    const scopeLabel = selectedMonth === 'all'
        ? 'All time'
        : availableMonths.find((m) => m.value === selectedMonth)?.label ?? selectedMonth;

    return (
        <>
            <Head title="Status Report" />

            <div className="space-y-6 p-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Status report</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Pipeline status breakdown · {scopeLabel}</p>
                    </div>
                    <select
                        value={selectedMonth}
                        onChange={(e) => changeMonth(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-600 focus:outline-none"
                    >
                        <option value="all">All months</option>
                        {availableMonths.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>

                {/* ── Per-status summary stats ────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {statusData.map((row) => (
                        <StatCard
                            key={row.status}
                            label={row.status}
                            value={row.count}
                            accent={STATUS_CHART_COLORS[row.status] ?? '#6b7280'}
                        />
                    ))}
                </div>

                {/* ── Overall totals (always all-time) ───────────────────── */}
                {selectedMonth === 'all' && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900">{totals.total}</div>
                            <div className="mt-1 text-xs text-gray-500">Total enquiries</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="text-2xl font-bold text-blue-700">{totals.active}</div>
                            <div className="mt-1 text-xs text-gray-500">Active pipeline</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="text-2xl font-bold text-green-700">{totals.deposits}</div>
                            <div className="mt-1 text-xs text-gray-500">Deposits taken</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="text-2xl font-bold text-red-600">{totals.lost}</div>
                            <div className="mt-1 text-xs text-gray-500">Lost</div>
                        </div>
                    </div>
                )}

                {/* ── Pie + breakdown table ───────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Status distribution pie */}
                    <CardWrap>
                        <CardTitle
                            title="Status distribution"
                            sub={`Where enquiries sit in the pipeline · ${scopeLabel}`}
                        />
                        {filteredTotal === 0 ? (
                            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No enquiries in this period</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={statusData.filter((row) => row.count > 0).map((row) => ({ ...row, fill: STATUS_CHART_COLORS[row.status] ?? '#9ca3af' }))}
                                        dataKey="count"
                                        nameKey="status"
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
                                        formatter={(value) => <span style={{ fontSize: 11, color: '#374151' }}>{value}</span>}
                                    />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardWrap>

                    {/* Status breakdown table */}
                    <CardWrap>
                        <CardTitle
                            title="Status breakdown"
                            sub={`Count and percentage per status · ${scopeLabel}`}
                        />
                        <div className="overflow-hidden rounded-lg border border-gray-100">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-4 py-2.5 text-left">Status</th>
                                        <th className="px-4 py-2.5 text-right">Count</th>
                                        <th className="px-4 py-2.5 text-right">%</th>
                                        <th className="px-4 py-2.5">Distribution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusData.map((row) => (
                                        <tr key={row.status} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-2.5">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{row.count}</td>
                                            <td className="px-4 py-2.5 text-right text-gray-500">{row.pct}%</td>
                                            <td className="px-4 py-2.5">
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${row.pct}%`,
                                                            background: STATUS_CHART_COLORS[row.status] ?? '#9ca3af',
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td className="px-4 py-2.5 font-semibold text-gray-900">Total</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{filteredTotal}</td>
                                        <td className="px-4 py-2.5 text-right text-gray-500">100%</td>
                                        <td className="px-4 py-2.5" />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardWrap>
                </div>

                {/* ── Monthly status flow (full width stacked bar) ────────── */}
                <CardWrap>
                    <CardTitle
                        title="Monthly status flow"
                        sub="How enquiries move through statuses month by month (all time)"
                    />
                    {monthlyFlow.length === 0 ? (
                        <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyFlow} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="label"
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    angle={monthlyFlow.length > 8 ? -35 : 0}
                                    textAnchor={monthlyFlow.length > 8 ? 'end' : 'middle'}
                                    height={monthlyFlow.length > 8 ? 55 : 30}
                                />
                                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<SimpleTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => <span style={{ fontSize: 11, color: '#374151' }}>{value}</span>}
                                />
                                {STATUSES.map((status) => (
                                    <Bar
                                        key={status}
                                        dataKey={status}
                                        stackId="a"
                                        fill={STATUS_CHART_COLORS[status]}
                                        maxBarSize={48}
                                        radius={status === 'Lost' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardWrap>
            </div>
        </>
    );
}

StatusReportPage.layout = {
    breadcrumbs: [{ title: 'Status Report', href: '/status-report' }],
};
