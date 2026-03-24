import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { formatMonthYear, DEFAULT_PERMISSIONS, type Employee } from "@/store/data";
import { type ProjectInfo } from "@/store/persist";

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: "planner", label: "Мой планер", icon: "LayoutGrid" },
  { id: "team", label: "Командный", icon: "Users" },
  { id: "management", label: "Управление", icon: "Settings2" },
  { id: "statistics", label: "Статистика", icon: "BarChart2" },
  { id: "notes", label: "Заметки", icon: "StickyNote" },
  { id: "files", label: "Файлы", icon: "FolderOpen" },
  { id: "profile", label: "Профиль", icon: "User" },
];

interface LayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: Employee;
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onLogout: () => void;
  projectInfo?: ProjectInfo | null;
  children: React.ReactNode;
}

export default function Layout({
  activePage,
  onNavigate,
  currentUser,
  currentMonth,
  onMonthChange,
  onLogout,
  projectInfo,
  children,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const perms = currentUser.role === "director"
    ? { canViewTeamPlanner: true, canManageTeamGoals: true }
    : currentUser.permissions || DEFAULT_PERMISSIONS;

  const NAV_ITEMS = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.id === "team" && !perms.canViewTeamPlanner) return false;
      return true;
    });
  }, [perms.canViewTeamPlanner]);

  function prevMonth() {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const initials = currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const activeLabel = NAV_ITEMS.find((n) => n.id === activePage)?.label ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar transition-all duration-300 flex-shrink-0 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <Icon name="Zap" size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sidebar-primary text-sm tracking-tight block truncate">
                {projectInfo?.name || "Планер"}
              </span>
              {projectInfo && (
                <span className="text-[10px] text-sidebar-foreground/60 font-mono">{projectInfo.inviteCode}</span>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-sidebar-foreground hover:text-sidebar-primary transition-colors flex-shrink-0"
          >
            <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                activePage === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon name={item.icon} size={16} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => onNavigate("profile")}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded hover:bg-sidebar-accent/40 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-accent text-xs font-semibold">
              {initials}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 text-left">
                <p className="text-sidebar-primary text-xs font-medium truncate">{currentUser.name}</p>
                <p className="text-sidebar-foreground text-xs truncate opacity-60">{currentUser.roleLabel}</p>
              </div>
            )}
          </button>
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sidebar-foreground hover:bg-destructive/10 hover:text-red-400 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Icon name="LogOut" size={14} className="flex-shrink-0" />
            {!collapsed && <span className="text-xs">Выйти</span>}
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center px-4 md:px-6 gap-3 bg-card flex-shrink-0">

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <Icon name="Menu" size={18} />
          </button>

          <h1 className="font-semibold text-sm text-foreground truncate">{activeLabel}</h1>

          {(activePage === "planner" || activePage === "team") && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon name="ChevronLeft" size={14} />
              </button>
              <span className="text-xs md:text-sm font-medium min-w-[90px] md:min-w-[130px] text-center">
                {formatMonthYear(currentMonth)}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon name="ChevronRight" size={14} />
              </button>
            </div>
          )}

          {activePage !== "planner" && activePage !== "team" && <div className="ml-auto" />}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            {currentUser.roleLabel}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-stretch">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
              activePage === item.id
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={item.icon} size={18} />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Mobile Slide-out Menu ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-sidebar flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
              <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
                <Icon name="Zap" size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sidebar-primary text-sm block truncate">{projectInfo?.name || "Планер"}</span>
                {projectInfo && (
                  <span className="text-[10px] text-sidebar-foreground/60 font-mono">{projectInfo.inviteCode}</span>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="ml-auto text-sidebar-foreground hover:text-sidebar-primary flex-shrink-0"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* User card */}
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                  {initials}
                </div>
                <div>
                  <p className="text-sidebar-primary text-sm font-medium">{currentUser.name}</p>
                  <p className="text-sidebar-foreground text-xs opacity-60">{currentUser.roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded text-sm transition-colors ${
                    activePage === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-sidebar-border">
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sidebar-foreground hover:bg-destructive/10 hover:text-red-400 transition-colors"
              >
                <Icon name="LogOut" size={16} />
                <span className="text-sm">Выйти из системы</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}