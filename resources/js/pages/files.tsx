import { Head, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Download, File, FileImage, FileText, Search, X } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { Auth } from '@/types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileItem {
    id: string;
    type: 'enquiry' | 'followup';
    name: string;
    size: number | null;
    date: string | null;
    sort_date: string;
    enquiry_id: number;
    enquiry_name: string;
    download_url: string;
}

interface PageProps extends Record<string, unknown> {
    files: FileItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1_048_576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1_048_576).toFixed(1) + ' MB';
}

function getFileIcon(fileName: string | null) {
    const ext = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf')
        return { bg: 'bg-red-100 text-red-600', icon: <FileText size={15} /> };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext))
        return { bg: 'bg-blue-100 text-blue-600', icon: <FileImage size={15} /> };
    if (['doc', 'docx'].includes(ext))
        return { bg: 'bg-purple-100 text-purple-600', icon: <FileText size={15} /> };
    if (['xls', 'xlsx', 'csv'].includes(ext))
        return { bg: 'bg-green-100 text-green-600', icon: <FileText size={15} /> };
    return { bg: 'bg-gray-100 text-gray-500', icon: <File size={15} /> };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FilesPage() {
    const { files } = usePage<PageProps>().props;
    const { auth } = usePage<{ auth: Auth }>().props;
    const isSales = !auth.isSuperAdmin && !auth.isAdmin;

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'enquiry' | 'followup'>('all');

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return files.filter((fileItem) => {
            if (typeFilter !== 'all' && fileItem.type !== typeFilter) return false;
            if (!term) return true;
            return (
                fileItem.name?.toLowerCase().includes(term) ||
                fileItem.enquiry_name?.toLowerCase().includes(term)
            );
        });
    }, [files, search, typeFilter]);

    return (
        <>
            <Head title="Files" />

            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Files</h1>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {isSales ? 'Files from your assigned enquiries' : 'All uploaded files'}
                            {' · '}
                            {filtered.length} {filtered.length === 1 ? 'file' : 'files'}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by file name or client…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-700 focus:outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                        {(['all', 'enquiry', 'followup'] as const).map((filterOption) => (
                            <button
                                key={filterOption}
                                onClick={() => setTypeFilter(filterOption)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                    typeFilter === filterOption
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {filterOption === 'all' ? 'All' : filterOption === 'enquiry' ? 'Enquiry files' : 'Follow-up files'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">No files found</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 font-semibold text-gray-600">File</th>
                                    <th className="hidden px-4 py-3 font-semibold text-gray-600 sm:table-cell">Client</th>
                                    <th className="hidden px-4 py-3 font-semibold text-gray-600 md:table-cell">Type</th>
                                    <th className="hidden px-4 py-3 font-semibold text-gray-600 lg:table-cell">Size</th>
                                    <th className="hidden px-4 py-3 font-semibold text-gray-600 lg:table-cell">Date</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((fileItem) => {
                                    const iconConfig = getFileIcon(fileItem.name);
                                    return (
                                        <tr key={fileItem.id} className="transition hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconConfig.bg}`}>
                                                        {iconConfig.icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-gray-900">{fileItem.name ?? '—'}</p>
                                                        <p className="text-xs text-gray-400 sm:hidden">{fileItem.enquiry_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden px-4 py-3 text-gray-700 sm:table-cell">
                                                {fileItem.enquiry_name}
                                            </td>
                                            <td className="hidden px-4 py-3 md:table-cell">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    fileItem.type === 'enquiry'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-purple-50 text-purple-700'
                                                }`}>
                                                    {fileItem.type === 'enquiry' ? 'Enquiry' : 'Follow-up'}
                                                </span>
                                            </td>
                                            <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                                                {formatBytes(fileItem.size)}
                                            </td>
                                            <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                                                {fileItem.date ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <a
                                                    href={fileItem.download_url}
                                                    download
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                                                >
                                                    <Download size={13} /> Download
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}

FilesPage.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
