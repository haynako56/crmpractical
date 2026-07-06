import { Head, usePage, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Plus, Download, Users, CalendarRange, CalendarDays, Footprints, UserCheck,
    House, MapPin, Search, Pencil, Trash2, X, Check,
} from 'lucide-react';
import { type CrmUser } from '@/components/EnquiryModal';

// ─── Types ────────────────────────────────────────────────────────────────────

const VISITOR_TYPE_CLASSES: Record<string, string> = {
    Couple:   'bg-blue-50 text-blue-800',
    Family:   'bg-green-50 text-green-800',
    Single:   'bg-gray-100 text-gray-700',
    Investor: 'bg-amber-50 text-amber-800',
    Other:    'bg-gray-100 text-gray-700',
};

const VILLAGE_HEX: Record<string, string> = {
    'Box Hill':      '#1a3a5c',
    'Menangle Park': '#15803d',
    'Leppington':    '#6d28d9',
};

interface VillageStats {
    total: number;
    thisWeek: number;
    thisMonth: number;
    visitors: number;
    converted: number;
}

interface Village {
    name: string;
    address: string;
    stats: VillageStats;
}

interface WalkInRow {
    id: number;
    date: string;
    village: string;
    visitors: number;
    type: string | null;
    notes: string;
    user_id: number | null;
    repOnDuty: { id: number; name: string; color: number } | null;
    enquiry: { id: number; name: string } | null;
}

interface OverallStats {
    total: number;
    thisWeek: number;
    thisMonth: number;
    visitorsThisMonth: number;
    converted: number;
}

interface PageProps extends Record<string, unknown> {
    walkIns: WalkInRow[];
    villages: Village[];
    users: CrmUser[];
    visitorTypes: string[];
    stats: OverallStats;
}

interface WalkInForm {
    village: string;
    date: string;
    visitors: string;
    type: string;
    user_id: string;
    notes: string;
    create_enquiry: boolean;
    enquiry_name: string;
    enquiry_phone: string;
    enquiry_email: string;
    enquiry_type: string;
    enquiry_user_id: string;
}

const ENQUIRY_TYPE_OPTIONS = ['H&L', 'KDRB', 'Contract', 'Duplex', 'Custom Duplex', 'Dual Living'];

function emptyForm(defaultVillage: string): WalkInForm {
    return {
        village: defaultVillage,
        date: new Date().toISOString().slice(0, 10),
        visitors: '1',
        type: 'Couple',
        user_id: '',
        notes: '',
        create_enquiry: false,
        enquiry_name: '',
        enquiry_phone: '',
        enquiry_email: '',
        enquiry_type: '',
        enquiry_user_id: '',
    };
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Small building blocks ──────────────────────────────────────────────────

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

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <h2 className="shrink-0 font-serif text-xl font-normal text-gray-900">{label}</h2>
            <div className="flex-1 border-t border-gray-200" />
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
            {message}
        </div>
    );
}

function VillageCard({ village, active, onClick }: { village: Village; active: string; onClick: () => void }) {
    const hex = VILLAGE_HEX[village.name] ?? '#1a3a5c';
    return (
        <div
            onClick={onClick}
            className={`relative cursor-pointer overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${active === village.name ? 'border-blue-300' : 'border-gray-200'}`}
        >
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: hex }} />
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-900">{village.name} Display Village</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} /> {village.address}
                    </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${hex}18` }}>
                    <House size={18} style={{ color: hex }} />
                </div>
            </div>
            <div className="flex flex-wrap gap-4">
                <div className="text-center">
                    <div className="text-lg font-semibold" style={{ color: hex }}>{village.stats.total}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">Total</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{village.stats.thisMonth}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">This month</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{village.stats.thisWeek}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">This week</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{village.stats.visitors}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">Visitors</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-semibold text-green-700">{village.stats.converted}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">Converted</div>
                </div>
            </div>
        </div>
    );
}

// ─── Add / edit walk-in form fields ─────────────────────────────────────────

function WalkInFormFields({ form, setForm, users, villages, visitorTypes, showConvert, errors }: {
    form: WalkInForm;
    setForm: (updater: (prev: WalkInForm) => WalkInForm) => void;
    users: CrmUser[];
    villages: Village[];
    visitorTypes: string[];
    showConvert: boolean;
    errors: Record<string, string>;
}) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Village *</label>
                    <select
                        value={form.village}
                        onChange={(e) => setForm((prev) => ({ ...prev, village: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                    >
                        {villages.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Date *</label>
                    <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Number of walk-ins *</label>
                    <input
                        type="number"
                        min={1}
                        max={99}
                        value={form.visitors}
                        onChange={(e) => setForm((prev) => ({ ...prev, visitors: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold text-blue-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                    />
                    {errors.visitors && <p className="mt-1 text-xs text-red-600">{errors.visitors}</p>}
                </div>
                <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Visitor type</label>
                    <select
                        value={form.type}
                        onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                    >
                        {visitorTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Rep on duty</label>
                    <select
                        value={form.user_id}
                        onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                    >
                        <option value="">— Select —</option>
                        {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Notes</label>
                <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="What were visitors looking for? Home designs they liked? Any follow-up actions?"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
            </div>

            {showConvert && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.create_enquiry}
                            onChange={(e) => setForm((prev) => ({ ...prev, create_enquiry: e.target.checked }))}
                            className="h-4 w-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-900">
                            <Plus size={14} /> Add new enquiry from this walk-in
                        </span>
                    </label>

                    {form.create_enquiry && (
                        <div className="mt-3 space-y-2.5">
                            <p className="text-xs text-gray-500">Fill in the visitor details — this creates a full enquiry linked to this walk-in.</p>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Client name *</label>
                                    <input
                                        type="text"
                                        value={form.enquiry_name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, enquiry_name: e.target.value }))}
                                        placeholder="Full name"
                                        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${errors.enquiry_name ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-700 focus:ring-blue-700'}`}
                                    />
                                    {errors.enquiry_name && <p className="mt-1 text-xs text-red-600">{errors.enquiry_name}</p>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Phone</label>
                                    <input
                                        type="text"
                                        value={form.enquiry_phone}
                                        onChange={(e) => setForm((prev) => ({ ...prev, enquiry_phone: e.target.value }))}
                                        placeholder="04xx xxx xxx"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</label>
                                    <input
                                        type="email"
                                        value={form.enquiry_email}
                                        onChange={(e) => setForm((prev) => ({ ...prev, enquiry_email: e.target.value }))}
                                        placeholder="optional"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Interest in</label>
                                    <select
                                        value={form.enquiry_type}
                                        onChange={(e) => setForm((prev) => ({ ...prev, enquiry_type: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        <option value="">—</option>
                                        {ENQUIRY_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Assign to rep</label>
                                    <select
                                        value={form.enquiry_user_id}
                                        onChange={(e) => setForm((prev) => ({ ...prev, enquiry_user_id: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        <option value="">— Select —</option>
                                        {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DisplayHomesPage() {
    const { walkIns, villages, users, visitorTypes, stats } = usePage<PageProps>().props;

    const [currentVillage, setCurrentVillage] = useState('all');
    const [search, setSearch] = useState('');
    const [monthFilter, setMonthFilter] = useState('');

    const [isAdding, setIsAdding] = useState(false);
    const [addForm, setAddForm] = useState<WalkInForm>(() => emptyForm(villages[0]?.name ?? 'Box Hill'));
    const [addErrors, setAddErrors] = useState<Record<string, string>>({});
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<WalkInForm>(() => emptyForm(villages[0]?.name ?? 'Box Hill'));
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [editHasEnquiry, setEditHasEnquiry] = useState(false);
    const [editEnquiryName, setEditEnquiryName] = useState<string | null>(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    const visibleVillages = currentVillage === 'all' ? villages : villages.filter((v) => v.name === currentVillage);

    const filteredWalkIns = useMemo(() => {
        let list = currentVillage === 'all' ? walkIns : walkIns.filter((w) => w.village === currentVillage);

        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((w) =>
                (w.notes || '').toLowerCase().includes(q) ||
                (w.repOnDuty?.name || '').toLowerCase().includes(q) ||
                w.village.toLowerCase().includes(q)
            );
        }

        if (monthFilter !== '') {
            const m = parseInt(monthFilter, 10);
            list = list.filter((w) => new Date(w.date).getMonth() === m);
        }

        return list;
    }, [walkIns, currentVillage, search, monthFilter]);

    function openAdd() {
        setAddForm(emptyForm(currentVillage !== 'all' ? currentVillage : (villages[0]?.name ?? 'Box Hill')));
        setAddErrors({});
        setIsAdding(true);
    }

    function submitAdd() {
        setIsSubmittingAdd(true);
        router.post('/walk-ins', {
            ...addForm,
            user_id: addForm.user_id || null,
            enquiry_user_id: addForm.enquiry_user_id || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setIsAdding(false); setAddErrors({}); },
            onError: (errors) => setAddErrors(errors as Record<string, string>),
            onFinish: () => setIsSubmittingAdd(false),
        });
    }

    function openEdit(row: WalkInRow) {
        setEditForm({
            village: row.village,
            date: row.date,
            visitors: String(row.visitors),
            type: row.type ?? visitorTypes[0] ?? 'Couple',
            user_id: row.user_id ? String(row.user_id) : '',
            notes: row.notes,
            create_enquiry: false,
            enquiry_name: '', enquiry_phone: '', enquiry_email: '', enquiry_type: '', enquiry_user_id: '',
        });
        setEditHasEnquiry(row.enquiry !== null);
        setEditEnquiryName(row.enquiry?.name ?? null);
        setEditErrors({});
        setEditingId(row.id);
    }

    function submitEdit() {
        if (editingId === null) return;
        setIsSubmittingEdit(true);
        router.patch(`/walk-ins/${editingId}`, {
            ...editForm,
            user_id: editForm.user_id || null,
            enquiry_user_id: editForm.enquiry_user_id || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setEditingId(null); setEditErrors({}); },
            onError: (errors) => setEditErrors(errors as Record<string, string>),
            onFinish: () => setIsSubmittingEdit(false),
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Delete this walk-in record?')) return;
        router.delete(`/walk-ins/${id}`, { preserveScroll: true });
    }

    function exportCSV() {
        const header = ['Date', 'Village', 'Walk-ins', 'Type', 'Rep on duty', 'Notes', 'Has Enquiry', 'Enquiry Name'];
        const rows = filteredWalkIns.map((w) => [
            w.date, w.village, w.visitors, w.type ?? '',
            w.repOnDuty?.name ?? '',
            `"${(w.notes ?? '').replace(/"/g, '""')}"`,
            w.enquiry ? 'Yes' : 'No',
            w.enquiry?.name ?? '',
        ]);
        const csvContent = [header, ...rows].map((row) => row.join(',')).join('\n');
        const anchorElement = document.createElement('a');
        anchorElement.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        anchorElement.download = 'PracticalHomes_WalkIns_' + new Date().toISOString().slice(0, 10) + '.csv';
        anchorElement.click();
    }

    return (
        <>
            <Head title="Display Homes" />

            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Display homes</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Walk-in traffic tracker across all display villages</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportCSV}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            <Download size={15} /> Export CSV
                        </button>
                        <button
                            onClick={openAdd}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800"
                        >
                            <Plus size={15} /> Add walk-in
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Total walk-ins"      value={stats.total}             accent="#1a3a5c" icon={Users} />
                    <StatCard label="This week"           value={stats.thisWeek}          accent="#0e7490" icon={CalendarRange} />
                    <StatCard label="This month"          value={stats.thisMonth}         accent="#15803d" icon={CalendarDays} />
                    <StatCard label="Visitors this month" value={stats.visitorsThisMonth} accent="#6d28d9" icon={Footprints} />
                    <StatCard label="Converted to enquiry" value={stats.converted}        accent="#b45309" icon={UserCheck} />
                </div>

                {/* Village tabs */}
                <div className="flex w-fit overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <button
                        onClick={() => setCurrentVillage('all')}
                        className={`px-3.5 py-2 text-xs font-medium ${currentVillage === 'all' ? 'bg-blue-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        All villages
                    </button>
                    {villages.map((v) => (
                        <button
                            key={v.name}
                            onClick={() => setCurrentVillage(v.name)}
                            className={`border-l border-gray-200 px-3.5 py-2 text-xs font-medium ${currentVillage === v.name ? 'bg-blue-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {v.name}
                        </button>
                    ))}
                </div>

                {/* Village summary cards */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleVillages.map((v) => (
                        <VillageCard key={v.name} village={v} active={currentVillage} onClick={() => setCurrentVillage(v.name)} />
                    ))}
                </div>

                {/* Walk-in log */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Walk-in log ({filteredWalkIns.length})</h3>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative">
                            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, notes, rep…"
                                className="h-9 min-w-[200px] rounded-lg border border-gray-300 pl-8 pr-3 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                            />
                        </div>
                        <select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="h-9 rounded-lg border border-gray-300 px-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                        >
                            <option value="">All time</option>
                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                                <option key={m} value={String(i)}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredWalkIns.length === 0 ? (
                    <EmptyState message="No walk-ins recorded yet for this filter." />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-4 py-2.5">Date</th>
                                    <th className="px-4 py-2.5">Village</th>
                                    <th className="px-4 py-2.5 text-center">Walk-ins</th>
                                    <th className="px-4 py-2.5">Type</th>
                                    <th className="px-4 py-2.5">Rep on duty</th>
                                    <th className="px-4 py-2.5">Notes</th>
                                    <th className="px-4 py-2.5">Enquiry</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWalkIns.map((w) => {
                                    const hex = VILLAGE_HEX[w.village] ?? '#1a3a5c';
                                    const typeClass = VISITOR_TYPE_CLASSES[w.type ?? ''] ?? 'bg-gray-100 text-gray-700';
                                    return (
                                        <tr key={w.id} className="border-b border-gray-100 last:border-none hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{formatDate(w.date)}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hex }} />
                                                    {w.village}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-lg font-bold text-blue-900">{w.visitors}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                {w.type && <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeClass}`}>{w.type}</span>}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{w.repOnDuty?.name ?? '—'}</td>
                                            <td className="max-w-[260px] truncate px-4 py-2.5 text-xs text-gray-500">{w.notes || '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                {w.enquiry ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                                        <UserCheck size={10} /> {w.enquiry.name}
                                                    </span>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEdit(w)} title="Edit" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(w.id)} title="Delete" className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add walk-in modal */}
            {isAdding && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
                    onClick={() => setIsAdding(false)}
                >
                    <div
                        className="w-full max-w-2xl animate-[slideUp_.2s_ease] rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-800">
                                    <Plus size={18} />
                                </div>
                                <h2 className="font-semibold text-gray-900">Record walk-in</h2>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[74vh] overflow-y-auto p-6">
                            <WalkInFormFields
                                form={addForm}
                                setForm={setAddForm}
                                users={users}
                                villages={villages}
                                visitorTypes={visitorTypes}
                                showConvert
                                errors={addErrors}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-3">
                            <button onClick={() => setIsAdding(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                onClick={submitAdd}
                                disabled={isSubmittingAdd}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                            >
                                <Check size={14} /> {isSubmittingAdd ? 'Saving…' : 'Save walk-in'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit walk-in modal */}
            {editingId !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
                    onClick={() => setEditingId(null)}
                >
                    <div
                        className="w-full max-w-2xl animate-[slideUp_.2s_ease] rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="font-semibold text-gray-900">Edit walk-in</h2>
                            <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[74vh] space-y-4 overflow-y-auto p-6">
                            {editHasEnquiry && (
                                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                                    <UserCheck size={13} /> Already linked to enquiry: {editEnquiryName}
                                </div>
                            )}
                            <WalkInFormFields
                                form={editForm}
                                setForm={setEditForm}
                                users={users}
                                villages={villages}
                                visitorTypes={visitorTypes}
                                showConvert={!editHasEnquiry}
                                errors={editErrors}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-3">
                            <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                onClick={submitEdit}
                                disabled={isSubmittingEdit}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                            >
                                <Check size={14} /> {isSubmittingEdit ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

DisplayHomesPage.layout = {
    breadcrumbs: [{ title: 'Display Homes', href: '/display-homes' }],
};
