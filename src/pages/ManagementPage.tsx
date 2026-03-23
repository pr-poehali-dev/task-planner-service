import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  type Employee,
  type Branch,
  type Category,
} from "@/store/data";

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  passwords: Record<string, string>;
  onBranchesChange: (b: Branch[]) => void;
  onEmployeesChange: (e: Employee[]) => void;
  onCategoriesChange: (c: Category[]) => void;
  onPasswordChange: (empId: string, password: string) => void;
}

type ManagementTab = "employees" | "branches" | "categories" | "roles";

export default function ManagementPage({
  currentUser,
  branches,
  employees,
  categories,
  passwords,
  onBranchesChange,
  onEmployeesChange,
  onCategoriesChange,
  onPasswordChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<ManagementTab>("employees");
  const isDirector = currentUser.role === "director";

  const tabs: { id: ManagementTab; label: string; icon: string }[] = [
    { id: "employees", label: "Сотрудники", icon: "Users" },
    { id: "branches", label: "Филиалы", icon: "MapPin" },
    { id: "categories", label: "Категории", icon: "Tag" },
    ...(isDirector ? [{ id: "roles" as ManagementTab, label: "Роли и доступ", icon: "Shield" }] : []),
  ];

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tabs */}
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 border-b border-border flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={tab.icon} size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === "employees" && (
          <EmployeesTab
            employees={employees}
            branches={branches}
            onEmployeesChange={onEmployeesChange}
            isDirector={isDirector}
          />
        )}
        {activeTab === "branches" && (
          <BranchesTab
            branches={branches}
            onBranchesChange={onBranchesChange}
            isDirector={isDirector}
          />
        )}
        {activeTab === "categories" && (
          <CategoriesTab
            categories={categories}
            onCategoriesChange={onCategoriesChange}
            isDirector={isDirector}
          />
        )}
        {activeTab === "roles" && isDirector && (
          <RolesTab
            employees={employees}
            passwords={passwords}
            onEmployeesChange={onEmployeesChange}
            onPasswordChange={onPasswordChange}
          />
        )}
      </div>
    </div>
  );
}

// ─── Employees ──────────────────────────────────────────────────────────────

const PRESET_ROLES = [
  { value: "director", label: "Директор" },
  { value: "manager", label: "Управляющий" },
  { value: "marketer", label: "Маркетолог" },
  { value: "custom", label: "Другое" },
];

function EmployeesTab({
  employees,
  branches,
  onEmployeesChange,
  isDirector,
}: {
  employees: Employee[];
  branches: Branch[];
  onEmployeesChange: (e: Employee[]) => void;
  isDirector: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "custom" as string,
    roleLabel: "",
    branchIds: [] as string[],
  });
  const [editingBranchesId, setEditingBranchesId] = useState<string | null>(null);

  function saveNew() {
    if (!form.name.trim()) return;
    const preset = PRESET_ROLES.find((r) => r.value === form.role);
    const emp: Employee = {
      id: `e_${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      roleLabel: form.role === "custom" ? (form.roleLabel || "Сотрудник") : (preset?.label || "Сотрудник"),
      role: form.role,
      branchIds: form.branchIds,
    };
    onEmployeesChange([...employees, emp]);
    setForm({ name: "", email: "", role: "custom", roleLabel: "", branchIds: [] });
    setAdding(false);
  }

  function deleteEmployee(id: string) {
    onEmployeesChange(employees.filter((e) => e.id !== id));
  }

  function toggleBranchForEmp(branchId: string, checked: boolean, empId: string) {
    onEmployeesChange(
      employees.map((e) =>
        e.id !== empId
          ? e
          : {
              ...e,
              branchIds: checked
                ? [...e.branchIds, branchId]
                : e.branchIds.filter((b) => b !== branchId),
            }
      )
    );
  }

  const roleColors: Record<string, string> = {
    director: "bg-destructive/10 text-destructive",
    manager: "bg-accent/10 text-accent",
    marketer: "bg-success/10 text-success",
    custom: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Сотрудники ({employees.length})</h2>
        {isDirector && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 transition-opacity font-medium"
          >
            <Icon name="UserPlus" size={13} />
            Добавить
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-accent/30 rounded-lg p-4 bg-accent/3 space-y-3 animate-fade-in">
          <p className="text-xs font-semibold text-foreground">Новый сотрудник</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              autoFocus
              placeholder="Полное имя"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value, roleLabel: "" }))}
              className="text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background"
            >
              {PRESET_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {form.role === "custom" && (
              <input
                placeholder="Название должности"
                value={form.roleLabel}
                onChange={(e) => setForm((p) => ({ ...p, roleLabel: e.target.value }))}
                className="text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background"
              />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Филиалы</p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.branchIds.includes(b.id)}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        branchIds: e.target.checked
                          ? [...p.branchIds, b.id]
                          : p.branchIds.filter((id) => id !== b.id),
                      }))
                    }
                    className="rounded border-border"
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveNew} className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 font-medium">
              Сохранить
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded border border-border"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {employees.map((emp) => {
          const isEditingBranches = editingBranchesId === emp.id;
          return (
            <div
              key={emp.id}
              className="border border-border rounded-lg bg-card overflow-hidden group hover:border-border transition-colors"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                  {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{emp.name}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColors[emp.role] || roleColors.custom}`}>
                      {emp.roleLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isDirector && (
                    <button
                      onClick={() => setEditingBranchesId(isEditingBranches ? null : emp.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                        isEditingBranches
                          ? "border-accent text-accent bg-accent/5"
                          : "border-border text-muted-foreground hover:border-accent hover:text-accent"
                      }`}
                    >
                      <Icon name="MapPin" size={11} />
                      Филиалы
                    </button>
                  )}
                  {isDirector && (
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      className="hidden group-hover:flex p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Branch chips always visible */}
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {branches
                  .filter((b) => emp.branchIds.includes(b.id))
                  .map((b) => (
                    <span key={b.id} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                      {b.name}
                    </span>
                  ))}
                {emp.branchIds.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Нет филиалов</span>
                )}
              </div>

              {/* Branch edit panel */}
              {isEditingBranches && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 animate-fade-in">
                  <p className="text-xs font-medium text-foreground mb-2">Редактировать филиалы</p>
                  <div className="flex flex-wrap gap-3">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={emp.branchIds.includes(b.id)}
                          onChange={(e) => toggleBranchForEmp(b.id, e.target.checked, emp.id)}
                          className="rounded border-border"
                        />
                        <span className="text-foreground">{b.name}</span>
                        <span className="text-muted-foreground">({b.city})</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => setEditingBranchesId(null)}
                    className="mt-2 text-xs text-accent hover:opacity-80"
                  >
                    Готово
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Branches ───────────────────────────────────────────────────────────────

function BranchesTab({
  branches,
  onBranchesChange,
  isDirector,
}: {
  branches: Branch[];
  onBranchesChange: (b: Branch[]) => void;
  isDirector: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });

  function saveNew() {
    if (!form.name.trim()) return;
    onBranchesChange([...branches, { id: `b_${Date.now()}`, name: form.name, city: form.city }]);
    setForm({ name: "", city: "" });
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Филиалы ({branches.length})</h2>
        {isDirector && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 font-medium">
            <Icon name="Plus" size={13} />
            Добавить
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-accent/30 rounded-lg p-4 bg-accent/3 animate-fade-in">
          <div className="flex gap-2 mb-3">
            <input autoFocus placeholder="Название филиала" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="flex-1 text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background" />
            <input placeholder="Город" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="w-36 text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveNew} className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 font-medium">Сохранить</button>
            <button onClick={() => setAdding(false)} className="text-xs text-muted-foreground px-3 py-1.5 rounded border border-border">Отмена</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {branches.map((b) => (
          <div key={b.id} className="border border-border rounded-lg p-4 bg-card group hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="MapPin" size={13} className="text-accent" />
                  <p className="text-sm font-semibold text-foreground">{b.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{b.city}</p>
              </div>
              {isDirector && (
                <button onClick={() => onBranchesChange(branches.filter((x) => x.id !== b.id))} className="hidden group-hover:block text-muted-foreground hover:text-destructive">
                  <Icon name="Trash2" size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Categories ─────────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  onCategoriesChange,
  isDirector,
}: {
  categories: Category[];
  onCategoriesChange: (c: Category[]) => void;
  isDirector: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", color: "medium" as "high" | "medium" | "low" });

  const colorLabels = { high: "Высокий", medium: "Средний", low: "Низкий" };

  function saveNew() {
    if (!form.name.trim()) return;
    onCategoriesChange([...categories, { id: `c_${Date.now()}`, name: form.name, color: form.color }]);
    setForm({ name: "", color: "medium" });
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Категории важности ({categories.length})</h2>
        {isDirector && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 font-medium">
            <Icon name="Plus" size={13} />
            Добавить
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-accent/30 rounded-lg p-4 bg-accent/3 animate-fade-in">
          <div className="flex gap-2 mb-3">
            <input autoFocus placeholder="Название категории" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="flex-1 text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background" />
            <select value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value as "high" | "medium" | "low" }))} className="text-xs border border-border rounded px-2 py-1.5 outline-none bg-background">
              <option value="high">Высокий приоритет</option>
              <option value="medium">Средний приоритет</option>
              <option value="low">Низкий приоритет</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={saveNew} className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 font-medium">Сохранить</button>
            <button onClick={() => setAdding(false)} className="text-xs text-muted-foreground px-3 py-1.5 rounded border border-border">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-card group hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full badge-${c.color}`}>{c.name}</span>
              <span className="text-xs text-muted-foreground">{colorLabels[c.color]} приоритет</span>
            </div>
            {isDirector && (
              <button onClick={() => onCategoriesChange(categories.filter((x) => x.id !== c.id))} className="hidden group-hover:block text-muted-foreground hover:text-destructive">
                <Icon name="Trash2" size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Roles ──────────────────────────────────────────────────────────────────

function RolesTab({
  employees,
  passwords,
  onPasswordChange,
}: {
  employees: Employee[];
  passwords: Record<string, string>;
  onEmployeesChange: (e: Employee[]) => void;
  onPasswordChange: (empId: string, password: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const roleColors: Record<string, string> = {
    director: "bg-destructive/10 text-destructive",
    manager: "bg-accent/10 text-accent",
    marketer: "bg-success/10 text-success",
    custom: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Управление доступом</h2>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Сотрудник</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Роль</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Пароль входа</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                      {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm text-foreground">{emp.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[emp.role] || roleColors.custom}`}>
                    {emp.roleLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editingId === emp.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        autoFocus
                        placeholder="Новый пароль"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="text-xs border border-border rounded px-2 py-1 outline-none focus:border-accent bg-background w-32"
                      />
                      <button
                        onClick={() => {
                          if (newPassword.trim()) {
                            onPasswordChange(emp.id, newPassword.trim());
                          }
                          setEditingId(null);
                          setNewPassword("");
                        }}
                        className="text-success hover:opacity-80"
                      >
                        <Icon name="Check" size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-destructive">
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">••••••••</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId !== emp.id && (
                    <button
                      onClick={() => setEditingId(emp.id)}
                      className="hidden group-hover:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="KeyRound" size={12} />
                      Сменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}