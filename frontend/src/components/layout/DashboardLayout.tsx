import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguageSwitch from "@/components/LanguageSwitch";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navItems = [
    { path: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard },
    { path: "/inbox", label: t("sidebar.inbox"), icon: MessageSquare },
    { path: "/groups", label: t("sidebar.groups"), icon: Users },
    { path: "/billing", label: t("sidebar.billing"), icon: CreditCard },
    { path: "/settings", label: t("sidebar.settings"), icon: Settings },
  ];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarWidth = collapsed && !isMobile ? 68 : 260;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
          isMobile ? "w-[260px]" : (collapsed ? "w-[68px]" : "w-[260px]"),
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 border-b border-border flex-shrink-0 px-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            {(!collapsed || isMobile) && (
              <span className="font-semibold text-base tracking-tight truncate">
                WA SaaS
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search bar (desktop, not collapsed) */}
        {!collapsed && !isMobile && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-background text-sm text-muted-foreground cursor-pointer hover:border-foreground/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span className="flex-1">Pesquisar...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors px-3 py-2.5",
                      (collapsed && !isMobile) && "justify-center px-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {(!collapsed || isMobile) && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border flex-shrink-0 px-3 py-3">
          {/* Theme switch + Collapse toggle */}
          <div className={cn(
            "flex items-center mb-3",
            (collapsed && !isMobile) ? "justify-center" : "justify-between"
          )}>
            <div className="flex items-center gap-1">
              <LanguageSwitch />
              <ThemeSwitch />
            </div>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              </button>
            )}
          </div>

          {/* User section */}
          <div className={cn(
            "flex items-center",
            (collapsed && !isMobile) ? "justify-center" : "gap-3"
          )}>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {(!collapsed || isMobile) && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                  title={t("sidebar.logout")}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
            {(collapsed && !isMobile) && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                title={t("sidebar.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: !isMobile ? sidebarWidth : 0 }}
      >
        {/* Top bar */}
        <header className="flex items-center h-16 px-4 border-b border-border bg-card lg:px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 mr-2 rounded-md hover:bg-accent text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold truncate">
            {navItems.find(
              (n) =>
                n.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(n.path)
            )?.label || "Dashboard"}
          </h2>
          <div className="ml-auto lg:hidden">
            <ThemeSwitch />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
