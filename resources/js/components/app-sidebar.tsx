import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Bell, Users, Target, DollarSign, BarChart3, PieChart, ClipboardList, RefreshCw, Paperclip, House } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/ui/sidebar';
import type { Auth, NavItem } from '@/types';

const reportNavItems: NavItem[] = [
    { title: 'Reports',       href: '/reports',       icon: BarChart3      },
    { title: 'Status Report', href: '/status-report', icon: PieChart       },
    { title: 'Rep Report',    href: '/rep-report',    icon: ClipboardList  },
    { title: 'Display Homes', href: '/display-homes', icon: House          },
];

export function AppSidebar() {
    const { alertCount, auth } = usePage<{ alertCount: number; auth: Auth }>().props;

    const isSales = !auth.isSuperAdmin && !auth.isAdmin;

    const mainNavItems: NavItem[] = [
        { title: 'Enquiries', href: '/enquiries', icon: LayoutGrid },
        { title: 'Alerts',    href: '/alerts',    icon: Bell, badge: alertCount ?? 0 },
        ...(!isSales ? [{ title: 'Team', href: '/team', icon: Users } as NavItem] : []),
        { title: 'Leads',     href: '/leads',      icon: Target      },
        { title: 'Deposits',  href: '/deposits',   icon: DollarSign  },
        { title: 'Files',     href: '/files',      icon: Paperclip   },
    ];

    const adminNavItems: NavItem[] = auth.isSuperAdmin
        ? [{ title: 'CF7 Sync', href: '/cf7-sync', icon: RefreshCw }]
        : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-b border-white/[0.08] px-5 pb-5 pt-6">
                <Link href="/enquiries" prefetch>
                    <AppLogo />
                </Link>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label="Main" />
                <NavMain items={reportNavItems} label="Reports" />
                {auth.isSuperAdmin && (
                    <NavMain items={adminNavItems} label="Admin" />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
