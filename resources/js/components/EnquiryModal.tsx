import { useState, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { Auth } from '@/types/auth';
import { getUserColor } from '@/lib/user-colors';
import {
    X, Phone, Mail, BellRing, Clock,
    Paperclip, Download, Upload, Send, Check, Pencil, Trash2,
    FileText, FileImage, File as FileIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrmUser {
    id: number;
    name: string;
    email: string;
    title: string | null;
    phone: string | null;
    status: string;
    color?: number;
}

export interface FollowUp {
    id: number;
    date: string;
    message: string;
    file_name: string | null;
    file_size: number | null;
    file_mime: string | null;
    user_name: string | null;
}

export interface FullEnquiry {
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
    dep1: string;
    dep2: string;
    notes: string;
    design_name: string;
    alt_s: string;
    ajxizl7033: string;
    message: string;
    join_email_list: boolean;
    fu: string;
    firstContactTimestamp: string;
    files: { name: string; size: number; date: string; file_path?: string }[];
    files_count: number;
    user_id: number | null;
    assignedUser: CrmUser | null;
    followUps: FollowUp[];
    elapsed?: string;
    hasNotes?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['New', 'Contacted', 'Meeting', '1st Deposit', '2nd Deposit', 'Cold', 'Lost'];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    New:           { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200' },
    Contacted:     { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
    Meeting:       { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
    '1st Deposit': { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200' },
    '2nd Deposit': { bg: 'bg-teal-50',   text: 'text-teal-800',   border: 'border-teal-200' },
    Cold:        { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200' },
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

const TYPE_OPTIONS   = ['H&L', 'KDRB', 'Contract', 'Duplex', 'Custom Duplex', 'Dual Living', 'KDRB/Dual Living'];
const SOURCE_OPTIONS = ['Email', 'Phone', 'Realestate.com', 'Display Home', 'Website', 'Facebook', 'Google', 'Signage', 'Referral', 'Other'];
const LEAD_OPTIONS   = ['Google', 'Facebook', 'Realestate.com', 'Display Home', 'Website', 'Signage', 'Referral', 'Friends', 'Other', 'N/A'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((word) => word[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function formatDate(dateString: string) {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1_048_576) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1_048_576).toFixed(1) + 'MB';
}

function formatElapsed(timestamp: string) {
    const elapsedMs = Date.now() - new Date(timestamp).getTime();
    if (elapsedMs < 3_600_000)  return Math.floor(elapsedMs / 60000) + 'm ago';
    if (elapsedMs < 86_400_000) return Math.floor(elapsedMs / 3_600_000) + 'h ago';
    return Math.floor(elapsedMs / 86_400_000) + 'd ago';
}

function getAlertLevel(enquiry: FullEnquiry): 'urgent' | 'warning' | 'ok' {
    if (enquiry.status !== 'New') return 'ok';
    if (enquiry.fu || enquiry.followUps?.length) return 'ok';
    const elapsedMs = Date.now() - new Date(enquiry.firstContactTimestamp).getTime();
    if (elapsedMs >= ALERT_24H) return 'urgent';
    if (elapsedMs >= ALERT_4H)  return 'warning';
    return 'ok';
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
    return { bgClass: 'bg-gray-100 text-gray-500', icon: <FileIcon size={15} /> };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {status}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const colorClass = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>{type}</span>;
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

// ─── Main component ───────────────────────────────────────────────────────────

interface EnquiryModalProps {
    enquiry: FullEnquiry;
    users: CrmUser[];
    onClose: () => void;
    onEnquiryChange: (updated: FullEnquiry) => void;
}

export default function EnquiryModal({ enquiry, users, onClose, onEnquiryChange }: EnquiryModalProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isSuperAdmin = auth.isSuperAdmin ?? false;
    const isAdmin      = auth.isAdmin ?? false;
    const canEdit      = isSuperAdmin || isAdmin || auth.user.id === enquiry.user_id;

    const [isEditing, setIsEditing]             = useState(false);
    const [editDraft, setEditDraft]             = useState<Record<string, string>>({});
    const [editFollowUps, setEditFollowUps]         = useState<Record<number, string>>({});
    const [followUpNewFiles, setFollowUpNewFiles]   = useState<Record<number, File | null>>({});
    const [followUpRemoveFile, setFollowUpRemoveFile] = useState<Record<number, boolean>>({});
    const [newNoteText, setNewNoteText]         = useState('');
    const [pendingNoteFile, setPendingNoteFile] = useState<File | null>(null);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isDragOver, setIsDragOver]           = useState(false);

    const noteFileInputRef    = useRef<HTMLInputElement>(null);
    const enquiryFileInputRef = useRef<HTMLInputElement>(null);

    const alertLevel = getAlertLevel(enquiry);

    function handleStatusChange(newStatus: string) {
        const payload: Record<string, string> = { status: newStatus };
        if (newStatus === '1st Deposit') payload.dep1 = 'YES';
        if (newStatus === '2nd Deposit') { payload.dep1 = 'YES'; payload.dep2 = 'YES'; }
        onEnquiryChange({ ...enquiry, ...payload });
        router.patch(`/enquiries/${enquiry.id}`, payload, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleUserAssign(userIdStr: string) {
        const numericId  = userIdStr ? Number(userIdStr) : null;
        const targetUser = users.find((user) => user.id === numericId) ?? null;
        onEnquiryChange({ ...enquiry, user_id: numericId, assignedUser: targetUser });
        router.patch(`/enquiries/${enquiry.id}`, { user_id: numericId }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleSaveNote() {
        if (!newNoteText.trim() && !pendingNoteFile) return;
        const formData = new FormData();
        formData.append('date', new Date().toISOString().slice(0, 10));
        formData.append('message', newNoteText.trim() || (pendingNoteFile ? `File attached: ${pendingNoteFile.name}` : ''));
        if (pendingNoteFile) formData.append('file', pendingNoteFile);
        setIsSubmittingNote(true);
        router.post(`/enquiries/${enquiry.id}/follow-ups`, formData, {
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

    function uploadEnquiryFiles(fileList: FileList | File[]) {
        Array.from(fileList).forEach((file) => {
            if (file.size > 10 * 1024 * 1024) return;
            const formData = new FormData();
            formData.append('file', file);
            router.post(`/enquiries/${enquiry.id}/files`, formData, {
                forceFormData: true,
                preserveState: true,
                preserveScroll: true,
            });
        });
    }

    function deleteEnquiryFile(fileIndex: number) {
        if (!confirm('Remove this file?')) return;
        router.delete(`/enquiries/${enquiry.id}/files/${fileIndex}`, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function openEditMode() {
        const parsedDate = new Date(enquiry.date);
        const dateValue  = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : enquiry.date;
        setEditDraft({
            name:    enquiry.name,
            phone:   enquiry.phone    || '',
            email:   enquiry.email    || '',
            loc:     enquiry.loc      || '',
            date:    dateValue,
            type:    enquiry.type,
            user_id: String(enquiry.user_id ?? ''),
            source:  enquiry.source   || '',
            lead:    enquiry.lead     || '',
            notes:   enquiry.notes    || enquiry.message || '',
            fu:      enquiry.fu       || '',
            dep1:    enquiry.dep1     || 'NO',
            dep2:    enquiry.dep2     || 'NO',
        });
        const followUpSnapshot: Record<number, string> = {};
        enquiry.followUps.forEach((followUp) => { followUpSnapshot[followUp.id] = followUp.message; });
        setEditFollowUps(followUpSnapshot);
        setFollowUpNewFiles({});
        setFollowUpRemoveFile({});
        setIsEditing(true);
    }

    function handleSaveEdit() {
        const dep1   = editDraft.dep2 === 'YES' ? 'YES' : (editDraft.dep1 ?? enquiry.dep1);
        const dep2   = editDraft.dep2 ?? enquiry.dep2;
        let   status = enquiry.status;
        if (dep1 === 'YES' && status === 'New') status = '1st Deposit';
        if (dep2 === 'YES') status = '2nd Deposit';

        const userId     = editDraft.user_id ? Number(editDraft.user_id) : null;
        const targetUser = users.find((user) => user.id === userId) ?? null;

        const payload = {
            name: editDraft.name, phone: editDraft.phone, email: editDraft.email,
            loc:  editDraft.loc,  date:  editDraft.date,  type:  editDraft.type,
            user_id: userId, source: editDraft.source, lead: editDraft.lead,
            notes: editDraft.notes, fu: editDraft.fu,
            dep1, dep2, status,
        };

        const optimisticFollowUps = enquiry.followUps.map((followUp) => ({
            ...followUp,
            message: editFollowUps[followUp.id] ?? followUp.message,
        }));
        onEnquiryChange({ ...enquiry, ...payload, user_id: userId, assignedUser: targetUser, followUps: optimisticFollowUps });
        setIsEditing(false);

        const enquiryId = enquiry.id;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

        const followUpPatches = enquiry.followUps
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

        Promise.all(followUpPatches).finally(() => {
            router.patch(`/enquiries/${enquiryId}`, payload, {
                preserveState: true,
                preserveScroll: true,
            });
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl animate-[slideUp_.2s_ease] rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Avatar name={enquiry.name} user={enquiry.assignedUser} />
                        <div>
                            <h2 className="font-semibold text-gray-900">
                                {isEditing ? 'Edit enquiry' : enquiry.name}
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {enquiry.assignedUser?.name ?? enquiry.rep ?? '—'} · {formatDate(enquiry.date)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && <StatusBadge status={enquiry.status} />}
                        <button
                            onClick={() => { onClose(); setIsEditing(false); }}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100 hover:cursor-pointer hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                {isEditing ? (
                    <div className="max-h-[74vh] space-y-4 overflow-y-auto p-6">
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
                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</label>
                            <input
                                type="email"
                                value={editDraft.email ?? ''}
                                onChange={(event) => setEditDraft((prev) => ({ ...prev, email: event.target.value }))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                            />
                        </div>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Type</label>
                                <select
                                    value={editDraft.type ?? ''}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, type: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                >
                                    {TYPE_OPTIONS.map((typeName) => (
                                        <option key={typeName}>{typeName}</option>
                                    ))}
                                </select>
                            </div>
                            {(isSuperAdmin || isAdmin) && (
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
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Source',      key: 'source', options: SOURCE_OPTIONS },
                                { label: 'Lead source', key: 'lead',   options: LEAD_OPTIONS },
                            ].map(({ label, key, options }) => (
                                <div key={key}>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
                                    <select
                                        value={editDraft[key] ?? ''}
                                        onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
                                    >
                                        {options.map((opt) => <option key={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Enquiry notes</label>
                            <textarea
                                value={editDraft.notes ?? ''}
                                onChange={(event) => setEditDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                rows={3}
                                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                            />
                        </div>
                        {enquiry.followUps.length > 0 && (
                            <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Notes Update ({enquiry.followUps.length})
                                </label>
                                <div className="space-y-2">
                                    {enquiry.followUps.map((followUp) => {
                                        const newFile    = followUpNewFiles[followUp.id] ?? null;
                                        const removing   = followUpRemoveFile[followUp.id] ?? false;
                                        const hasExisting = !!followUp.file_name && !removing && !newFile;
                                        return (
                                        <div key={followUp.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                                            <p className="mb-1 text-[11px] font-semibold text-gray-400">{followUp.user_name ?? formatDate(followUp.date)}</p>
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
                        {alertLevel !== 'ok' && (
                            <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${alertLevel === 'urgent' ? 'border-red-200 bg-red-50 text-red-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                                {alertLevel === 'urgent' ? <BellRing size={16} /> : <Clock size={16} />}
                                <span>
                                    <strong>{alertLevel === 'urgent' ? 'Overdue' : 'Warning'}:</strong>{' '}
                                    No response logged for {formatElapsed(enquiry.firstContactTimestamp)}
                                </span>
                            </div>
                        )}

                        {/* Contact + Enquiry grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contact</p>
                                <div className="space-y-1">
                                    {[
                                        { label: <span className="flex items-center gap-1.5"><Phone size={12} /> Phone</span>, value: enquiry.phone },
                                        { label: <span className="flex items-center gap-1.5"><Mail size={12} /> Email</span>, value: <span className="break-all text-xs">{enquiry.email}</span> },
                                        { label: 'Location', value: enquiry.loc },
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
                                        { label: 'Type',        value: <TypeBadge type={enquiry.type} /> },
                                        { label: 'Source',      value: enquiry.source },
                                        { label: 'Lead via',    value: enquiry.lead || enquiry.where_did_you_hear },
                                        { label: '1st Deposit', value: enquiry.dep1 === 'YES' ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Yes ✓</span> : 'No' },
                                        { label: '2nd Deposit', value: enquiry.dep2 === 'YES' ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">Yes ✓</span> : 'No' },
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
                                {enquiry.notes || enquiry.message || '—'}
                            </div>
                        </div>

                        {/* Follow-up history */}
                        <div>
                            <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Notes Update ({enquiry.followUps.length})
                            </p>
                            {enquiry.followUps.length > 0 ? (
                                <div className="space-y-2">
                                    {enquiry.followUps.map((followUp) => (
                                        <div key={followUp.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                            <div className="mb-0.5 flex items-center justify-between">
                                                <p className="text-[11px] font-semibold text-gray-400">{followUp.user_name ?? formatDate(followUp.date)}</p>
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
                            {enquiry.fu && (
                                <div className="mt-3 space-y-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Imported notes</p>
                                    {enquiry.fu.split('\n').filter(Boolean).map((line, index) => {
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
                                    {(isSuperAdmin || isAdmin) ? (
                                        <select
                                            value={String(enquiry.user_id ?? '')}
                                            onChange={(event) => handleUserAssign(event.target.value)}
                                            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-700 focus:outline-none"
                                        >
                                            <option value="">— Unassigned —</option>
                                            {users.map((user) => <option key={user.id} value={String(user.id)}>{user.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-xs font-medium text-gray-700">
                                            {enquiry.assignedUser?.name ?? enquiry.rep ?? '—'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {STATUSES.map((statusName) => {
                                    const cfg      = STATUS_COLORS[statusName] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
                                    const isActive = enquiry.status === statusName;
                                    return (
                                        <button
                                            key={statusName}
                                            onClick={() => handleStatusChange(statusName)}
                                            className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition hover:scale-105 hover:cursor-pointer ${cfg.bg} ${cfg.text} ${isActive ? 'ring-2 ring-blue-900 ring-offset-1' : 'border-transparent'}`}
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
                                Files &amp; attachments ({(enquiry.files ?? []).length})
                            </p>
                            {(enquiry.files ?? []).length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {(enquiry.files ?? []).map((storedFile, fileIndex) => {
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
                                                        href={`/enquiries/${enquiry.id}/files/${fileIndex}/download`}
                                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-400 transition hover:border-blue-300 hover:text-blue-600"
                                                        title="Download"
                                                    >
                                                        <Download size={13} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => deleteEnquiryFile(fileIndex)}
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-600 hover:cursor-pointer"
                                                    title="Remove"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div
                                onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setIsDragOver(false);
                                    uploadEnquiryFiles(event.dataTransfer.files);
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
                                    if (event.target.files) uploadEnquiryFiles(event.target.files);
                                    event.target.value = '';
                                }}
                            />
                        </div>

                        {/* Add update */}
                        {canEdit && <div>
                            <p className="mb-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Note Update</p>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <textarea
                                    value={newNoteText}
                                    onChange={(event) => setNewNoteText(event.target.value)}
                                    placeholder="Write your follow-up note here…"
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                                />
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
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:cursor-pointer hover:text-gray-800"
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
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-40 hover:cursor-pointer disabled:hover:cursor-not-allowed"
                                    >
                                        <Send size={14} /> {isSubmittingNote ? 'Saving…' : 'Save update'}
                                    </button>
                                </div>
                            </div>
                        </div>}
                    </div>
                )}

                {/* ── Footer ── */}
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
                            <div />
                            <div className="flex gap-2">
                                {canEdit && (
                                    <button
                                        onClick={openEditMode}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:cursor-pointer"
                                    >
                                        <Pencil size={14} /> Edit
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
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
    );
}
