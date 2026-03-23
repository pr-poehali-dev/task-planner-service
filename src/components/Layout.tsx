import { useState } from "react";
import Icon from "@/components/ui/icon";
import { formatMonthYear, type Employee } from "@/store/data";

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "planner", label: "Мой планер", icon: "LayoutGrid" },
  { id: "team", label: "Командный планер", icon: "Users" },
  { id: "management", label: "Управление", icon: "Settings2" },
  { id: "statistics", label: "Статистика", icon: "BarChart2" },
  { id: "profile", label: "Профиль", icon: "User" },
];

interface LayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: Employee;
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({
  activePage,
  onNavigate,
  currentUser,
  currentMonth,
  onMonthChange,
  onLogout,
  children,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        } flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <Icon name="Zap" size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-primary text-sm tracking-tight">
              Планер
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-sidebar-foreground hover:text-sidebar-primary transition-colors"
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
                <p className="text-sidebar-primary text-xs font-medium truncate">
                  {currentUser.name}
                </p>
                <p className="text-sidebar-foreground text-xs truncate opacity-60">
                  {currentUser.roleLabel}
                </p>
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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-card flex-shrink-0">
          <h1 className="font-semibold text-sm text-foreground">
            {NAV_ITEMS.find((n) => n.id === activePage)?.label}
          </h1>

          {(activePage === "planner" || activePage === "team") && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon name="ChevronLeft" size={14} />
              </button>
              <span className="text-sm font-medium min-w-[130px] text-center">
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

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            {currentUser.roleLabel}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
