"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { toast } from 'react-hot-toast';

import Logo from '@/components/Logo';
import AdminNotificationsPopover from '@/components/admin/AdminNotificationsPopover';
import AdminCommandCentre from '@/components/admin/AdminCommandCentre';
import { AdminPermission, hasAdminPermission } from '@/lib/admin-permissions';
import AdminHelpDrawer from '@/components/admin/AdminHelpDrawer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { unreadNotificationsCount } = useOrders();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!showProfileMenu) return;
        const closeMenu = (event: MouseEvent | KeyboardEvent) => {
            if (event instanceof KeyboardEvent && event.key === 'Escape') return setShowProfileMenu(false);
            if (event instanceof MouseEvent && !profileMenuRef.current?.contains(event.target as Node)) setShowProfileMenu(false);
        };
        document.addEventListener('mousedown', closeMenu);
        document.addEventListener('keydown', closeMenu);
        return () => { document.removeEventListener('mousedown', closeMenu); document.removeEventListener('keydown', closeMenu); };
    }, [showProfileMenu]);

    // On desktop (md+), start the sidebar open by default
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };
        handleResize(); // Run on mount
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { isLoading, isAuthenticated, isAdmin } = useAuth(); // Destructure isAdmin and loading state

    React.useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (!isAdmin) {
                router.push('/dashboard/user'); // Redirect normal users to their dashboard
                toast.error("Access Denied: Admin privileges required.");
            }
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagri-primary"></div>
        </div>;
    }

    const menuItems = [
        {
            name: 'Overview', href: '/dashboard/admin', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            name: 'Analytics', href: '/dashboard/admin/analytics', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 13l3-3 4 4 5-5" />
                </svg>
            )
        },
        {
            name: 'Reports', href: '/dashboard/admin/reports', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
        {
            name: 'Inventory', href: '/dashboard/admin/inventory', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        },
        {
            name: 'Orders', href: '/dashboard/admin/orders', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            )
        },
        {
            name: 'Payments', href: '/dashboard/admin/payments', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm2 8h4" />
                </svg>
            )
        },
        {
            name: 'Operations', href: '/dashboard/admin/operations', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.85-2.75L13.85 4.25a2 2 0 00-3.7 0L3.15 16.25A2 2 0 005 19z" />
                </svg>
            )
        },
        {
            name: 'Intel Health', href: '/dashboard/admin/intelligence-health', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l3-8 4 16 3-8h4" /></svg>
            )
        },
        {
            name: 'Audit Log', href: '/dashboard/admin/audit-log', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6m2 13H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" /></svg>
            )
        },
        {
            name: 'Action Centre', href: '/dashboard/admin/action-centre', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            )
        },
        {
            name: 'Automations', href: '/dashboard/admin/automations', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4H6a2 2 0 00-2 2v4m16 0V6a2 2 0 00-2-2h-4m0 16h4a2 2 0 002-2v-4M4 14v4a2 2 0 002 2h4m-1-8h6m-3-3v6" /></svg>
            )
        },
        {
            name: 'Products', href: '/dashboard/admin/products', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        },
        {
            name: 'Product Intel', href: '/dashboard/admin/product-intelligence', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            )
        },
        {
            name: 'Customer Intel', href: '/dashboard/admin/intelligence', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            name: 'Newsletter', href: '/dashboard/admin/newsletter', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
            )
        },
        {
            name: 'Discounts', href: '/dashboard/admin/discounts', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
            )
        },
        {
            name: 'Logistics', href: '/dashboard/admin/logistics', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1-1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2" />
                </svg>
            )
        },
        {
            name: 'Reviews', href: '/dashboard/admin/reviews', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            )
        },
        {
            name: 'CMS', href: '/dashboard/admin/cms', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
    ];

    const navGroup = (href: string) => {
        if (href === '/dashboard/admin' || href.includes('action-centre')) return 'Overview';
        if (/orders|payments|fulfillment/.test(href)) return 'Commerce';
        if (/products|inventory|discounts|reviews/.test(href)) return 'Catalogue';
        if (/newsletter|messages/.test(href)) return 'Customers';
        if (/analytics|reports|intelligence/.test(href) && !href.includes('intelligence-health')) return 'Intelligence';
        if (/logistics|operations/.test(href)) return 'Operations';
        return 'System';
    };
    const isActive = (href: string) => href === '/dashboard/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    const groupOrder = ['Overview', 'Commerce', 'Catalogue', 'Customers', 'Intelligence', 'Operations', 'System'];
    const permissionForHref = (href: string): AdminPermission | null => {
        if (/orders|fulfillment|operations|logistics|action-centre/.test(href)) return 'orders.manage';
        if (/payments|mpesa/.test(href)) return 'payments.manage';
        if (/products|inventory|discounts|reviews/.test(href)) return 'catalogue.manage';
        if (/newsletter|cms|messages/.test(href)) return 'marketing.manage';
        if (/analytics|reports|intelligence|audit-log/.test(href)) return 'analytics.view';
        if (/settings|automations/.test(href)) return 'settings.manage';
        return null;
    };
    const groupedMenuItems = menuItems.filter((item) => {
        const permission = permissionForHref(item.href);
        return !permission || hasAdminPermission(user?.role, user?.adminPermissions, permission);
    }).sort((a, b) => groupOrder.indexOf(navGroup(a.href)) - groupOrder.indexOf(navGroup(b.href)));
    const closeSidebarOnMobile = () => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans">
            {/* Sidebar Backdrop (Mobile only) */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside aria-label="Admin navigation" className={`bg-gradient-to-b from-slate-900 to-slate-950 text-white transition-[width,transform] duration-300 ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'} flex flex-col fixed h-dvh z-30 shadow-2xl overflow-hidden`}>
                <div className={`relative flex h-20 shrink-0 items-center border-b border-white/5 ${isSidebarOpen ? 'justify-between px-5' : 'justify-center px-2'}`}>
                    {isSidebarOpen ? (
                        <Logo light />
                    ) : (
                        <div className="hidden md:block">
                            <Logo iconOnly light />
                        </div>
                    )}
                    <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label={isSidebarOpen ? 'Collapse admin navigation' : 'Expand admin navigation'} aria-expanded={isSidebarOpen} className={`text-gray-400 hover:text-white bg-white/5 rounded-lg transition-colors md:flex hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 ${isSidebarOpen ? 'p-2' : 'absolute bottom-1 right-1 p-1'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {/* Mobile Close Button */}
                    <button type="button" aria-label="Close admin navigation" onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg transition-colors md:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="min-h-0 flex-grow overflow-y-auto py-3 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
                    <ul className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
                        {groupedMenuItems.map((item, index) => (
                            <React.Fragment key={item.name}>
                            {(index === 0 || navGroup(groupedMenuItems[index - 1].href) !== navGroup(item.href)) && isSidebarOpen && <li className="px-4 pb-1 pt-4 text-[9px] font-black uppercase tracking-[.2em] text-gray-600">{navGroup(item.href)}</li>}
                            <li>
                                <Link
                                    href={item.href}
                                    onClick={closeSidebarOnMobile}
                                    aria-current={isActive(item.href) ? 'page' : undefined}
                                    title={!isSidebarOpen ? item.name : undefined}
                                    className={`flex min-h-11 items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} ${isActive(item.href)
                                        ? 'bg-melagri-primary text-white shadow-lg shadow-melagri-primary/20'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        }`}
                                >
                                    <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                                    {isSidebarOpen && <span className="min-w-0 truncate font-medium">{item.name}</span>}
                                </Link>
                            </li>
                            </React.Fragment>
                        ))}
                    </ul>
                </nav>

                <div className={`shrink-0 border-t border-gray-800 ${isSidebarOpen ? 'p-4' : 'p-2'}`}>
                    <Link
                        href="/"
                        onClick={closeSidebarOnMobile}
                        aria-label="View storefront"
                        title={!isSidebarOpen ? 'View storefront' : undefined}
                        className={`mb-1 flex min-h-11 w-full items-center rounded-xl text-gray-300 transition-colors hover:bg-gray-800 hover:text-white ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center px-2'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7" /></svg>
                        {isSidebarOpen && <span>View storefront</span>}
                    </Link>
                    <button
                        onClick={() => { logout(); router.push('/auth/login'); }}
                        aria-label="Log out"
                        title={!isSidebarOpen ? 'Log out' : undefined}
                        className={`flex min-h-11 items-center text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-xl w-full transition-colors ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center px-2'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-[margin] duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'} ml-0 min-w-0`}>
                {/* Topbar */}
                <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 h-20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {/* Mobile Toggle */}
                        <button type="button" aria-label="Open admin navigation"
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        
                        <div className="hidden flex-col min-[420px]:flex">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">System Live</span>
                            </div>
                            <div className="text-gray-400 text-[10px] md:text-xs font-medium truncate max-w-[120px] md:max-w-none">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div className="mx-2 flex min-w-0 flex-1 justify-center md:mx-8">
                        <AdminCommandCentre />
                    </div>

                    <div className="flex shrink-0 items-center gap-2 md:gap-6">
                        <AdminHelpDrawer />
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all relative group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center animate-bounce">
                                        {unreadNotificationsCount}
                                    </span>
                                )}
                            </button>

                            <AdminNotificationsPopover
                                isOpen={showNotifications}
                                onClose={() => setShowNotifications(false)}
                            />
                        </div>

                        <div ref={profileMenuRef} className="relative md:pl-6 md:border-l border-gray-100">
                            <button type="button" onClick={() => setShowProfileMenu((value) => !value)} aria-expanded={showProfileMenu} aria-haspopup="menu" className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 md:gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-black text-gray-900 leading-none mb-1">{user?.name?.split(' ')[0] || 'Admin'}</div>
                                <div className="text-[10px] font-bold text-melagri-primary uppercase tracking-tighter">Admin</div>
                            </div>
                            <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-600 font-black shadow-inner border border-white text-sm md:text-base">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            </button>
                            {showProfileMenu && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl"><div className="border-b border-gray-100 px-3 py-2 sm:hidden"><p className="truncate text-sm font-black text-gray-900">{user?.name || 'Admin'}</p><p className="truncate text-xs text-gray-500">{user?.email}</p></div><Link role="menuitem" href="/" onClick={() => setShowProfileMenu(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-800"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" /></svg>View storefront</Link><Link role="menuitem" href="/dashboard/user" onClick={() => setShowProfileMenu(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-gray-700 hover:bg-gray-50"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1 1 18.88 17.8M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>My account</Link><button role="menuitem" type="button" onClick={() => { setShowProfileMenu(false); logout(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-red-600 hover:bg-red-50"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m17 16 4-4m0 0-4-4m4 4H7" /></svg>Log out</button></div>}
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
