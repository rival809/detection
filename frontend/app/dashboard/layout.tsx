"use client";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/dashboard/videos", label: "Daftar Video", icon: "▶" },
  { href: "/dashboard/upload", label: "Upload Video", icon: "↑" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-gray-900 text-sm leading-tight">
            Plate Detection<br />
            <span className="text-xs font-normal text-gray-500">Tax Checker System</span>
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span>→</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
