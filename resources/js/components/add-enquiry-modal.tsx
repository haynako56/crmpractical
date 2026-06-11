import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (enquiry: any) => void;
  reps: string[];
}

const ENQUIRY_TYPES = ['H&L', 'KDRB', 'Contract', 'Duplex', 'Custom Duplex', 'Dual Living', 'KDRB/Dual Living'];
const SOURCES = ['Email', 'Phone', 'Realestate.com', 'Display Home', 'Website', 'Facebook', 'Google', 'Signage', 'Referral', 'Other'];
const LEADS = ['Google', 'Facebook', 'Realestate.com', 'Display Home', 'Website', 'Signage', 'Referral', 'Friends', 'Other', 'N/A'];

export default function AddEnquiryModal({ isOpen, onClose, onAdd, reps }: AddEnquiryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    loc: '',
    date: new Date().toISOString().split('T')[0],
    type: 'H&L',
    rep: reps[0] || '',
    source: 'Email',
    lead: 'Google',
    notes: '',
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Please enter a client name');
      return;
    }

    onAdd({
      id: Date.now(),
      ...formData,
      fu: '',
      dep1: 'NO',
      dep2: 'NO',
      status: 'New',
      firstContactTimestamp: new Date().toISOString(),
      files: [],
    });

    setFormData({
      name: '',
      phone: '',
      email: '',
      loc: '',
      date: new Date().toISOString().split('T')[0],
      type: 'H&L',
      rep: reps[0] || '',
      source: 'Email',
      lead: 'Google',
      notes: '',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4 pt-8">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">New enquiry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Client name *</label>
              <input
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Phone</label>
              <input
                type="text"
                placeholder="04xx xxx xxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase text-gray-600">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Location / postcode</label>
              <input
                type="text"
                placeholder="2179 - Austral"
                value={formData.loc}
                onChange={(e) => setFormData({ ...formData, loc: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Interest in</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {ENQUIRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Sales rep</label>
              <select
                value={formData.rep}
                onChange={(e) => setFormData({ ...formData, rep: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {reps.map((rep) => (
                  <option key={rep} value={rep}>
                    {rep}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Lead source</label>
              <select
                value={formData.lead}
                onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {LEADS.map((lead) => (
                  <option key={lead} value={lead}>
                    {lead}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase text-gray-600">Enquiry notes</label>
            <textarea
              placeholder="Lot address, home design interest, budget…"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Save enquiry
          </button>
        </div>
      </div>
    </div>
  );
}
