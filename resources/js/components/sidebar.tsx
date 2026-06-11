import React, { useState } from 'react';
import { Menu, X, Home, Bell, Users, Target, DollarSign, BarChart3, PieChart } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';

interface SidebarNavProps {
  onLinkClick?: () => void;
}

const navItems = [
  { icon: Home, label: 'Enquiries', href: '/enquiries', group: 'Main' },
  { icon: Bell, label: 'Alerts', href: '/alerts', group: 'Main' },
  { icon: Users, label: 'Team', href: '/team', group: 'Main' },
  { icon: Target, label: 'Leads', href: '/leads', group: 'Main' },
  { icon: DollarSign, label: 'Deposits', href: '/deposits', group: 'Main' },
  { icon: BarChart3, label: 'Reports', href: '/reports', group: 'Reports' },
  { icon: PieChart, label: 'Status Report', href: '/status-report', group: 'Reports' },
];

export default function Sidebar({ onLinkClick }: SidebarNavProps) {
  const { url } = usePage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    if (onLinkClick) onLinkClick();
    setIsOpen(false);
  };

  const isActive = (href: string) => url === href || url.startsWith(href + '/');

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-blue-900 p-2 text-white md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-45 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 overflow-y-auto bg-blue-900 transform transition-transform duration-200 md:relative md:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-blue-800 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-800">
              <Home size={20} className="text-blue-200" />
            </div>
            <h1 className="font-serif text-lg font-light text-white">Practical Homes</h1>
            <p className="text-xs text-blue-300">Sales CRM • 2026</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navItems.reduce(
              (acc, item) => {
                const group = item.group;
                let section = acc.find((s) => s.group === group);

                if (!section) {
                  section = { group, items: [] };
                  acc.push(section);
                }

                section.items.push(item);
                return acc;
              },
              [] as Array<{ group: string; items: typeof navItems }>
            ).map((section) => (
              <div key={section.group}>
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
                  {section.group}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-800 text-white'
                          : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-blue-800 px-4 py-3 text-xs text-blue-300">
            Practical Homes Pty Ltd • Sydney NSW
          </div>
        </div>
      </aside>
    </>
  );
}
