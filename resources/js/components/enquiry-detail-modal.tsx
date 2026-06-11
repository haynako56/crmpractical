import React, { useState, useCallback } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Paperclip,
  Download,
  Trash2,
  Send,
  Calendar,
  FileText,
} from 'lucide-react';

interface File {
  name: string;
  size: number;
  date: string;
  dataUrl?: string;
  noteRef?: string;
}

interface Enquiry {
  id: number;
  date: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  lead: string;
  type: string;
  loc: string;
  rep: string;
  notes: string;
  fu: string;
  dep1: string;
  dep2: string;
  status: string;
  firstContactTimestamp: string;
  files: File[];
}

const STATUSES = ['New', 'Contacted', 'Meeting', '1st Deposit', '2nd Deposit', 'Closed', 'Lost'];
const STATUS_COLORS: Record<string, string> = {
  New: '#dbeafe text-blue-900',
  Contacted: '#fef3c7 text-yellow-900',
  Meeting: '#ede9fe text-purple-900',
  '1st Deposit': '#dcfce7 text-green-900',
  '2nd Deposit': '#d1fae5 text-teal-900',
  Closed: '#f3f4f6 text-gray-900',
  Lost: '#fee2e2 text-red-900',
};

interface EnquiryDetailModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: (enquiry: Enquiry) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

function getFileIcon(filename: string): string {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return '📄';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext || '')) return '🖼️';
  if (['doc', 'docx'].includes(ext || '')) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return '📊';
  return '📎';
}

export default function EnquiryDetailModal({ enquiry, onClose, onUpdate }: EnquiryDetailModalProps) {
  const [newNote, setNewNote] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [status, setStatus] = useState(enquiry.status);
  const [rep, setRep] = useState(enquiry.rep);

  const handleAddNote = () => {
    if (!newNote.trim() && pendingFiles.length === 0) return;

    const today = new Date().toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const noteText = newNote || (pendingFiles.length === 1 ? `File attached: ${pendingFiles[0].name}` : `Files attached: ${pendingFiles.map((f) => f.name).join(', ')}`);
    let noteEntry = `${today} - ${noteText}`;

    if (pendingFiles.length > 0) {
      noteEntry += ` [${pendingFiles.map((f) => '📎' + f.name).join(', ')}]`;
    }

    const updated = {
      ...enquiry,
      fu: enquiry.fu ? enquiry.fu + '\n' + noteEntry : noteEntry,
      files: [...enquiry.files, ...pendingFiles],
      firstContactTimestamp: new Date().toISOString(),
    };

    onUpdate(updated);
    setNewNote('');
    setPendingFiles([]);
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const today = new Date().toLocaleDateString('en-AU', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        });
        setPendingFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            date: today,
            dataUrl: e.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStatusChange = (newStatus: string) => {
    const updated = {
      ...enquiry,
      status: newStatus,
      firstContactTimestamp: new Date().toISOString(),
    };

    if (newStatus === '1st Deposit') {
      updated.dep1 = 'YES';
    } else if (newStatus === '2nd Deposit') {
      updated.dep1 = 'YES';
      updated.dep2 = 'YES';
    }

    onUpdate(updated);
    setStatus(newStatus);
  };

  const handleRepChange = (newRep: string) => {
    const today = new Date().toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const updated = {
      ...enquiry,
      rep: newRep,
      fu: enquiry.fu ? enquiry.fu + `\n${today} - Reassigned from ${enquiry.rep} to ${newRep}` : `${today} - Assigned to ${newRep}`,
    };

    onUpdate(updated);
    setRep(newRep);
  };

  const handleDownloadFile = (file: File) => {
    if (!file.dataUrl) return;
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    a.click();
  };

  const handleRemoveFile = (index: number) => {
    const updated = {
      ...enquiry,
      files: enquiry.files.filter((_, i) => i !== index),
    };
    onUpdate(updated);
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 pt-8">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-900">
              {enquiry.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{enquiry.name}</h2>
              <p className="text-sm text-gray-600">
                {rep} • {new Date(enquiry.date).toLocaleDateString('en-AU')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">{status}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
          {/* Contact Details */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-600">Contact</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-gray-900">{enquiry.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate text-gray-900">{enquiry.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-gray-900">{enquiry.loc}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-600">Enquiry Details</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-900">
                    {enquiry.type}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Source:</span>
                  <span className="ml-2 text-gray-900">{enquiry.source}</span>
                </div>
                <div>
                  <span className="text-gray-600">Lead via:</span>
                  <span className="ml-2 text-gray-900">{enquiry.lead}</span>
                </div>
                <div className="flex gap-2">
                  <div>
                    <span className="text-gray-600">1st deposit:</span>
                    <span className="ml-2 text-gray-900">{enquiry.dep1 === 'YES' ? '✓ Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">2nd deposit:</span>
                    <span className="ml-2 text-gray-900">{enquiry.dep2 === 'YES' ? '✓ Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enquiry Notes */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-gray-600">Enquiry notes</h3>
            <div className="mt-2 rounded bg-gray-50 p-3 text-sm text-gray-900">{enquiry.notes || 'No notes.'}</div>
          </div>

          {/* Follow-up History */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-gray-600">Follow-up history</h3>
            <div className="mt-2 space-y-3 text-sm">
              {enquiry.fu ? (
                enquiry.fu.split('\n').map((line, idx) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-gray-900">{line}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No follow-up notes yet.</p>
              )}
            </div>
          </div>

          {/* Status & Assignment */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-gray-600">Status & assignment</h3>
              <select
                value={rep}
                onChange={(e) => handleRepChange(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                <option value={rep}>{rep}</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                    status === s ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:opacity-80'
                  } ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-900'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Files */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-gray-600">Files & attachments ({enquiry.files.length})</h3>
            {enquiry.files.length > 0 && (
              <div className="mt-2 space-y-2">
                {enquiry.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded border border-gray-200 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFileIcon(file.name)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-600">
                          {formatBytes(file.size)} • {file.date}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-1 hover:text-blue-600"
                      >
                        <Download size={16} />
                      </button>
                      <button onClick={() => handleRemoveFile(idx)} className="p-1 hover:text-red-600">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
              <FileText size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-500">PDF, Word, Excel, images — max 10MB per file</p>
              <input
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="mt-2 hidden"
                accept="*"
              />
            </div>
          </div>

          {/* Add Note */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-gray-600">Add update</h3>
            <div className="mt-3 rounded-lg bg-gray-50 p-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write your follow-up note here..."
                className="w-full rounded border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                rows={4}
              />
              {pendingFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs"
                    >
                      <span>{getFileIcon(file.name)}</span>
                      <span>{file.name.length > 20 ? file.name.substring(0, 18) + '...' : file.name}</span>
                      <button
                        onClick={() => handleRemovePendingFile(idx)}
                        className="ml-1 text-gray-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex justify-between">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  <Paperclip size={14} className="inline mr-1" />
                  Attach file
                </button>
                <button
                  onClick={handleAddNote}
                  className="inline-flex items-center gap-2 rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  <Send size={14} />
                  Save update
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3">
          <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Edit</button>
          <button className="text-sm font-medium text-red-600 hover:text-red-700">Delete</button>
          <button
            onClick={onClose}
            className="ml-2 rounded bg-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
