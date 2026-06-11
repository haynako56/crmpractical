import { Head, router, usePage } from '@inertiajs/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Legend,
} from 'recharts';
import { getUserColor } from '@/lib/user-colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyRow   { month: string; count: number }
interface TypeRow      { type: string;  count: number }
interface SourceRow    { source: string; count: number }
interface RepRow       { name: string;  count: number; color: number }
interface Totals       { total: number; meetings: number; deposits: number; lost: number }

interface PageProps extends Record<string, unknown> {
    year: number;
    availableYears: number[];
    monthlyData: MonthlyRow[];
    typeData: TypeRow[];
    sourceData: SourceRow[];
    repData: RepRow[];
    totals: Totals;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
    '#1a3a5c', '#0e7490', '#6d28d9', '#b45309',
    '#15803d', '#b91c1c', '#6b7280', '#c2410c', '#0f766e',
];

const TOOLTIP_STYLE = {
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,.08)',
};

const AXIS_TICK = { fontSize: 11, fill: '#6b7280' };

// ─── Small shared components ──────────────────────────────────────────────────

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
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────

function SimpleTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
            {label && <p className="mb-1 font-semibold text-gray-700">{label}</p>}
            {payload.map((entry, idx) => (
                <p key={idx} className="text-gray-600">{entry.name}: <span className="font-semibold text-gray-900">{entry.value}</span></p>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const { year, availableYears, monthlyData, typeData, sourceData, repData, totals } =
        usePage<PageProps>().props;

    function changeYear(newYear: string) {
        router.get('/reports', { year: newYear }, { preserveState: false });
    }

    // Rep bar colors — use stored color for known reps, gray for unassigned
    function repBarColor(rep: RepRow) {
        if (rep.color < 0) return '#9ca3af';
        return getUserColor(rep.color).accent;
    }

    const maxMonthly = Math.max(...monthlyData.map((d) => d.count), 1);

    return (
        <>
            <Head title="Reports" />

            <div className="space-y-6 p-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Enquiry analytics · {year}</p>
                    </div>
                    <select
                        value={year}
                        onChange={(e) => changeYear(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-600 focus:outline-none"
                    >
                        {availableYears.map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                        ))}
                    </select>
                </div>

                {/* ── Summary stats ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label={`Total enquiries (${year})`} value={totals.total}    accent="#1a3a5c" />
                    <StatCard label="Meetings"                     value={totals.meetings} accent="#6d28d9" />
                    <StatCard label="Deposits taken"               value={totals.deposits} accent="#15803d" />
                    <StatCard label="Lost"                         value={totals.lost}     accent="#b91c1c" />
                </div>

                {/* ── Monthly enquiries (full width) ─────────────────────── */}
                <CardWrap>
                    <CardTitle title="Monthly enquiries" sub={`New enquiries each month in ${year}`} />
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<SimpleTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="count" name="Enquiries" fill="#1a3a5c" radius={[4, 4, 0, 0]} maxBarSize={56} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardWrap>

                {/* ── Type + monthly table ────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Enquiries by type */}
                    <CardWrap>
                        <CardTitle title="Enquiries by type" sub="Breakdown by product interest" />
                        {typeData.length === 0 ? (
                            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data for {year}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={typeData.map((item, idx) => ({ ...item, fill: CHART_COLORS[idx % CHART_COLORS.length] }))}
                                        dataKey="count"
                                        nameKey="type"
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

                    {/* Monthly breakdown table */}
                    <CardWrap>
                        <CardTitle title="Monthly breakdown" sub={`Enquiry count per month in ${year}`} />
                        <div className="overflow-hidden rounded-lg border border-gray-100">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-4 py-2.5 text-left">Month</th>
                                        <th className="px-4 py-2.5 text-right">Count</th>
                                        <th className="px-4 py-2.5">Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.map((row) => (
                                        <tr key={row.month} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-2 text-gray-700">{row.month} {year}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-gray-900">{row.count}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                                        <div
                                                            className="h-full rounded-full bg-blue-800"
                                                            style={{ width: `${Math.round((row.count / maxMonthly) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right text-xs text-gray-500">{row.count}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td className="px-4 py-2.5 font-semibold text-gray-900">Total</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{totals.total}</td>
                                        <td className="px-4 py-2.5" />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardWrap>
                </div>

                {/* ── Rep performance + Lead source ──────────────────────── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Rep performance */}
                    <CardWrap>
                        <CardTitle title="Rep performance" sub={`Enquiries assigned per rep in ${year}`} />
                        {repData.length === 0 ? (
                            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(180, repData.length * 44)}>
                                <BarChart data={repData.map((rep) => ({ ...rep, fill: repBarColor(rep) }))} layout="vertical" barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={AXIS_TICK}
                                        axisLine={false}
                                        tickLine={false}
                                        width={90}
                                    />
                                    <Tooltip content={<SimpleTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="count" name="Enquiries" radius={[0, 4, 4, 0]} maxBarSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardWrap>

                    {/* Lead source */}
                    <CardWrap>
                        <CardTitle title="Lead source analysis" sub={`Which channels drive the most leads in ${year}`} />
                        {sourceData.length === 0 ? (
                            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data for {year}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(180, sourceData.length * 36)}>
                                <BarChart data={sourceData.map((item, idx) => ({ ...item, fill: CHART_COLORS[idx % CHART_COLORS.length] }))} layout="vertical" barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis
                                        dataKey="source"
                                        type="category"
                                        tick={AXIS_TICK}
                                        axisLine={false}
                                        tickLine={false}
                                        width={100}
                                    />
                                    <Tooltip content={<SimpleTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardWrap>
                </div>
            </div>
        </>
    );
}

ReportsPage.layout = {
    breadcrumbs: [{ title: 'Reports', href: '/reports' }],
};
