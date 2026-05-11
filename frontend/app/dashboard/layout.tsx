"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import api from "@/lib/api";
import ThemeToggle from "@/components/theme-toggle";
import { APP_VERSION } from "@/lib/version";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/videos",
    label: "Daftar Video",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/upload",
    label: "Upload Video",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/review",
    label: "Antrian Review",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/users",
    label: "Manajemen User",
    superadminOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

function NavItems({
  pathname,
  isSuperadmin,
  pendingCount,
  onNavigate,
}: {
  pathname: string;
  isSuperadmin: boolean;
  pendingCount: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV.map((item) => {
        if (item.superadminOnly && !isSuperadmin) return null;
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const isReview = item.href === "/dashboard/review";
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <span className={active ? "text-primary-foreground" : "text-muted-foreground"}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {isReview && pendingCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${active ? "bg-white/20 text-white" : "bg-yellow-400/20 text-yellow-400"}`}>
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </a>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    api.get("/review/queue/pending-count").then(({ data }) => setPendingCount(data.count)).catch(() => {});
    api.get("/auth/me").then(({ data }) => setIsSuperadmin(data.is_superadmin)).catch(() => {});
  }, [pathname]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-none">Plate Detection</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tax Checker System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItems
          pathname={pathname}
          isSuperadmin={isSuperadmin}
          pendingCount={pendingCount}
          onNavigate={() => setDrawerOpen(false)}
        />
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Tampilan</span>
          <ThemeToggle />
        </div>
        <div className="px-3 pb-1">
          <span className="text-xs text-muted-foreground/50">v{APP_VERSION}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <span className="font-bold text-sm text-foreground truncate">Plate Detection</span>
          </div>
          {pendingCount > 0 && (
            <a href="/dashboard/review" className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400">
              {pendingCount > 99 ? "99+" : pendingCount}
            </a>
          )}
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
