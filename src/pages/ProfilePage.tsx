import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Employee, type Branch } from "@/store/data";

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  onUserChange: (user: Employee) => void;
  onNavigate: (page: string) => void;
}

export default function ProfilePage({ currentUser, branches, employees, onUserChange, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: currentUser.name, email: currentUser.email });

  function save() {
    onUserChange({ ...currentUser, name: form.name, email: form.email });
    setEditing(false);
  }

  const userBranches = branches.filter((b) => currentUser.branchIds.includes(b.id));
  const initials = currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      {/* Avatar + info */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="text-base font-semibold border border-border rounded px-3 py-1.5 outline-none focus:border-accent bg-background w-full"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="text-sm border border-border rounded px-3 py-1.5 outline-none focus:border-accent bg-background w-full"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={save} className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 font-medium">Сохранить</button>
                <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground px-3 py-1.5 rounded border border-border">Отмена</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-foreground">{currentUser.name}</h2>
                <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                  <Icon name="Pencil" size={13} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              <span className="inline-block mt-2 text-xs bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full font-medium">
                {currentUser.roleLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoCard icon="MapPin" label="Филиалы">
          <div className="flex flex-wrap gap-1.5 mt-2">
            {userBranches.map((b) => (
              <span key={b.id} className="text-xs bg-accent/10 text-accent px-2.5 py-0.5 rounded-full">
                {b.name}
              </span>
            ))}
          </div>
        </InfoCard>
        <InfoCard icon="Users" label="Коллеги">
          <div className="mt-2 space-y-1.5">
            {employees.filter((e) => e.id !== currentUser.id).slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground">
                  {e.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <span className="text-xs text-foreground">{e.name}</span>
                <span className="text-[10px] text-muted-foreground">{e.roleLabel}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Быстрые действия</p>
        <QuickAction icon="LayoutGrid" label="Мой планер" sub="Перейти к личным задачам" onClick={() => onNavigate("planner")} />
        <QuickAction icon="Users" label="Командный планер" sub="Посмотреть цели и задачи команды" onClick={() => onNavigate("team")} />
        <QuickAction icon="BarChart2" label="Статистика" sub="Конверсия и выполнение задач" onClick={() => onNavigate("statistics")} />
      </div>
    </div>
  );
}

function InfoCard({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={13} className="text-accent" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      {children}
    </div>
  );
}

function QuickAction({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-card hover:bg-muted/10 hover:border-accent/30 transition-all text-left group"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors">
        <Icon name={icon} size={14} className="text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Icon name="ChevronRight" size={13} className="ml-auto text-muted-foreground" />
    </button>
  );
}
