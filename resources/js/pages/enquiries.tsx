import { Head, usePage, router } from '@inertiajs/react';
import type { Auth } from '@/types/auth';
import { getUserColor } from '@/lib/user-colors';
import { useState, useMemo, useRef } from 'react';
import {
    Search,
    Download,
    Upload,
    Plus,
    Grid3X3,
    List,
    Columns3,
    MapPin,
    Calendar,
    Paperclip,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    Send,
    Phone,
    Mail,
    BellRing,
    Clock,
    X,
    FileText,
    FileImage,
    File,
    Check,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CrmUser {
    id: number;
    name: string;
    email: string;
    title: string | null;
    phone: string | null;
    status: string;          // 'active' | 'inactive'
    color?: number;
}

interface FollowUp {
    id: number;
    date: string;
    message: string;
    file_name: string | null;
    file_size: number | null;
    file_mime: string | null;
}

interface Enquiry {
    id: number;
    contactform7_id: string;
    cf7_status: string;
    date: string;
    name: string;
    phone: string;
    email: string;
    postcode: string;
    source: string;
    where_did_you_hear: string;
    lead: string;
    type: string;
    interested: string;
    loc: string;
    rep: string;
    status: string;
    dep1: string;                 // 'YES' | 'NO'
    dep2: string;                 // 'YES' | 'NO'
    notes: string;
    design_name: string;
    alt_s: string;
    ajxizl7033: string;
    message: string;
    join_email_list: boolean;
    fu: string;                   // legacy imported follow-up text
    firstContactTimestamp: string;
    files: { name: string; size: number; date: string; file_path?: string }[];
    files_count: number;
    user_id: number | null;
    assignedUser: CrmUser | null;
    followUps: FollowUp[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ['New', 'Contacted', 'Meeting', '1st Deposit', '2nd Deposit', 'Closed', 'Lost'];

const TYPE_OPTIONS   = ['H&L', 'KDRB', 'Contract', 'Duplex', 'Custom Duplex', 'Dual Living', 'KDRB/Dual Living'];
const SOURCE_OPTIONS = ['Email', 'Phone', 'Realestate.com', 'Display Home', 'Website', 'Facebook', 'Google', 'Signage', 'Referral', 'Other'];
const LEAD_OPTIONS   = ['Google', 'Facebook', 'Realestate.com', 'Display Home', 'Website', 'Signage', 'Referral', 'Friends', 'Other', 'N/A'];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    New:           { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200' },
    Contacted:     { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
    Meeting:       { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
    '1st Deposit': { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200' },
    '2nd Deposit': { bg: 'bg-teal-50',   text: 'text-teal-800',   border: 'border-teal-200' },
    Closed:        { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200' },
    Lost:          { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-200' },
};

const TYPE_COLORS: Record<string, string> = {
    'H&L':              'bg-teal-50 text-teal-800',
    'KDRB':             'bg-amber-50 text-amber-800',
    'Contract':         'bg-purple-50 text-purple-800',
    'Duplex':           'bg-orange-50 text-orange-800',
    'Custom Duplex':    'bg-orange-50 text-orange-800',
    'Dual Living':      'bg-gray-100 text-gray-700',
    'KDRB/Dual Living': 'bg-amber-50 text-amber-800',
};


const ALERT_4H  = 4  * 3_600_000;
const ALERT_24H = 24 * 3_600_000;
const PAGE_SIZE = 15;

// ─── Fallback data (used only when server props are absent) ───────────────────
const DUMMY_ENQUIRIES: Enquiry[] = [];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name
        .split(' ')
        .map((word) => word[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatDate(dateString: string) {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return dateString;
    return parsedDate.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1_048_576) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1_048_576).toFixed(1) + 'MB';
}

function getFileIconConfig(fileName: string): { bgClass: string; icon: React.ReactNode } {
    const ext = (fileName || '').split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf')
        return { bgClass: 'bg-red-100 text-red-600', icon: <FileText size={15} /> };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext))
        return { bgClass: 'bg-blue-100 text-blue-600', icon: <FileImage size={15} /> };
    if (['doc', 'docx'].includes(ext))
        return { bgClass: 'bg-purple-100 text-purple-600', icon: <FileText size={15} /> };
    if (['xls', 'xlsx', 'csv'].includes(ext))
        return { bgClass: 'bg-green-100 text-green-600', icon: <FileText size={15} /> };
    return { bgClass: 'bg-gray-100 text-gray-500', icon: <File size={15} /> };
}

type AlertLevel = 'urgent' | 'warning' | 'ok';

function getAlertLevel(enquiry: Enquiry): AlertLevel {
    const terminalStatuses = ['1st Deposit', '2nd Deposit', 'Closed', 'Lost'];
    if (terminalStatuses.includes(enquiry.status)) return 'ok';
    if (enquiry.fu) return 'ok';
    const elapsedMs = Date.now() - new Date(enquiry.firstContactTimestamp).getTime();
    if (elapsedMs >= ALERT_24H) return 'urgent';
    if (elapsedMs >= ALERT_4H)  return 'warning';
    return 'ok';
}

function formatElapsed(timestamp: string) {
    const elapsedMs = Date.now() - new Date(timestamp).getTime();
    if (elapsedMs < 3_600_000)  return Math.floor(elapsedMs / 60000) + 'm ago';
    if (elapsedMs < 86_400_000) return Math.floor(elapsedMs / 3_600_000) + 'h ago';
    return Math.floor(elapsedMs / 86_400_000) + 'd ago';
}

function buildAndDownloadCSV(rows: Enquiry[]) {
    const header = [
        'Id', 'Date', 'Status', 'Name', 'Email', 'Phone', 'Postcode',
        'Interested', 'Wheredidyouhear', 'Message', 'JoinEmailList', 'DesignName',
        'Alt S', 'Ajxizl7033',
        // CRM fields
        'Source', 'Lead', 'Type', 'Location', 'Rep', 'CRMStatus',
        '1st Deposit', '2nd Deposit', 'Files', 'Notes', 'Follow-up',
    ];
    const dataRows = rows.map((enquiry) => [
        enquiry.contactform7_id,
        enquiry.date,
        enquiry.cf7_status,
        enquiry.name,
        enquiry.email,
        enquiry.phone,
        enquiry.postcode,
        enquiry.interested,
        enquiry.where_did_you_hear,
        `"${(enquiry.message ?? '').replace(/"/g, '""')}"`,
        enquiry.join_email_list ? 'Join our Mailing list to receive emails about our latest news and updates. View our Privacy Policy.' : '',
        enquiry.design_name,
        enquiry.alt_s,
        enquiry.ajxizl7033,
        // CRM fields
        enquiry.source,
        enquiry.lead,
        enquiry.type,
        enquiry.loc,
        enquiry.rep,
        enquiry.status,
        enquiry.dep1,
        enquiry.dep2,
        enquiry.files_count ?? (enquiry.files ?? []).length,
        `"${(enquiry.notes ?? '').replace(/"/g, '""')}"`,
        `"${(enquiry.fu ?? '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header, ...dataRows].map((row) => row.join(',')).join('\n');
    const anchorElement = document.createElement('a');
    anchorElement.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
    anchorElement.download = 'PracticalHomes_Enquiries.csv';
    anchorElement.click();
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const colorConfig = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
            {status}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const colorClass = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>{type}</span>;
}

function RepBadge({ user, fallback }: { user: CrmUser | null; fallback?: string }) {
    const label  = user?.name ?? fallback ?? '—';
    const colors = getUserColor(user?.color ?? (user?.id ?? undefined));
    return (
        <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: colors.bg, color: colors.text }}
        >
            {label}
        </span>
    );
}

function AlertChip({ enquiry }: { enquiry: Enquiry }) {
    const lvl = getAlertLevel(enquiry);
    if (lvl === 'ok') return null;
    const chipClass = lvl === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';
    const chipIcon  = lvl === 'urgent' ? '🔔' : '⏰';
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${chipClass}`}>
            {chipIcon} {formatElapsed(enquiry.firstContactTimestamp)}
        </span>
    );
}

function Avatar({ name, user }: { name: string; user: CrmUser | null }) {
    const colors = getUserColor(user?.color ?? (user?.id ?? undefined));
    return (
        <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: colors.bg, color: colors.text }}
        >
            {getInitials(name)}
        </div>
    );
}

interface StatCardProps { label: string; value: number; icon: string; accent: string; onClick?: () => void }
function StatCard({ label, value, icon, accent, onClick }: StatCardProps) {
    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
        >
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
            <div className="mb-2 text-xl">{icon}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

function EnquiryCard({ enquiry, onClick }: { enquiry: Enquiry; onClick: () => void }) {
    const lvl = getAlertLevel(enquiry);
    const alertBorderStyle = lvl === 'urgent' ? { borderLeft: '3px solid #b91c1c' } : lvl === 'warning' ? { borderLeft: '3px solid #c2410c' } : {};
    return (
        <div
            onClick={onClick}
            style={alertBorderStyle}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={enquiry.name} user={enquiry.assignedUser} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{enquiry.name}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={10} />
                            {enquiry.loc.split(' - ')[1] ?? enquiry.loc}
                        </p>
                    </div>
                </div>
                <StatusBadge status={enquiry.status} />
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                <TypeBadge type={enquiry.type} />
                <RepBadge user={enquiry.assignedUser} fallback={enquiry.rep} />
                <AlertChip enquiry={enquiry} />
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={11} />
                    {formatDate(enquiry.date)}
                </span>
                <span className="flex items-center gap-2">
                    {(enquiry.files ?? []).length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Paperclip size={11} /> {enquiry.files.length}
                        </span>
                    )}
                    {enquiry.fu && <MessageSquare size={12} className="text-gray-400" />}
                </span>
            </div>
        </div>
    );
}

const KANBAN_COLORS: Record<string, string> = {
    New:           'bg-blue-50 text-blue-700',
    Contacted:     'bg-amber-50 text-amber-700',
    Meeting:       'bg-purple-50 text-purple-700',
    '1st Deposit': 'bg-green-50 text-green-700',
    '2nd Deposit': 'bg-teal-50 text-teal-700',
    Closed:        'bg-gray-100 text-gray-600',
    Lost:          'bg-red-50 text-red-700',
};

function KanbanColumn({ status, enquiries, onSelect }: { status: string; enquiries: Enquiry[]; onSelect: (id: number) => void }) {
    const headerColorClass = KANBAN_COLORS[status] ?? 'bg-gray-100 text-gray-600';
    return (
        <div className="flex min-w-[200px] flex-col rounded-xl bg-gray-50 p-2.5">
            <div className={`mb-2.5 flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${headerColorClass}`}>
                <span>{status}</span>
                <span className="rounded-full bg-white/70 px-2 py-0.5">{enquiries.length}</span>
            </div>
            <div className="space-y-2">
                {enquiries.length > 0 ? (
                    enquiries.map((enquiry) => {
                        const lvl = getAlertLevel(enquiry);
                        const alertBorderStyle = lvl === 'urgent' ? { borderLeft: '3px solid #b91c1c' } : lvl === 'warning' ? { borderLeft: '3px solid #c2410c' } : {};
                        return (
                            <div
                                key={enquiry.id}
                                onClick={() => onSelect(enquiry.id)}
                                style={alertBorderStyle}
                                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-sm transition-all hover:shadow-md"
                            >
                                <p className="truncate font-semibold text-gray-900">{enquiry.name}</p>
                                <p className="mt-0.5 truncate text-gray-500">{enquiry.type} · {enquiry.loc.split(' - ')[1] ?? enquiry.loc}</p>
                                {lvl !== 'ok' && <AlertChip enquiry={enquiry} />}
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 p-3 text-center text-[11px] text-gray-400">
                        None
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function EnquiriesPage() {
    const { enquiries: serverEnquiries, users = [], flash } = usePage<{ enquiries: Enquiry[]; users: CrmUser[]; flash?: string }>().props;
    const { auth } = usePage<{ auth: Auth }>().props;
    const isSuperAdmin = auth.isSuperAdmin ?? false;

    // Optimistic overrides sit on top of server data. Cleared automatically when
    // Inertia refreshes props (the server becomes the source of truth again).
    const [overrides, setOverrides] = useState<Map<number, Partial<Enquiry>>>(new Map());

    const enquiries = (serverEnquiries ?? DUMMY_ENQUIRIES).map(
        (enquiry) => ({ ...enquiry, ...(overrides.get(enquiry.id) ?? {}) })
    );

    const [search, setSearch]               = useState('');
    const [repFilter, setRepFilter]         = useState(() => new URLSearchParams(window.location.search).get('rep') ?? '');
    const [typeFilter, setTypeFilter]       = useState('');
    const [statusFilter, setStatusFilter]   = useState('');
    const [view, setView]                   = useState<'cards' | 'list' | 'kanban'>('cards');
    const [currentPage, setCurrentPage]     = useState(1);
    const [selectedId, setSelectedId]       = useState<number | null>(null);
    const [isImporting, setIsImporting]     = useState(false);
    const [newNoteText, setNewNoteText]         = useState('');
    const [pendingNoteFile, setPendingNoteFile] = useState<File | null>(null);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isDragOver, setIsDragOver]           = useState(false);
    const [isEditing, setIsEditing]             = useState(false);
    const [editDraft, setEditDraft]             = useState<Record<string, string>>({});
    const [editFollowUps, setEditFollowUps]           = useState<Record<number, string>>({});
    const [followUpNewFiles, setFollowUpNewFiles]     = useState<Record<number, File | null>>({});
    const [followUpRemoveFile, setFollowUpRemoveFile] = useState<Record<number, boolean>>({});
    const [isAddingNew, setIsAddingNew]         = useState(false);
    const [newForm, setNewForm]                 = useState<Record<string, string>>({});
    const [newFormErrors, setNewFormErrors]     = useState<Record<string, string>>({});
    const [isSubmittingNew, setIsSubmittingNew] = useState(false);

    const fileInputRef         = useRef<HTMLInputElement>(null);
    const noteFileInputRef     = useRef<HTMLInputElement>(null);
    const enquiryFileInputRef  = useRef<HTMLInputElement>(null);

    function updateEnquiry(updatedEnquiry: Enquiry) {
        setOverrides((prev) => new Map(prev).set(updatedEnquiry.id, updatedEnquiry));
    }

    function handleStatusChange(newStatus: string) {
        if (!selectedEnquiry) return;
        const payload: Record<string, string> = { status: newStatus };
        if (newStatus === '1st Deposit') payload.dep1 = 'YES';
        if (newStatus === '2nd Deposit') { payload.dep1 = 'YES'; payload.dep2 = 'YES'; }
        // Optimistic update so the UI responds instantly
        updateEnquiry({ ...selectedEnquiry, ...payload });
        router.patch(`/enquiries/${selectedEnquiry.id}`, payload, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleUserAssign(userIdStr: string) {
        if (!selectedEnquiry) return;
        const numericId  = userIdStr ? Number(userIdStr) : null;
        const targetUser = users.find((user) => user.id === numericId) ?? null;
        updateEnquiry({ ...selectedEnquiry, user_id: numericId, assignedUser: targetUser });
        router.patch(`/enquiries/${selectedEnquiry.id}`, { user_id: numericId }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleSaveNote() {
        if (!selectedEnquiry || (!newNoteText.trim() && !pendingNoteFile)) return;
        const formData = new FormData();
        formData.append('date', new Date().toISOString().slice(0, 10));
        formData.append('message', newNoteText.trim() || (pendingNoteFile ? `File attached: ${pendingNoteFile.name}` : ''));
        if (pendingNoteFile) formData.append('file', pendingNoteFile);
        setIsSubmittingNote(true);
        router.post(`/enquiries/${selectedEnquiry.id}/follow-ups`, formData, {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => { setNewNoteText(''); setPendingNoteFile(null); },
            onFinish:  () => setIsSubmittingNote(false),
        });
    }

    function handleNoteFileInput(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file && file.size <= 10 * 1024 * 1024) setPendingNoteFile(file);
        event.target.value = '';
    }

    function deleteFollowUp(followUpId: number) {
        if (!confirm('Delete this follow-up note?')) return;
        router.delete(`/follow-ups/${followUpId}`, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function uploadEnquiryFiles(fileList: FileList | File[], enquiryId: number) {
        Array.from(fileList).forEach((file) => {
            if (file.size > 10 * 1024 * 1024) return;
            const formData = new FormData();
            formData.append('file', file);
            router.post(`/enquiries/${enquiryId}/files`, formData, {
                forceFormData: true,
                preserveState: true,
                preserveScroll: true,
            });
        });
    }

    function deleteEnquiryFile(enquiryId: number, fileIndex: number) {
        if (!confirm('Remove this file?')) return;
        router.delete(`/enquiries/${enquiryId}/files/${fileIndex}`, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function openAddNew() {
        setNewForm({
            name: '', phone: '', email: '', loc: '',
            date: new Date().toISOString().slice(0, 10),
            type: TYPE_OPTIONS[0],
            user_id: String(users[0]?.id ?? ''),
            source: SOURCE_OPTIONS[0],
            lead:   LEAD_OPTIONS[0],
            notes: '',
        });
        setNewFormErrors({});
        setIsAddingNew(true);
    }

    function handleCreateEnquiry() {
        if (!newForm.name?.trim()) {
            setNewFormErrors({ name: 'Client name is required.' });
            return;
        }
        setIsSubmittingNew(true);
        router.post('/enquiries', newForm, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => { setIsAddingNew(false); setNewFormErrors({}); },
            onError:   (errors) => setNewFormErrors(errors as Record<string, string>),
            onFinish:  () => setIsSubmittingNew(false),
        });
    }

    function handleDelete() {
        if (!selectedEnquiry) return;
        if (!confirm(`Delete ${selectedEnquiry.name}? This cannot be undone.`)) return;
        router.delete(`/enquiries/${selectedEnquiry.id}`, {
            preserveScroll: true,
            onSuccess: () => setSelectedId(null),
        });
    }

    function openEdit() {
        if (!selectedEnquiry) return;
        const parsedDate = new Date(selectedEnquiry.date);
        const dateValue = !isNaN(parsedDate.getTime())
            ? parsedDate.toISOString().slice(0, 10)
            : selectedEnquiry.date;
        setEditDraft({
            name:   selectedEnquiry.name,
            phone:  selectedEnquiry.phone  || '',
            email:  selectedEnquiry.email  || '',
            loc:    selectedEnquiry.loc    || '',
            date:   dateValue,
            type:   selectedEnquiry.type,
            user_id: String(selectedEnquiry.user_id ?? ''),
            source:  selectedEnquiry.source || '',
            lead:   selectedEnquiry.lead   || '',
            notes:  selectedEnquiry.notes  || selectedEnquiry.message || '',
            fu:     selectedEnquiry.fu     || '',
            dep1:   selectedEnquiry.dep1   || 'NO',
            dep2:   selectedEnquiry.dep2   || 'NO',
        });
        const followUpSnapshot: Record<number, string> = {};
        selectedEnquiry.followUps.forEach((followUp) => { followUpSnapshot[followUp.id] = followUp.message; });
        setEditFollowUps(followUpSnapshot);
        setFollowUpNewFiles({});
        setFollowUpRemoveFile({});
        setIsEditing(true);
    }

    function handleSaveEdit() {
        if (!selectedEnquiry) return;
        const dep1   = editDraft.dep2 === 'YES' ? 'YES' : (editDraft.dep1 ?? selectedEnquiry.dep1);
        const dep2   = editDraft.dep2 ?? selectedEnquiry.dep2;
        let   status = selectedEnquiry.status;
        if (dep1 === 'YES' && status === 'New') status = '1st Deposit';
        if (dep2 === 'YES') status = '2nd Deposit';

        const userId     = editDraft.user_id ? Number(editDraft.user_id) : null;
        const targetUser = users.find((user) => user.id === userId) ?? null;

        const payload = {
            name: editDraft.name, phone: editDraft.phone, email: editDraft.email,
            loc:  editDraft.loc,  date:  editDraft.date,  type:  editDraft.type,
            user_id: userId,      source: editDraft.source, lead: editDraft.lead,
            notes: editDraft.notes, fu: editDraft.fu,
            dep1, dep2, status,
        };

        // Optimistically update follow-up messages so they show immediately without waiting for server
        const optimisticFollowUps = selectedEnquiry.followUps.map((followUp) => ({
            ...followUp,
            message: editFollowUps[followUp.id] ?? followUp.message,
        }));
        updateEnquiry({ ...selectedEnquiry, ...payload, user_id: userId, assignedUser: targetUser, followUps: optimisticFollowUps });
        setIsEditing(false);

        const enquiryId = selectedEnquiry.id;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

        // Follow-up patches via fetch (won't cancel the Inertia request)
        const followUpPatches = selectedEnquiry.followUps
            .map((followUp) => {
                const editedMessage  = editFollowUps[followUp.id] ?? followUp.message;
                const newFile        = followUpNewFiles[followUp.id] ?? null;
                const removeFile     = followUpRemoveFile[followUp.id] ?? false;
                const messageChanged = editedMessage !== followUp.message;

                if (!messageChanged && !newFile && !removeFile) return null;

                const formData = new FormData();
                formData.append('_method', 'PATCH');
                formData.append('message', editedMessage);
                if (newFile) formData.append('file', newFile);
                if (removeFile) formData.append('remove_file', '1');

                return fetch(`/follow-ups/${followUp.id}`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken },
                    body: formData,
                });
            })
            .filter(Boolean) as Promise<Response>[];

        // Enquiry patch fires after follow-ups complete; on success, clear the override so
        // fresh server data (with updated file info etc.) replaces the optimistic state.
        Promise.all(followUpPatches).finally(() => {
            router.patch(`/enquiries/${enquiryId}`, payload, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => setOverrides((prev) => { const next = new Map(prev); next.delete(enquiryId); return next; }),
            });
        });
    }

    function handleImportButtonClick() {
        fileInputRef.current?.click();
    }

    function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setIsImporting(true);
        router.post('/enquiries/import', formData, {
            onFinish: () => {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    }

    const typeNames = useMemo(() => [...new Set(enquiries.map((enquiry) => enquiry.type))], [enquiries]);

    const filteredEnquiries = useMemo(() => {
        const searchQuery = search.toLowerCase();
        return enquiries.filter((enquiry) => {
            const matchesSearch = !searchQuery
                || enquiry.name.toLowerCase().includes(searchQuery)
                || enquiry.phone.includes(searchQuery)
                || enquiry.loc.toLowerCase().includes(searchQuery)
                || enquiry.email.toLowerCase().includes(searchQuery);
            const matchesRep = !repFilter
                || String(enquiry.user_id) === repFilter
                || (!enquiry.user_id && enquiry.rep === repFilter);
            return matchesSearch
                && matchesRep
                && (!typeFilter   || enquiry.type   === typeFilter)
                && (!statusFilter || enquiry.status === statusFilter);
        });
    }, [enquiries, search, repFilter, typeFilter, statusFilter]);

    const stats = useMemo(() => ({
        total:    enquiries.length,
        newCount: enquiries.filter((enquiry) => enquiry.status === 'New').length,
        meetings: enquiries.filter((enquiry) => enquiry.status === 'Meeting').length,
        deposits: enquiries.filter((enquiry) => enquiry.status === '1st Deposit' || enquiry.status === '2nd Deposit').length,
        alerts:   enquiries.filter((enquiry) => getAlertLevel(enquiry) !== 'ok').length,
    }), [enquiries]);

    const totalPages         = Math.max(1, Math.ceil(filteredEnquiries.length / PAGE_SIZE));
    const paginatedEnquiries = filteredEnquiries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selectedEnquiry    = enquiries.find((enquiry) => enquiry.id === selectedId) ?? null;
    const canEdit            = isSuperAdmin || auth.user.id === selectedEnquiry?.user_id;

    function resetToFirstPage() {
        setCurrentPage(1);
    }

    return (
        <>
            <Head title="Enquiries" />

            <div className="space-y-6 p-6">

                {/* ── Flash message ──────────────────────────────── */}
                {flash && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {flash}
                    </div>
                )}

                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Enquiries</h1>
                        <p className="mt-0.5 text-sm text-gray-500">All enquiries · 2026</p>
                    </div>
                    <div className="flex gap-2">
                        {isSuperAdmin && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileSelected}
                                />
                                <button
                                    onClick={handleImportButtonClick}
                                    disabled={isImporting}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 hover:cursor-pointer"
                                >
                                    <Upload size={15} /> {isImporting ? 'Importing…' : 'Import CSV'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => buildAndDownloadCSV(enquiries)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:cursor-pointer"
                        >
                            <Download size={15} /> Export CSV
                        </button>
                        <button
                            onClick={openAddNew}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 hover:cursor-pointer"
                        >
                            <Plus size={15} /> New enquiry
                        </button>
                    </div>
                </div>

                {/* ── Stats ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Total enquiries" value={stats.total}    icon="👥" accent="#1d4ed8" />
                    <StatCard label="New leads"        value={stats.newCount} icon="✨" accent="#0d9488" />
                    <StatCard label="Meetings"         value={stats.meetings} icon="📅" accent="#7c3aed" />
                    <StatCard label="Deposits taken"   value={stats.deposits} icon="💰" accent="#16a34a" />
                    <StatCard label="Alerts"           value={stats.alerts}   icon="🔔" accent="#dc2626" onClick={() => router.visit('/alerts')} />
                </div>

                {/* ── Toolbar ────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="relative min-w-[200px] flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, postcode, email…"
                            value={search}
                            onChange={(event) => { setSearch(event.target.value); resetToFirstPage(); }}
                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                        />
                    </div>

                    <select
                        value={repFilter}
                        onChange={(event) => { setRepFilter(event.target.value); resetToFirstPage(); }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-700 focus:outline-none"
                    >
                        <option value="">All reps</option>
                        {users.map((user) => <option key={user.id} value={String(user.id)}>{user.name}</option>)}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(event) => { setTypeFilter(event.target.value); resetToFirstPage(); }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-700 focus:outline-none"
                    >
                        <option value="">All types</option>
                        {typeNames.map((typeName) => <option key={typeName}>{typeName}</option>)}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) => { setStatusFilter(event.target.value); resetToFirstPage(); }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-700 focus:outline-none"
                    >
                        <option value="">All statuses</option>
                        {STATUSES.map((statusName) => <option key={statusName}>{statusName}</option>)}
                    </select>

                    <div className="ml-auto flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                        {(['cards', 'list', 'kanban'] as const).map((viewKey) => {
                            const viewLabel = viewKey === 'cards' ? 'Cards' : viewKey === 'list' ? 'List' : 'Pipeline';
                            const viewIcon  = viewKey === 'cards' ? <Grid3X3 size={14} /> : viewKey === 'list' ? <List size={14} /> : <Columns3 size={14} />;
                            return (
                                <button
                                    key={viewKey}
                                    onClick={() => setView(viewKey)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${view === viewKey ? 'bg-blue-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {viewIcon} {viewLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Card view ──────────────────────────────────── */}
                {view === 'cards' && (
                    filteredEnquiries.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredEnquiries.map((enquiry) => (
                                <EnquiryCard key={enquiry.id} enquiry={enquiry} onClick={() => setSelectedId(enquiry.id)} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-gray-400">
                            <Search size={36} className="mb-3 opacity-40" />
                            <p className="text-sm">No enquiries match your filters.</p>
                        </div>
                    )
                )}

                {/* ── List view ──────────────────────────────────── */}
                {view === 'list' && (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="w-8 px-4 py-3"></th>
                                        <th className="px-4 py-3">Client</th>
                                        <th className="hidden px-4 py-3 sm:table-cell">Phone</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="hidden px-4 py-3 md:table-cell">Location</th>
                                        <th className="px-4 py-3">Rep</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="hidden px-4 py-3 lg:table-cell">Date</th>
                                        <th className="px-4 py-3">Alert</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEnquiries.length > 0 ? paginatedEnquiries.map((enquiry) => {
                                        const lvl = getAlertLevel(enquiry);
                                        const alertBorderStyle = lvl === 'urgent' ? { borderLeft: '3px solid #b91c1c' } : lvl === 'warning' ? { borderLeft: '3px solid #c2410c' } : {};
                                        return (
                                            <tr
                                                key={enquiry.id}
                                                onClick={() => setSelectedId(enquiry.id)}
                                                style={alertBorderStyle}
                                                className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3"><Avatar name={enquiry.name} user={enquiry.assignedUser} /></td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{enquiry.name}</td>
                                                <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{enquiry.phone}</td>
                                                <td className="px-4 py-3"><TypeBadge type={enquiry.type} /></td>
                                                <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{enquiry.loc}</td>
                                                <td className="px-4 py-3"><RepBadge user={enquiry.assignedUser} fallback={enquiry.rep} /></td>
                                                <td className="px-4 py-3"><StatusBadge status={enquiry.status} /></td>
                                                <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">{formatDate(enquiry.date)}</td>
                                                <td className="px-4 py-3">
                                                    {lvl !== 'ok' ? <AlertChip enquiry={enquiry} /> : <span className="text-gray-300">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                                                No enquiries match your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                            <span className="text-xs text-gray-500">
                                {filteredEnquiries.length > 0
                                    ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredEnquiries.length)} of ${filteredEnquiries.length}`
                                    : '0 results'}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                    <button
                                        key={pageNumber}
                                        onClick={() => setCurrentPage(pageNumber)}
                                        className={`h-7 w-7 rounded border text-xs font-medium transition ${pageNumber === currentPage ? 'border-blue-900 bg-blue-900 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {pageNumber}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Kanban / Pipeline view ─────────────────────── */}
                {view === 'kanban' && (
                    <div className="flex gap-3 overflow-x-auto pb-4">
                        {STATUSES.map((status) => (
                            <KanbanColumn
                                key={status}
                                status={status}
                                enquiries={filteredEnquiries.filter((enquiry) => enquiry.status === status)}
                                onSelect={setSelectedId}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Detail modal ───────────────────────────────────── */}
            {selectedEnquiry && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
                    onClick={() => setSelectedId(null)}
                >
                    <div
                        className="w-full max-w-2xl animate-[slideUp_.2s_ease] rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* ── Modal header ── */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <Avatar name={selectedEnquiry.name} user={selectedEnquiry.assignedUser} />
                                <div>
                                    <h2 className="font-semibold text-gray-900">
                                        {isEditing ? 'Edit enquiry' : selectedEnquiry.name}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {selectedEnquiry.assignedUser?.name ?? selectedEnquiry.rep ?? '—'} · {formatDate(selectedEnquiry.date)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing && <StatusBadge status={selectedEnquiry.status} />}
                                <button
                                    onClick={() => { setSelectedId(null); setIsEditing(false); }}
                                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 hover:cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* ── Modal body ── */}
                        {isEditing ? (
                        <div className="max-h-[74vh] space-y-4 overflow-y-auto p-6">
                            {/* Row: name + phone */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Client name *', key: 'name', type: 'text' },
                                    { label: 'Phone',         key: 'phone', type: 'text' },
                                ].map(({ label, key, type }) => (
                                    <div key={key}>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
                                        <input
                                            type={type}
                                            value={editDraft[key] ?? ''}
                                            onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                        />
                                    </div>
                                ))}
                            </div>
                            {/* Email */}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</label>
                                <input
                                    type="email"
                                    value={editDraft.email ?? ''}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, email: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                />
                            </div>
                            {/* Row: location + date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Location</label>
                                    <input
                                        type="text"
                                        value={editDraft.loc ?? ''}
                                        onChange={(event) => setEditDraft((prev) => ({ ...prev, loc: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Date</label>
                                    <input
                                        type="date"
                                        value={editDraft.date ?? ''}
                                        onChange={(event) => setEditDraft((prev) => ({ ...prev, date: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                    />
                                </div>
                            </div>
                            {/* Row: type + rep */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Type</label>
                                    <select
                                        value={editDraft.type ?? ''}
                                        onChange={(event) => setEditDraft((prev) => ({ ...prev, type: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        {['H&L', 'KDRB', 'Contract', 'Duplex', 'Custom Duplex', 'Dual Living', 'KDRB/Dual Living'].map((typeName) => (
                                            <option key={typeName}>{typeName}</option>
                                        ))}
                                    </select>
                                </div>
                                {isSuperAdmin && (
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sales rep</label>
                                        <select
                                            value={editDraft.user_id ?? ''}
                                            onChange={(event) => setEditDraft((prev) => ({ ...prev, user_id: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                        >
                                            <option value="">— Unassigned —</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={String(user.id)}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {/* Row: source + lead */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Source',      key: 'source' },
                                    { label: 'Lead source', key: 'lead' },
                                ].map(({ label, key }) => (
                                    <div key={key}>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
                                        <input
                                            type="text"
                                            value={editDraft[key] ?? ''}
                                            onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                        />
                                    </div>
                                ))}
                            </div>
                            {/* Enquiry notes */}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Enquiry notes</label>
                                <textarea
                                    value={editDraft.notes ?? ''}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                    rows={3}
                                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                />
                            </div>
                            {/* Follow-up history entries */}
                            {selectedEnquiry && selectedEnquiry.followUps.length > 0 && (
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Follow-up history ({selectedEnquiry.followUps.length})
                                    </label>
                                    <div className="space-y-2">
                                        {selectedEnquiry.followUps.map((followUp) => {
                                            const newFile     = followUpNewFiles[followUp.id] ?? null;
                                            const removing    = followUpRemoveFile[followUp.id] ?? false;
                                            const hasExisting = !!followUp.file_name && !removing && !newFile;
                                            return (
                                            <div key={followUp.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                                                <p className="mb-1 text-[11px] font-semibold text-gray-400">
                                                    {new Date(followUp.date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </p>
                                                <textarea
                                                    value={editFollowUps[followUp.id] ?? followUp.message}
                                                    onChange={(event) => setEditFollowUps((prev) => ({ ...prev, [followUp.id]: event.target.value }))}
                                                    rows={2}
                                                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                                />
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    {newFile ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                                                            <Paperclip size={11} className="text-blue-600" />
                                                            {newFile.name}
                                                            <button type="button" onClick={() => setFollowUpNewFiles((prev) => ({ ...prev, [followUp.id]: null }))} className="text-gray-400 hover:text-red-500"><X size={11} /></button>
                                                        </span>
                                                    ) : hasExisting ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                                            <Paperclip size={11} className="text-gray-400" />
                                                            {followUp.file_name}
                                                            <button type="button" onClick={() => setFollowUpRemoveFile((prev) => ({ ...prev, [followUp.id]: true }))} className="text-gray-400 hover:text-red-500"><X size={11} /></button>
                                                        </span>
                                                    ) : null}
                                                    {hasExisting ? (
                                                        <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                                                            Replace
                                                            <input type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) setFollowUpNewFiles((prev) => ({ ...prev, [followUp.id]: file })); event.target.value = ''; }} />
                                                        </label>
                                                    ) : (
                                                        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                                            <Paperclip size={11} /> Attach file
                                                            <input type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) setFollowUpNewFiles((prev) => ({ ...prev, [followUp.id]: file })); event.target.value = ''; }} />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {/* Row: deposits */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: '1st deposit', key: 'dep1' },
                                    { label: '2nd deposit', key: 'dep2' },
                                ].map(({ label, key }) => (
                                    <div key={key}>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
                                        <select
                                            value={editDraft[key] ?? 'NO'}
                                            onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                        >
                                            <option value="NO">No</option>
                                            <option value="YES">Yes</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                        ) : (
                        <div className="max-h-[74vh] space-y-5 overflow-y-auto p-6">

                            {/* Alert banner */}
                            {getAlertLevel(selectedEnquiry) !== 'ok' && (
                                <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${getAlertLevel(selectedEnquiry) === 'urgent' ? 'border-red-200 bg-red-50 text-red-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                                    {getAlertLevel(selectedEnquiry) === 'urgent'
                                        ? <BellRing size={16} />
                                        : <Clock size={16} />}
                                    <span>
                                        <strong>{getAlertLevel(selectedEnquiry) === 'urgent' ? 'Overdue' : 'Warning'}:</strong>{' '}
                                        No response logged for {formatElapsed(selectedEnquiry.firstContactTimestamp)}
                                    </span>
                                </div>
                            )}

                            {/* Contact + Enquiry detail grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contact</p>
                                    <div className="space-y-1">
                                        {[
                                            { label: <span className="flex items-center gap-1.5"><Phone size={12} /> Phone</span>, value: selectedEnquiry.phone },
                                            { label: <span className="flex items-center gap-1.5"><Mail size={12} /> Email</span>,  value: <span className="break-all text-xs">{selectedEnquiry.email}</span> },
                                            { label: 'Location', value: selectedEnquiry.loc },
                                        ].map(({ label, value }, index) => (
                                            <div key={index} className="flex items-baseline justify-between py-1 text-sm">
                                                <span className="text-xs text-gray-500">{label}</span>
                                                <span className="ml-4 max-w-[59%] text-right font-medium text-gray-900">{value || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Enquiry</p>
                                    <div className="space-y-1">
                                        {[
                                            { label: 'Type',        value: <TypeBadge type={selectedEnquiry.type} /> },
                                            { label: 'Source',      value: selectedEnquiry.source },
                                            { label: 'Lead via',    value: selectedEnquiry.lead || selectedEnquiry.where_did_you_hear },
                                            { label: '1st Deposit', value: selectedEnquiry.dep1 === 'YES' ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Yes ✓</span> : 'No' },
                                            { label: '2nd Deposit', value: selectedEnquiry.dep2 === 'YES' ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">Yes ✓</span> : 'No' },
                                        ].map(({ label, value }, index) => (
                                            <div key={index} className="flex items-baseline justify-between py-1 text-sm">
                                                <span className="text-xs text-gray-500">{label}</span>
                                                <span className="ml-4 max-w-[58%] text-right font-medium text-gray-900">{value || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Enquiry notes */}
                            <div>
                                <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Enquiry notes</p>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
                                    {selectedEnquiry.notes || selectedEnquiry.message || '—'}
                                </div>
                            </div>

                            {/* Follow-up history */}
                            <div>
                                <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                    Follow-up history ({selectedEnquiry.followUps.length})
                                </p>
                                {selectedEnquiry.followUps.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedEnquiry.followUps.map((followUp) => (
                                            <div key={followUp.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                                <div className="mb-0.5 flex items-center justify-between">
                                                    <p className="text-[11px] font-semibold text-gray-400">{formatDate(followUp.date)}</p>
                                                    <button
                                                        onClick={() => deleteFollowUp(followUp.id)}
                                                        className="text-gray-300 transition hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                                <p className="text-gray-700">{followUp.message}</p>
                                                {followUp.file_name && (
                                                    <a
                                                        href={`/follow-ups/${followUp.id}/download`}
                                                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                                    >
                                                        <Paperclip size={10} />
                                                        {followUp.file_name.length > 28 ? followUp.file_name.slice(0, 26) + '…' : followUp.file_name}
                                                        {followUp.file_size && <span className="text-blue-400">· {formatBytes(followUp.file_size)}</span>}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No follow-up notes yet.</p>
                                )}
                                {/* Legacy imported notes */}
                                {selectedEnquiry.fu && (
                                    <div className="mt-3 space-y-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
                                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Imported notes</p>
                                        {selectedEnquiry.fu.split('\n').filter(Boolean).map((line, index) => {
                                            const matchResult = line.match(/^([\d/]+)\s*-\s*(.+)$/);
                                            return matchResult ? (
                                                <div key={index} className="text-xs text-gray-600">
                                                    <span className="font-semibold text-gray-400">{matchResult[1]}</span>
                                                    {' — '}{matchResult[2]}
                                                </div>
                                            ) : <div key={index} className="text-xs text-gray-600">{line}</div>;
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Status & assignment */}
                            <div>
                                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-1.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Status &amp; assignment</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Assigned to:</span>
                                        {isSuperAdmin ? (
                                            <select
                                                value={String(selectedEnquiry.user_id ?? '')}
                                                onChange={(event) => handleUserAssign(event.target.value)}
                                                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-700 focus:outline-none hover:cursor-pointer"
                                            >
                                                <option value="">— Unassigned —</option>
                                                {users.map((user) => <option key={user.id} value={String(user.id)}>{user.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className="text-xs font-medium text-gray-700">
                                                {selectedEnquiry.assignedUser?.name ?? selectedEnquiry.rep ?? '—'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {STATUSES.map((statusName) => {
                                        const colorConfig = STATUS_COLORS[statusName] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
                                        const isActive    = selectedEnquiry.status === statusName;
                                        return (
                                            <button
                                                key={statusName}
                                                onClick={() => handleStatusChange(statusName)}
                                                className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition hover:scale-105 hover:cursor-pointer ${colorConfig.bg} ${colorConfig.text} ${isActive ? 'ring-2 ring-blue-900 ring-offset-1' : 'border-transparent'}`}
                                            >
                                                {statusName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Files & attachments */}
                            <div>
                                <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                    Files &amp; attachments ({(selectedEnquiry.files ?? []).length})
                                </p>

                                {(selectedEnquiry.files ?? []).length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        {(selectedEnquiry.files ?? []).map((storedFile, fileIndex) => {
                                            const { bgClass, icon } = getFileIconConfig(storedFile.name);
                                            return (
                                                <div key={fileIndex} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
                                                        {icon}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-medium text-gray-900">{storedFile.name}</p>
                                                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                                                            <span>{formatBytes(storedFile.size)}</span>
                                                            <span>{storedFile.date}</span>
                                                        </div>
                                                    </div>
                                                    {storedFile.file_path && (
                                                        <a
                                                            href={`/enquiries/${selectedEnquiry.id}/files/${fileIndex}/download`}
                                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-400 transition hover:border-blue-300 hover:text-blue-600"
                                                            title="Download"
                                                        >
                                                            <Download size={13} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => deleteEnquiryFile(selectedEnquiry.id, fileIndex)}
                                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-600"
                                                        title="Remove"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Drop zone */}
                                <div
                                    onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setIsDragOver(false);
                                        uploadEnquiryFiles(event.dataTransfer.files, selectedEnquiry.id);
                                    }}
                                    onClick={() => enquiryFileInputRef.current?.click()}
                                    className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'}`}
                                >
                                    <Upload size={22} className="mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-500">
                                        <strong className="text-blue-700">Click to upload</strong> or drag &amp; drop
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">PDF, Word, Excel, images — max 10MB</p>
                                </div>
                                <input
                                    ref={enquiryFileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(event) => {
                                        if (event.target.files) uploadEnquiryFiles(event.target.files, selectedEnquiry.id);
                                        event.target.value = '';
                                    }}
                                />
                            </div>

                            {/* Add update */}
                            {canEdit && <div>
                                <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Add update</p>
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    <textarea
                                        value={newNoteText}
                                        onChange={(event) => setNewNoteText(event.target.value)}
                                        placeholder="Write your follow-up note here…"
                                        rows={3}
                                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                    />

                                    {/* Pending file chip */}
                                    {pendingNoteFile && (
                                        <div className="mt-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                                                <Paperclip size={11} className="text-blue-600" />
                                                {pendingNoteFile.name.length > 28 ? pendingNoteFile.name.slice(0, 26) + '…' : pendingNoteFile.name}
                                                <span className="text-gray-400">· {formatBytes(pendingNoteFile.size)}</span>
                                                <button onClick={() => setPendingNoteFile(null)} className="ml-0.5 text-gray-400 hover:text-red-500">
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            onClick={() => noteFileInputRef.current?.click()}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:cursor-pointer"
                                        >
                                            <Paperclip size={13} /> Attach file
                                        </button>
                                        <input
                                            ref={noteFileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={handleNoteFileInput}
                                        />
                                        <button
                                            onClick={handleSaveNote}
                                            disabled={isSubmittingNote || (!newNoteText.trim() && !pendingNoteFile)}
                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-40 hover:cursor-pointer disabled:hover:bg-blue-900"
                                        >
                                            <Send size={14} /> {isSubmittingNote ? 'Saving…' : 'Save update'}
                                        </button>
                                    </div>
                                </div>
                            </div>}
                        </div>
                        )} {/* end isEditing ternary */}

                        {/* ── Modal footer ── */}
                        <div className="flex items-center justify-between rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-3">
                            {isEditing ? (
                                <>
                                    <div />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 hover:cursor-pointer"
                                        >
                                            <Check size={14} /> Save changes
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {isSuperAdmin && (
                                        <button
                                            onClick={handleDelete}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:cursor-pointer"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        {canEdit && (
                                            <button
                                                onClick={openEdit}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:cursor-pointer"
                                            >
                                                <Pencil size={14} /> Edit
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedId(null)}
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:cursor-pointer"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── New enquiry modal ──────────────────────────── */}
            {isAddingNew && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
                    onClick={() => setIsAddingNew(false)}
                >
                    <div
                        className="w-full max-w-2xl animate-[slideUp_.2s_ease] rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-800">
                                    <Plus size={18} />
                                </div>
                                <h2 className="font-semibold text-gray-900">New enquiry</h2>
                            </div>
                            <button
                                onClick={() => setIsAddingNew(false)}
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 hover:cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="max-h-[74vh] space-y-4 overflow-y-auto p-6">

                            {/* Name + Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Client name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newForm.name ?? ''}
                                        onChange={(event) => {
                                            setNewForm((prev) => ({ ...prev, name: event.target.value }));
                                            if (newFormErrors.name) setNewFormErrors((prev) => ({ ...prev, name: '' }));
                                        }}
                                        placeholder="Full name"
                                        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${newFormErrors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-700 focus:ring-blue-700'}`}
                                    />
                                    {newFormErrors.name && <p className="mt-1 text-xs text-red-600">{newFormErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Phone</label>
                                    <input
                                        type="text"
                                        value={newForm.phone ?? ''}
                                        onChange={(event) => setNewForm((prev) => ({ ...prev, phone: event.target.value }))}
                                        placeholder="04xx xxx xxx"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</label>
                                <input
                                    type="email"
                                    value={newForm.email ?? ''}
                                    onChange={(event) => setNewForm((prev) => ({ ...prev, email: event.target.value }))}
                                    placeholder="email@example.com"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                />
                            </div>

                            {/* Location + Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Location / Postcode</label>
                                    <input
                                        type="text"
                                        value={newForm.loc ?? ''}
                                        onChange={(event) => setNewForm((prev) => ({ ...prev, loc: event.target.value }))}
                                        placeholder="2179 – Austral"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Date</label>
                                    <input
                                        type="date"
                                        value={newForm.date ?? ''}
                                        onChange={(event) => setNewForm((prev) => ({ ...prev, date: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                    />
                                </div>
                            </div>

                            {/* Type + Rep */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Interest in</label>
                                    <select
                                        value={newForm.type ?? TYPE_OPTIONS[0]}
                                        onChange={(event) => setNewForm((prev) => ({ ...prev, type: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        {TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                                    </select>
                                </div>
                                {isSuperAdmin && (
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sales rep</label>
                                        <select
                                            value={newForm.user_id ?? ''}
                                            onChange={(event) => setNewForm((prev) => ({ ...prev, user_id: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                        >
                                            <option value="">— Unassigned —</option>
                                            {users.map((user) => <option key={user.id} value={String(user.id)}>{user.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Source + Lead */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Source</label>
                                    <select
                                        value={newForm.source ?? SOURCE_OPTIONS[0]}
                                        onChange={(event) => setNewForm((prev) => ({ ...prev, source: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        {SOURCE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Lead source</label>
                                    <select
                                        value={newForm.lead ?? LEAD_OPTIONS[0]}
                                        onChange={(event) => setNewForm((prev) => ({ ...prev, lead: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        {LEAD_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Enquiry notes</label>
                                <textarea
                                    value={newForm.notes ?? ''}
                                    onChange={(event) => setNewForm((prev) => ({ ...prev, notes: event.target.value }))}
                                    placeholder="Lot address, home design interest, budget…"
                                    rows={4}
                                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-3">
                            <button
                                onClick={() => setIsAddingNew(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateEnquiry}
                                disabled={isSubmittingNew}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                            >
                                <Check size={14} /> {isSubmittingNew ? 'Saving…' : 'Save enquiry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

EnquiriesPage.layout = {
    breadcrumbs: [
        { title: 'Enquiries', href: '/enquiries' },
    ],
};
