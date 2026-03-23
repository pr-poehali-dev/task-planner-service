import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  type Employee,
  type Branch,
  type Category,
  type GroupGoal,
  type GroupTask,
  type Task,
} from "@/store/data";

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  groupGoals: GroupGoal[];
  groupTasks: GroupTask[];
  tasks: Task[];
  onGroupGoalsChange: (goals: GroupGoal[]) => void;
  onGroupTasksChange: (gt: GroupTask[]) => void;
  onTasksChange: (tasks: Task[]) => void;
  currentMonth: string;
}

export default function TeamPage({
  currentUser,
  branches,
  employees,
  categories,
  groupGoals,
  groupTasks,
  tasks,
  onGroupGoalsChange,
  onGroupTasksChange,
  onTasksChange,
  currentMonth,
}: Props) {
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id || "");
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalAllBranches, setNewGoalAllBranches] = useState(false);
  const [addingTaskForGoal, setAddingTaskForGoal] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    deadline: "",
    categoryId: "",
    assignedEmployeeId: "",
  });
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(
    new Set(groupGoals.map((g) => g.id))
  );

  // Goals for the active branch OR "all" goals (branchId === "all")
  const branchGoals = groupGoals.filter(
    (g) => g.branchId === activeBranchId || g.branchId === "all"
  );
  const branchEmployees = employees.filter((e) =>
    e.branchIds.includes(activeBranchId)
  );

  function toggleGoal(goalId: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  }

  function addGoal() {
    if (!newGoalTitle.trim()) return;
    const newGoal: GroupGoal = {
      id: `gg_${Date.now()}`,
      title: newGoalTitle.trim(),
      branchId: newGoalAllBranches ? "all" : activeBranchId,
    };
    onGroupGoalsChange([...groupGoals, newGoal]);
    setExpandedGoals((prev) => new Set([...prev, newGoal.id]));
    setNewGoalTitle("");
    setNewGoalAllBranches(false);
    setAddingGoal(false);
  }

  function deleteGoal(goalId: string) {
    onGroupGoalsChange(groupGoals.filter((g) => g.id !== goalId));
    onGroupTasksChange(groupTasks.filter((t) => t.goalId !== goalId));
  }

  function addGroupTask(goalId: string) {
    if (!newTask.title.trim() || !newTask.assignedEmployeeId || !newTask.deadline) return;

    const deadline = new Date(newTask.deadline);
    const deadlineDay = deadline.getDate();
    const monthYear = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, "0")}`;

    const gt: GroupTask = {
      id: `gt_${Date.now()}`,
      goalId,
      title: newTask.title.trim(),
      branchId: activeBranchId,
      deadline: newTask.deadline,
      categoryId: newTask.categoryId || categories[0]?.id || "",
      assignedEmployeeId: newTask.assignedEmployeeId,
      monthYear,
      completedByEmployee: false,
    };

    const personalTask: Task = {
      id: `t_${Date.now()}`,
      title: newTask.title.trim(),
      type: "variable",
      employeeId: newTask.assignedEmployeeId,
      branchId: activeBranchId,
      categoryId: newTask.categoryId,
      monthYear,
      scheduledDates: [deadlineDay],
      completedDates: [],
      fromGroupTaskId: gt.id,
      deadline: deadlineDay,
    };

    onGroupTasksChange([...groupTasks, gt]);
    onTasksChange([...tasks, personalTask]);
    setNewTask({ title: "", deadline: "", categoryId: "", assignedEmployeeId: "" });
    setAddingTaskForGoal(null);
  }

  function getEmployee(id: string) {
    return employees.find((e) => e.id === id);
  }

  function getCategory(id: string) {
    return categories.find((c) => c.id === id);
  }

  function getGoalStats(goalId: string) {
    const gt = groupTasks.filter((t) => t.goalId === goalId);
    const done = gt.filter((t) => t.completedByEmployee).length;
    return { total: gt.length, done };
  }

  const isDirector = currentUser.role === "director";
  const isManager = currentUser.role === "manager" || isDirector;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Branch tabs */}
      <div className="px-6 pt-5 pb-0 flex items-center gap-1 flex-shrink-0 border-b border-border">
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBranchId(b.id)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeBranchId === b.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
        <div className="space-y-3">
          {branchGoals.map((goal) => {
            const stats = getGoalStats(goal.id);
            const goalTasks = groupTasks.filter((t) => t.goalId === goal.id);
            const isExpanded = expandedGoals.has(goal.id);
            const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            const isAllBranches = goal.branchId === "all";

            return (
              <div key={goal.id} className="border border-border rounded-lg overflow-hidden bg-card">
                {/* Goal header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleGoal(goal.id)}
                >
                  <Icon
                    name={isExpanded ? "ChevronDown" : "ChevronRight"}
                    size={14}
                    className="text-muted-foreground flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{goal.title}</p>
                    {isAllBranches && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent flex-shrink-0">
                        Все филиалы
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 80
                              ? "bg-success"
                              : progress >= 40
                              ? "bg-warning"
                              : "bg-accent"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {stats.done}/{stats.total}
                      </span>
                    </div>
                    {isManager && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingTaskForGoal(
                            addingTaskForGoal === goal.id ? null : goal.id
                          );
                          setNewTask({ title: "", deadline: "", categoryId: "", assignedEmployeeId: "" });
                        }}
                        className="flex items-center gap-1 text-xs text-accent hover:opacity-80 px-2 py-1 rounded border border-accent/30 hover:bg-accent/5 transition-colors"
                      >
                        <Icon name="Plus" size={12} />
                        Задача
                      </button>
                    )}
                    {isDirector && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGoal(goal.id);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tasks table */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                            Задача
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-28">
                            Дедлайн
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-24">
                            Категория
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-36">
                            Ответственный
                          </th>
                          <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-24">
                            Статус
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {goalTasks.map((gt) => {
                          const emp = getEmployee(gt.assignedEmployeeId);
                          const cat = getCategory(gt.categoryId);
                          const deadlineDate = new Date(gt.deadline);
                          const isOverdue =
                            !gt.completedByEmployee && deadlineDate < new Date();
                          return (
                            <tr
                              key={gt.id}
                              className="border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-2.5">
                                <span className="text-xs text-foreground">{gt.title}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`text-xs font-mono ${
                                    isOverdue ? "text-destructive" : "text-muted-foreground"
                                  }`}
                                >
                                  {deadlineDate.toLocaleDateString("ru-RU", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                  {isOverdue && " ⚠"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {cat && (
                                  <span
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full badge-${cat.color}`}
                                  >
                                    {cat.name}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground">
                                    {emp?.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </div>
                                  <span className="text-xs text-foreground">
                                    {emp?.name.split(" ")[0]}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                    gt.completedByEmployee
                                      ? "bg-success/10 text-success"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {gt.completedByEmployee ? "Выполнено" : "В работе"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {goalTasks.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-5 text-xs text-muted-foreground text-center"
                            >
                              Нет задач — нажмите «+ Задача» чтобы добавить
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Add task form */}
                    {addingTaskForGoal === goal.id && (
                      <div className="border-t border-border bg-muted/10 px-4 py-3 animate-fade-in">
                        <p className="text-xs font-medium text-foreground mb-3">Новая задача</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            autoFocus
                            value={newTask.title}
                            onChange={(e) =>
                              setNewTask((p) => ({ ...p, title: e.target.value }))
                            }
                            placeholder="Название задачи"
                            className="text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background col-span-2"
                          />
                          <input
                            type="date"
                            value={newTask.deadline}
                            onChange={(e) =>
                              setNewTask((p) => ({ ...p, deadline: e.target.value }))
                            }
                            className="text-xs border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background"
                          />
                          <select
                            value={newTask.categoryId}
                            onChange={(e) =>
                              setNewTask((p) => ({ ...p, categoryId: e.target.value }))
                            }
                            className="text-xs border border-border rounded px-2 py-1.5 outline-none bg-background"
                          >
                            <option value="">Категория</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={newTask.assignedEmployeeId}
                            onChange={(e) =>
                              setNewTask((p) => ({
                                ...p,
                                assignedEmployeeId: e.target.value,
                              }))
                            }
                            className="text-xs border border-border rounded px-2 py-1.5 outline-none bg-background col-span-2"
                          >
                            <option value="">Выбрать ответственного</option>
                            {branchEmployees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name} — {e.roleLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => addGroupTask(goal.id)}
                            className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity font-medium"
                          >
                            Добавить
                          </button>
                          <button
                            onClick={() => setAddingTaskForGoal(null)}
                            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded border border-border transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add goal */}
          {isDirector &&
            (addingGoal ? (
              <div className="border border-accent/30 rounded-lg px-4 py-3 bg-card animate-fade-in">
                <p className="text-xs font-medium text-foreground mb-2">Новая цель</p>
                <input
                  autoFocus
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="Название цели..."
                  className="w-full text-sm border border-border rounded px-2.5 py-1.5 outline-none focus:border-accent bg-background mb-2"
                />
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGoalAllBranches}
                    onChange={(e) => setNewGoalAllBranches(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-muted-foreground">
                    Создать для всех филиалов
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={addGoal}
                    className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 font-medium"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => {
                      setAddingGoal(false);
                      setNewGoalTitle("");
                      setNewGoalAllBranches(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded border border-border"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingGoal(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-accent hover:border-accent transition-colors"
              >
                <Icon name="Plus" size={14} />
                Добавить цель
              </button>
            ))}

          {branchGoals.length === 0 && !addingGoal && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="Target" size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Нет целей для этого филиала</p>
              {isDirector && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Нажмите «Добавить цель» чтобы начать
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
