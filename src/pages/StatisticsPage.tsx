import Icon from "@/components/ui/icon";
import {
  type Employee,
  type Branch,
  type Task,
  type GroupTask,
  formatMonthYear,
} from "@/store/data";

interface Props {
  employees: Employee[];
  branches: Branch[];
  tasks: Task[];
  groupTasks: GroupTask[];
  currentMonth: string;
}

export default function StatisticsPage({
  employees,
  branches,
  tasks,
  groupTasks,
  currentMonth,
}: Props) {
  function getStats(empId: string, branchId?: string) {
    const empTasks = tasks.filter(
      (t) =>
        t.employeeId === empId &&
        t.monthYear === currentMonth &&
        (branchId ? t.branchId === branchId : true)
    );
    const totalScheduled = empTasks.reduce((acc, t) => acc + t.scheduledDates.length, 0);
    const totalCompleted = empTasks.reduce((acc, t) => acc + t.completedDates.length, 0);
    const conversion = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    const permanent = empTasks.filter((t) => t.type === "permanent").length;
    const variable = empTasks.filter((t) => t.type === "variable").length;
    return { total: empTasks.length, totalScheduled, totalCompleted, conversion, permanent, variable };
  }

  function getGroupStats(empId: string) {
    const empGT = groupTasks.filter((t) => t.assignedEmployeeId === empId);
    const done = empGT.filter((t) => t.completedByEmployee).length;
    return { total: empGT.length, done };
  }

  const totalTasks = tasks.filter((t) => t.monthYear === currentMonth);
  const totalScheduled = totalTasks.reduce((acc, t) => acc + t.scheduledDates.length, 0);
  const totalCompleted = totalTasks.reduce((acc, t) => acc + t.completedDates.length, 0);
  const overallConversion = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const conversionColor = (v: number) =>
    v >= 75 ? "text-success" : v >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Задач запланировано"
          value={totalScheduled}
          icon="CalendarDays"
          sub={`${totalTasks.length} уникальных задач`}
        />
        <StatCard
          title="Задач выполнено"
          value={totalCompleted}
          icon="CheckCircle"
          valueClass="text-success"
          sub={`из ${totalScheduled} запланированных`}
        />
        <StatCard
          title="Общая конверсия"
          value={`${overallConversion}%`}
          icon="TrendingUp"
          valueClass={conversionColor(overallConversion)}
          sub={formatMonthYear(currentMonth)}
        />
        <StatCard
          title="Сотрудников активно"
          value={employees.length}
          icon="Users"
          sub={`в ${branches.length} филиалах`}
        />
      </div>

      {/* Per-branch stats */}
      <div className="space-y-4">
        {branches.map((branch) => {
          const branchEmployees = employees.filter((e) => e.branchIds.includes(branch.id));

          return (
            <div key={branch.id} className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
                <Icon name="MapPin" size={13} className="text-accent" />
                <h3 className="text-sm font-semibold text-foreground">{branch.name}</h3>
                <span className="text-xs text-muted-foreground">{branch.city}</span>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Сотрудник</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Задач всего</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Запланировано</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Выполнено</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Конверсия</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Групп. задачи</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-36">Прогресс</th>
                  </tr>
                </thead>
                <tbody>
                  {branchEmployees.map((emp) => {
                    const stats = getStats(emp.id, branch.id);
                    const groupStats = getGroupStats(emp.id);
                    return (
                      <tr key={emp.id} className="border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.roleLabel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-mono text-foreground">{stats.total}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-mono text-foreground">{stats.totalScheduled}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-mono text-success">{stats.totalCompleted}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-mono font-semibold ${conversionColor(stats.conversion)}`}>
                            {stats.conversion}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-mono text-muted-foreground">
                            <span className="text-success">{groupStats.done}</span>/{groupStats.total}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  stats.conversion >= 75 ? "bg-success" : stats.conversion >= 50 ? "bg-warning" : "bg-destructive"
                                }`}
                                style={{ width: `${stats.conversion}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {branchEmployees.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-xs text-muted-foreground text-center">
                        Нет сотрудников в этом филиале
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  sub,
  valueClass = "text-foreground",
}: {
  title: string;
  value: string | number;
  icon: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground">{title}</p>
        <Icon name={icon} size={15} className="text-muted-foreground/50" />
      </div>
      <p className={`text-2xl font-semibold font-mono ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
