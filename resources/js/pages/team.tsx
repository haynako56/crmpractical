import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    UserPlus,
    Pencil,
    Trash2,
    Mail,
    Phone,
    Users,
    Activity,
    DollarSign,
    LayoutList,
    X,
    Check,
    MapPin,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { getUserColor, USER_COLORS } from '@/lib/user-colors';
import type { Auth } from '@/types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamUser {
    id: number;
    name: string;
    email: string;
    title: string | null;
    phone: string | null;
    status: string;
    color: number;
    total_count: number;
    active_count: number;
    deposit_count: number;
}

interface UnassignedEnquiry {
    id: number;
    name: string;
    type: string;
    loc: string;
    status: string;
    date: string | null;
    phone: string;
}

type ModalState = { mode: 'add' } | { mode: 'edit'; user: TeamUser } | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const TITLE_OPTIONS = ['Sales Consultant', 'Senior Sales Consultant', 'Super Admin'];

const STATUS_COLORS: Record<string, string> = {
    New:           'bg-blue-50 text-blue-800',
    Contacted:     'bg-amber-50 text-amber-800',
    Meeting:       'bg-purple-50 text-purple-800',
    '1st Deposit': 'bg-green-50 text-green-800',
    '2nd Deposit': 'bg-teal-50 text-teal-800',
    Closed:        'bg-gray-100 text-gray-600',
    Lost:          'bg-red-50 text-red-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((word) => word[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({ user, size = 'md' }: { user: TeamUser; size?: 'sm' | 'md' | 'lg' }) {
    const colors = getUserColor(user.color);
    const sizeClass = size === 'lg' ? 'h-13 w-13 text-base' : size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
    return (
        <div
            className={`relative flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass}`}
            style={{ background: colors.bg, color: colors.text }}
        >
            {getInitials(user.name)}
            <span
                className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'} ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}
            />
        </div>
    );
}

function StatCard({
    label, value, accent, onClick,
}: {
    label: string;
    value: number | string;
    accent: string;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
            style={{ '--tw-before-bg': accent } as React.CSSProperties}
        >
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

function ColorPicker({ value, onChange }: { value: number; onChange: (idx: number) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {USER_COLORS.map((color, idx) => (
                <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(idx)}
                    className={`h-6 w-6 rounded-full transition hover:scale-110 ${value === idx ? 'ring-2 ring-gray-800 ring-offset-2' : ''}`}
                    style={{ background: color.accent }}
                    title={`Colour ${idx + 1}`}
                />
            ))}
        </div>
    );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function RepModal({
    modal,
    onClose,
}: {
    modal: ModalState;
    onClose: () => void;
}) {
    if (!modal) return null;

    const isEdit = modal.mode === 'edit';
    const existing = isEdit ? modal.user : null;

    const [name, setName]         = useState(existing?.name ?? '');
    const [email, setEmail]       = useState(existing?.email ?? '');
    const [password, setPassword] = useState('');
    const [title, setTitle]       = useState(existing?.title ?? TITLE_OPTIONS[0]);
    const [phone, setPhone]       = useState(existing?.phone ?? '');
    const [status, setStatus]     = useState(existing?.status ?? 'active');
    const [color, setColor]       = useState(existing?.color ?? 0);
    const [errors, setErrors]     = useState<Record<string, string>>({});
    const [busy, setBusy]         = useState(false);

    function handleSubmit() {
        setBusy(true);
        const payload = { name, email, password: password || undefined, title, phone, status, color };

        const options = {
            onSuccess: () => { setBusy(false); onClose(); },
            onError:   (errs: Record<string, string>) => { setBusy(false); setErrors(errs); },
            preserveScroll: true,
        };

        if (isEdit && existing) {
            router.patch(`/team/${existing.id}`, payload, options);
        } else {
            router.post('/team', payload, options);
        }
    }

    function handleDelete() {
        if (!isEdit || !existing) return;
        if (!confirm(`Remove ${existing.name} from the team? Their enquiries will become unassigned.`)) return;
        router.delete(`/team/${existing.id}`, { onSuccess: onClose });
    }

    const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';
    const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';

    const colors = getUserColor(color);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-8"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg animate-[slideUp_.2s_ease] rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        {isEdit && existing ? (
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                                style={{ background: colors.bg, color: colors.text }}
                            >
                                {getInitials(existing.name)}
                            </div>
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                <UserPlus size={16} />
                            </div>
                        )}
                        <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit rep' : 'Add sales rep'}</h2>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className={labelClass}>Full name *</label>
                            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Jones" />
                            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className={labelClass}>Role / title</label>
                            <select className={fieldClass} value={title ?? ''} onChange={(e) => setTitle(e.target.value)}>
                                {TITLE_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Email *</label>
                            <input className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@practicalhomes.com.au" />
                            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className={labelClass}>Phone</label>
                            <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className={labelClass}>Status</label>
                            <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>{isEdit ? 'New password (leave blank to keep)' : 'Password *'}</label>
                            <input className={fieldClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'} />
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Colour</label>
                            <ColorPicker value={color} onChange={setColor} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-3">
                    <div>
                        {isEdit && (
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                                <Trash2 size={13} /> Remove
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                        >
                            <Check size={14} /> {busy ? 'Saving…' : isEdit ? 'Save' : 'Add rep'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Rep Card ─────────────────────────────────────────────────────────────────

function RepCard({
    user,
    isSuperAdmin,
    onEdit,
}: {
    user: TeamUser;
    isSuperAdmin: boolean;
    onEdit: (user: TeamUser) => void;
}) {
    const colors = getUserColor(user.color);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            {/* Top row: avatar + name + actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold"
                        style={{ background: colors.bg, color: colors.text }}
                    >
                        {getInitials(user.name)}
                        <span
                            className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-gray-900">{user.name}</span>
                            {user.status !== 'active' && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Inactive</span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{user.title ?? 'Sales Consultant'}</p>
                    </div>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        onClick={() => router.visit(`/enquiries?rep=${user.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 hover:cursor-pointer"
                    >
                        <LayoutList size={13} /> <span className="hidden sm:inline">View leads</span>
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={() => onEdit(user)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 hover:cursor-pointer"
                        >
                            <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Contact info */}
            <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-gray-500">
                {user.email && (
                    <span className="flex items-center gap-1 truncate"><Mail size={11} /> {user.email}</span>
                )}
                {user.phone && (
                    <span className="flex items-center gap-1"><Phone size={11} /> {user.phone}</span>
                )}
            </div>

            {/* Stat badges */}
            <div className="mt-3 flex flex-wrap gap-2">
                <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: colors.bg, color: colors.text }}
                >
                    <Users size={10} /> {user.total_count} total
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Activity size={10} /> {user.active_count} active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <DollarSign size={10} /> {user.deposit_count} deposits
                </span>
            </div>
        </div>
    );
}

// ─── Unassigned Enquiries ─────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function UnassignedSection({
    enquiries,
    users,
    isSuperAdmin,
}: {
    enquiries: UnassignedEnquiry[];
    users: TeamUser[];
    isSuperAdmin: boolean;
}) {
    const [search, setSearch] = useState('');
    const [page, setPage]     = useState(1);

    function handleAssign(enquiryId: number, userId: string) {
        if (!userId) return;
        router.patch(`/enquiries/${enquiryId}`, { user_id: parseInt(userId, 10) }, { preserveScroll: true });
    }

    const query = search.toLowerCase().trim();

    const filtered = useMemo(() => {
        if (!query) return enquiries;
        return enquiries.filter((enquiry) =>
            [enquiry.name, enquiry.phone, enquiry.type, enquiry.loc, enquiry.status]
                .some((field) => field?.toLowerCase().includes(query))
        );
    }, [enquiries, query]);

    const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    function handleSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    if (!enquiries.length) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 text-sm text-gray-500 shadow-sm">
                <Check size={14} className="mr-1.5 inline text-green-600" />
                All enquiries are assigned to a rep.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Search bar */}
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
                    <button
                        onClick={() => handleSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {pageItems.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-500">
                        No unassigned enquiries match your search.
                    </div>
                ) : (
                    <table className="w-full table-fixed border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="w-10 px-4 py-3" />
                                <th className="px-4 py-3">Client</th>
                                <th className="hidden w-45 px-4 py-3 sm:table-cell">Type</th>
                                <th className="hidden px-4 py-3 md:table-cell">Location</th>
                                <th className="w-28 px-4 py-3">Status</th>
                                <th className="hidden w-24 px-4 py-3 sm:table-cell">Date</th>
                                {isSuperAdmin && <th className="w-36 px-4 py-3">Assign to</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map((enquiry) => (
                                <tr key={enquiry.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                                            {getInitials(enquiry.name)}
                                        </div>
                                    </td>
                                    <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                        {enquiry.name}
                                    </td>
                                    <td className="hidden px-4 py-3 sm:table-cell">
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                            {enquiry.type}
                                        </span>
                                    </td>
                                    <td className="hidden overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-gray-500 md:table-cell">
                                        {enquiry.loc}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[enquiry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {enquiry.status}
                                        </span>
                                    </td>
                                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            {formatDate(enquiry.date)}
                                        </span>
                                    </td>
                                    {isSuperAdmin && (
                                        <td className="px-4 py-3">
                                            <select
                                                defaultValue=""
                                                onChange={(event) => handleAssign(enquiry.id, event.target.value)}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-blue-600 focus:outline-none"
                                            >
                                                <option value="" disabled>— Assign —</option>
                                                {users.filter((user) => user.status === 'active').map((user) => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                        {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeamPage() {
    const { users, unassigned, flash } = usePage<{
        users: TeamUser[];
        unassigned: UnassignedEnquiry[];
        flash?: string;
    }>().props;

    const { auth } = usePage<{ auth: Auth }>().props;
    const isSuperAdmin = auth.isSuperAdmin ?? false;

    const [modal, setModal] = useState<ModalState>(null);

    const totalEnquiries = users.reduce((sum, user) => sum + user.total_count, 0);

    return (
        <>
            <Head title="Team" />

            <div className="space-y-6 p-6">

                {/* Flash message */}
                {flash && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {flash}
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Manage sales reps and assign leads</p>
                    </div>
                    {isSuperAdmin && (
                        <button
                            onClick={() => setModal({ mode: 'add' })}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800"
                        >
                            <UserPlus size={15} /> Add rep
                        </button>
                    )}
                </div>

                {/* Stats per rep */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {users.map((user) => {
                        const colors = getUserColor(user.color);
                        return (
                            <div
                                key={user.id}
                                className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                            >
                                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: colors.accent }} />
                                <div className="mb-2.5 flex items-center gap-2">
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                        style={{ background: colors.bg, color: colors.text }}
                                    >
                                        {getInitials(user.name)}
                                    </div>
                                    <span className="truncate text-sm font-semibold text-gray-900">{user.name}</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{user.total_count}</div>
                                <div className="mt-0.5 text-xs text-gray-500">
                                    {user.title ?? 'Sales rep'} · {totalEnquiries > 0 ? Math.round((user.total_count / totalEnquiries) * 100) : 0}% of leads
                                </div>
                            </div>
                        );
                    })}

                    {/* Unassigned card */}
                    {unassigned.length > 0 && (
                        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="absolute inset-x-0 top-0 h-[3px] bg-gray-400" />
                            <div className="mb-2.5 flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                                    ?
                                </div>
                                <span className="truncate text-sm font-semibold text-gray-900">Unassigned</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{unassigned.length}</div>
                            <div className="mt-0.5 text-xs text-gray-500">Need assignment</div>
                        </div>
                    )}
                </div>

                {/* Divider: Sales reps */}
                <div className="flex items-center gap-3">
                    <h2 className="shrink-0 font-serif text-xl font-normal text-gray-900">Sales reps</h2>
                    <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Rep cards */}
                <div className="space-y-3">
                    {users.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                            No team members yet.
                            {isSuperAdmin && (
                                <button
                                    onClick={() => setModal({ mode: 'add' })}
                                    className="ml-2 font-medium text-blue-700 hover:underline"
                                >
                                    Add the first rep
                                </button>
                            )}
                        </div>
                    ) : (
                        users.map((user) => (
                            <RepCard
                                key={user.id}
                                user={user}
                                isSuperAdmin={isSuperAdmin}
                                onEdit={(selectedUser) => setModal({ mode: 'edit', user: selectedUser })}
                            />
                        ))
                    )}
                </div>

                {/* Divider: Unassigned enquiries */}
                <div className="flex items-center gap-3">
                    <h2 className="shrink-0 font-serif text-xl font-normal text-gray-900">Unassigned enquiries</h2>
                    <div className="flex-1 border-t border-gray-200" />
                </div>

                <UnassignedSection enquiries={unassigned} users={users} isSuperAdmin={isSuperAdmin} />
            </div>

            {/* Modal */}
            {modal && <RepModal modal={modal} onClose={() => setModal(null)} />}
        </>
    );
}

TeamPage.layout = {
    breadcrumbs: [
        { title: 'Team', href: '/team' },
    ],
};
