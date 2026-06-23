import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { BellRing, Clock, Check, RefreshCw, Mail, Phone, MapPin, Search, X } from 'lucide-react';
import { getUserColor } from '@/lib/user-colors';
import EnquiryModal, { type FullEnquiry, type CrmUser } from '@/components/EnquiryModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
    urgent: number;
    warning: number;
    ok: number;
    total: number;
}

interface PageProps extends Record<string, unknown> {
    urgent: FullEnquiry[];
    warning: FullEnquiry[];
    ok: FullEnquiry[];
    stats: Stats;
    users: CrmUser[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
    New:           'bg-blue-50 text-blue-800',
    Contacted:     'bg-amber-50 text-amber-800',
    Meeting:       'bg-purple-50 text-purple-800',
    '1st Deposit': 'bg-green-50 text-green-800',
    '2nd Deposit': 'bg-teal-50 text-teal-800',
    Cold:        'bg-gray-100 text-gray-600',
    Lost:          'bg-red-50 text-red-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((word) => word[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function repName(enquiry: FullEnquiry) {
    return enquiry.assignedUser?.name ?? enquiry.rep ?? '—';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
    label, value, accent, sub,
}: {
    label: string; value: number; accent: string; sub?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
            <div className="mt-1 text-xs font-medium text-gray-700">{label}</div>
            {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
        </div>
    );
}

function SectionDivider({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
    return (
        <div className="flex items-center gap-3">
            <span style={{ color }}>{icon}</span>
            <h2 className="shrink-0 font-serif text-xl font-normal text-gray-900">{label}</h2>
            <div className="flex-1 border-t border-gray-200" />
        </div>
    );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
            <span className="text-green-600">{icon}</span>
            {message}
        </div>
    );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({
    enquiry,
    level,
    onSelect,
}: {
    enquiry: FullEnquiry;
    level: 'urgent' | 'warning';
    onSelect: () => void;
}) {
    const isUrgent   = level === 'urgent';
    const bgClass    = isUrgent ? 'bg-red-50 border-red-200'     : 'bg-orange-50 border-orange-200';
    const iconBg     = isUrgent ? 'bg-red-100 text-red-600'      : 'bg-orange-100 text-orange-600';
    const titleColor = isUrgent ? 'text-red-700'                 : 'text-orange-700';
    const timeColor  = isUrgent ? 'text-red-600'                 : 'text-orange-600';

    const userColors = enquiry.assignedUser
        ? getUserColor(enquiry.assignedUser.color)
        : getUserColor(undefined);

    return (
        <div
            className={`flex cursor-pointer items-start gap-4 rounded-xl border px-5 py-4 shadow-sm transition hover:translate-x-1 ${bgClass}`}
            onClick={onSelect}
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                {isUrgent ? <BellRing size={18} /> : <Clock size={18} />}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${titleColor}`}>{enquiry.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[enquiry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {enquiry.status}
                    </span>
                    {enquiry.type && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{enquiry.type}</span>
                    )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {enquiry.loc && (
                        <span className="flex items-center gap-1"><MapPin size={10} /> {enquiry.loc}</span>
                    )}
                    {enquiry.phone && (
                        <span className="flex items-center gap-1"><Phone size={10} /> {enquiry.phone}</span>
                    )}
                    {enquiry.email && (
                        <span className="flex items-center gap-1"><Mail size={10} /> {enquiry.email}</span>
                    )}
                    <span className="flex items-center gap-1">
                        <div
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                            style={{ background: userColors.bg, color: userColors.text }}
                        >
                            {getInitials(repName(enquiry))}
                        </div>
                        {repName(enquiry)}
                    </span>
                </div>

                {enquiry.notes && (
                    <p className="mt-1.5 line-clamp-1 text-xs italic text-gray-400">{enquiry.notes}</p>
                )}
            </div>

            <div className={`shrink-0 text-xs font-bold ${timeColor}`}>{enquiry.elapsed}</div>
        </div>
    );
}

// ─── OK table ─────────────────────────────────────────────────────────────────

function OkTable({ enquiries, onSelect }: { enquiries: FullEnquiry[]; onSelect: (id: number) => void }) {
    if (!enquiries.length) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="w-9 px-4 py-3" />
                        <th className="px-4 py-3">Client</th>
                        <th className="hidden w-28 px-4 py-3 sm:table-cell">Rep</th>
                        <th className="w-28 px-4 py-3">Status</th>
                        <th className="hidden w-32 px-4 py-3 md:table-cell">Last activity</th>
                    </tr>
                </thead>
                <tbody>
                    {enquiries.map((enquiry) => {
                        const userColors = enquiry.assignedUser
                            ? getUserColor(enquiry.assignedUser.color)
                            : getUserColor(undefined);
                        return (
                            <tr
                                key={enquiry.id}
                                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                                onClick={() => onSelect(enquiry.id)}
                            >
                                <td className="px-4 py-3">
                                    <div
                                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                                        style={{ background: userColors.bg, color: userColors.text }}
                                    >
                                        {getInitials(enquiry.name)}
                                    </div>
                                </td>
                                <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                    {enquiry.name}
                                </td>
                                <td className="hidden px-4 py-3 sm:table-cell">
                                    <span
                                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                                        style={{ background: userColors.bg, color: userColors.text }}
                                    >
                                        {repName(enquiry)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[enquiry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {enquiry.status}
                                    </span>
                                </td>
                                <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                                    {enquiry.hasNotes ? 'Note recorded' : 'Within 4h'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
    const { urgent, warning, ok, stats, users } = usePage<PageProps>().props;

    const allEnquiries = [...urgent, ...warning, ...ok];

    const [selectedId, setSelectedId]     = useState<number | null>(null);
    const [overrides, setOverrides]       = useState<Map<number, Partial<FullEnquiry>>>(new Map());
    const [search, setSearch]             = useState('');

    const query = search.toLowerCase().trim();

    const filterList = useMemo(() => (list: FullEnquiry[]) => {
        if (!query) return list;
        return list.filter((enquiry) =>
            [enquiry.name, enquiry.phone, enquiry.email, enquiry.type, enquiry.loc, enquiry.status,
             enquiry.assignedUser?.name ?? enquiry.rep]
                .some((field) => field?.toLowerCase().includes(query))
        );
    }, [query]);

    const filteredUrgent  = filterList(urgent);
    const filteredWarning = filterList(warning);
    const filteredOk      = filterList(ok);

    const selectedEnquiry = (() => {
        if (selectedId === null) return null;
        const base = allEnquiries.find((enquiry) => enquiry.id === selectedId);
        if (!base) return null;
        return { ...base, ...(overrides.get(selectedId) ?? {}) } as FullEnquiry;
    })();

    function updateEnquiry(updated: FullEnquiry) {
        setOverrides((prev) => new Map(prev).set(updated.id, updated));
    }

    function refresh() {
        router.reload({ only: ['urgent', 'warning', 'ok', 'stats'] });
    }

    return (
        <>
            <Head title="Alerts" />

            <div className="space-y-6 p-6">

                {/* ── Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Alerts</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Leads that need your attention</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name, phone, email…"
                                className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-8 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={refresh}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-1"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    <StatCard label="Overdue"         value={stats.urgent}                  accent="#dc2626" sub="24h+ no response" />
                    <StatCard label="Warning"          value={stats.warning}                 accent="#ea580c" sub="4–24h no response" />
                    <StatCard label="Up to date"       value={stats.ok}                      accent="#16a34a" sub="Responded or fresh" />
                    <StatCard label="Need attention"   value={stats.urgent + stats.warning}  accent="#7c3aed" sub="Total requiring action" />
                    <StatCard label="Total active"     value={stats.urgent + stats.warning + stats.ok} accent="#1a3a5c" sub="Non-terminal enquiries" />
                </div>

                {/* ── Urgent ── */}
                <SectionDivider
                    icon={<BellRing size={18} />}
                    label="Overdue — No response in 24+ hours"
                    color="#dc2626"
                />
                {filteredUrgent.length === 0 ? (
                    <EmptyState icon={<Check size={15} />} message={query ? 'No overdue leads match your search.' : 'No overdue leads — great work!'} />
                ) : (
                    <div className="space-y-2">
                        {filteredUrgent.map((enquiry) => (
                            <AlertBanner key={enquiry.id} enquiry={enquiry} level="urgent" onSelect={() => setSelectedId(enquiry.id)} />
                        ))}
                    </div>
                )}

                {/* ── Warning ── */}
                <SectionDivider
                    icon={<Clock size={18} />}
                    label="Warning — No response in 4+ hours"
                    color="#ea580c"
                />
                {filteredWarning.length === 0 ? (
                    <EmptyState icon={<Check size={15} />} message={query ? 'No warning leads match your search.' : 'No leads in the warning window.'} />
                ) : (
                    <div className="space-y-2">
                        {filteredWarning.map((enquiry) => (
                            <AlertBanner key={enquiry.id} enquiry={enquiry} level="warning" onSelect={() => setSelectedId(enquiry.id)} />
                        ))}
                    </div>
                )}

                {/* ── Up to date ── */}
                <SectionDivider
                    icon={<Check size={18} />}
                    label="Up to date"
                    color="#16a34a"
                />
                {filteredOk.length === 0 ? (
                    <EmptyState icon={<Check size={15} />} message={query ? 'No up-to-date leads match your search.' : 'No enquiries in this category.'} />
                ) : (
                    <OkTable enquiries={filteredOk} onSelect={setSelectedId} />
                )}
            </div>

            {/* ── Detail modal ── */}
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

AlertsPage.layout = {
    breadcrumbs: [{ title: 'Alerts', href: '/alerts' }],
};
