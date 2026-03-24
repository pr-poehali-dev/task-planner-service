import React, { useState } from "react";
import Icon from "@/components/ui/icon";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type Task,
  type TaskType,
  type Employee,
  type Branch,
  type Category,
  type PersonalGoal,
  type UserTaskType,
  getDaysInMonth,
  getWeekdayName,
  isWeekend,
} from "@/store/data";

const NO_BRANCH_ID = "__no_branch__";

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  currentMonth: string;
  personalGoals: PersonalGoal[];
  onPersonalGoalsChange: (goals: PersonalGoal[]) => void;
  userTaskTypes: UserTaskType[];
  onUserTaskTypesChange: (types: UserTaskType[]) => void;
}

export default function PlannerPage({
  currentUser,
  branches,
  employees,
  categories,
  tasks,
  onTasksChange,
  currentMonth,
  personalGoals,
  onPersonalGoalsChange,
  userTaskTypes,
  onUserTaskTypesChange,
}: Props) {
  const userBranches = branches.filter((b) =>
    currentUser.branchIds.includes(b.id)
  );
  const [activeBranchId, setActiveBranchId] = useState(userBranches[0]?.id || "");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("variable");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [showToday, setShowToday] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  // Personal goals
  const [showGoals, setShowGoals] = useState(true);
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());
  const [addingGoalTask, setAddingGoalTask] = useState<string | null>(null);
  const [goalTaskTitle, setGoalTaskTitle] = useState("");
  // Custom task types
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState("");

  const isNoBranch = activeBranchId === NO_BRANCH_ID;

  const days = getDaysInMonth(currentMonth);

  const today = new Date();
  const todayDay =
    today.getMonth() + 1 === parseInt(currentMonth.split("-")[1]) &&
    today.getFullYear() === parseInt(currentMonth.split("-")[0])
      ? today.getDate()
      : null;

  const allBranchTasks = tasks.filter(
    (t) =>
      t.employeeId === currentUser.id &&
      t.branchId === activeBranchId &&
      t.monthYear === currentMonth
  );

  const branchTasks = filterAssignee
    ? allBranchTasks.filter((t) => t.assigneeId === filterAssignee)
    : allBranchTasks;

  const myCustomTypes = userTaskTypes.filter((ut) => ut.employeeId === currentUser.id);

  const permanentTasks = branchTasks.filter((t) => t.type === "permanent");
  const variableTasks = branchTasks.filter((t) => t.type === "variable" && !t.customTypeId);
  const unplannedTasks = branchTasks.filter((t) => t.type === "unplanned");

  // Personal goals for this user/month
  const myGoals = personalGoals.filter(
    (g) => g.employeeId === currentUser.id && g.monthYear === currentMonth
  );

  const todayTasks = todayDay
    ? tasks.filter(
        (t) =>
          t.employeeId === currentUser.id &&
          t.monthYear === currentMonth &&
          (t.scheduledDates.includes(todayDay) || t.completedDates.includes(todayDay))
      )
    : [];

  const branchEmployees = isNoBranch
    ? employees.filter((e) => e.id !== currentUser.id)
    : employees.filter((e) =>
        e.branchIds.includes(activeBranchId) && e.id !== currentUser.id
      );

  // Stats
  const totalScheduled = branchTasks.reduce((acc, t) => acc + t.scheduledDates.length, 0);
  const totalCompleted = branchTasks.reduce((acc, t) => acc + t.completedDates.length, 0);
  const conversionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  const totalRescheduled = branchTasks.reduce((acc, t) => acc + (t.rescheduledCount || 0), 0);

  // Count overdue: scheduled dates in the past that are not completed
  const overdueCount = todayDay
    ? branchTasks.reduce((acc, t) => {
        return acc + t.scheduledDates.filter(
          (d) => d < todayDay && !t.completedDates.includes(d)
        ).length;
      }, 0)
    : 0;

  function getEmployeeName(id?: string) {
    if (!id) return "";
    return employees.find((e) => e.id === id)?.name || "";
  }

  function toggleDate(taskId: string, day: number) {
    onTasksChange(
      tasks.map((t) => {
        if (t.id !== taskId) return t;
        const isScheduled = t.scheduledDates.includes(day);
        const isCompleted = t.completedDates.includes(day);
        if (!isScheduled && !isCompleted) {
          return { ...t, scheduledDates: [...t.scheduledDates, day].sort((a, b) => a - b) };
        }
        if (isScheduled && !isCompleted) {
          return { ...t, completedDates: [...t.completedDates, day].sort((a, b) => a - b) };
        }
        if (isCompleted) {
          // Third click: removing the date - track as reschedule
          return {
            ...t,
            scheduledDates: t.scheduledDates.filter((d) => d !== day),
            completedDates: t.completedDates.filter((d) => d !== day),
            rescheduledCount: (t.rescheduledCount || 0) + 1,
          };
        }
        return t;
      })
    );
  }

  function deleteTask(taskId: string) {
    onTasksChange(tasks.filter((t) => t.id !== taskId));
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }

  function saveEdit(taskId: string) {
    onTasksChange(tasks.map((t) => (t.id === taskId ? { ...t, title: editingTitle } : t)));
    setEditingTaskId(null);
  }

  function updateAssignee(taskId: string, assigneeId: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === taskId ? { ...t, assigneeId: assigneeId || undefined } : t
      )
    );
  }

  function updateComment(taskId: string, comment: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === taskId ? { ...t, comment: comment || undefined } : t
      )
    );
  }

  function addTask() {
    if (!newTaskTitle.trim()) return;
    // Determine if the selected type is a custom type
    const isCustom = myCustomTypes.some((ct) => ct.id === newTaskType);
    const newTask: Task = {
      id: `t_${Date.now()}`,
      title: newTaskTitle.trim(),
      type: isCustom ? "variable" : newTaskType,
      employeeId: currentUser.id,
      branchId: activeBranchId,
      assigneeId: newTaskAssignee || undefined,
      monthYear: currentMonth,
      scheduledDates: [],
      completedDates: [],
      createdByEmployeeId: currentUser.id,
      customTypeId: isCustom ? newTaskType : undefined,
    };
    onTasksChange([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskAssignee("");
    setAddingTask(false);
  }

  function getCellState(task: Task, day: number): "done" | "planned" | "none" {
    if (task.completedDates.includes(day)) return "done";
    if (task.scheduledDates.includes(day)) return "planned";
    return "none";
  }

  function getCategory(categoryId?: string) {
    return categories.find((c) => c.id === categoryId);
  }

  function getBranchName(branchId: string) {
    if (branchId === NO_BRANCH_ID) return "Общие";
    return branches.find((b) => b.id === branchId)?.name || branchId;
  }

  function getMonthLabel(monthYear: string) {
    const [y, m] = monthYear.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }

  function getTaskTypeLabel(type: TaskType, customTypeId?: string): string {
    if (type === "permanent") return "Постоянная";
    if (type === "variable" && customTypeId) {
      const ct = userTaskTypes.find((ut) => ut.id === customTypeId);
      return ct ? ct.label : "Переменная";
    }
    if (type === "variable") return "Переменная";
    if (type === "unplanned") return "Внеплановая";
    return type;
  }

  function getTaskTypeShort(type: TaskType, customTypeId?: string): string {
    if (type === "permanent") return "Пост.";
    if (type === "variable" && customTypeId) {
      const ct = userTaskTypes.find((ut) => ut.id === customTypeId);
      return ct ? ct.label.slice(0, 6) : "Перем.";
    }
    if (type === "variable") return "Перем.";
    if (type === "unplanned") return "Внепл.";
    return type.slice(0, 6);
  }

  // Personal goal functions
  function addPersonalGoal() {
    if (!newGoalTitle.trim()) return;
    const goal: PersonalGoal = {
      id: `pg_${Date.now()}`,
      title: newGoalTitle.trim(),
      employeeId: currentUser.id,
      monthYear: currentMonth,
    };
    onPersonalGoalsChange([...personalGoals, goal]);
    setNewGoalTitle("");
    setAddingGoal(false);
    setExpandedGoalIds((prev) => new Set([...prev, goal.id]));
  }

  function deletePersonalGoal(goalId: string) {
    onPersonalGoalsChange(personalGoals.filter((g) => g.id !== goalId));
    // Remove goalId from tasks
    onTasksChange(tasks.map((t) => t.personalGoalId === goalId ? { ...t, personalGoalId: undefined } : t));
  }

  function addTaskFromGoal(goalId: string) {
    if (!goalTaskTitle.trim()) return;
    const goal = personalGoals.find((g) => g.id === goalId);
    const newTask: Task = {
      id: `t_${Date.now()}`,
      title: goalTaskTitle.trim(),
      type: "variable",
      employeeId: currentUser.id,
      branchId: activeBranchId,
      monthYear: currentMonth,
      scheduledDates: [],
      completedDates: [],
      createdByEmployeeId: currentUser.id,
      goalTitle: goal?.title,
      personalGoalId: goalId,
    };
    onTasksChange([...tasks, newTask]);
    setGoalTaskTitle("");
    setAddingGoalTask(null);
  }

  function getGoalProgress(goalId: string) {
    const goalTasks = tasks.filter(
      (t) => t.personalGoalId === goalId && t.monthYear === currentMonth
    );
    const total = goalTasks.reduce((acc, t) => acc + t.scheduledDates.length, 0);
    const done = goalTasks.reduce((acc, t) => acc + t.completedDates.length, 0);
    return { total, done, taskCount: goalTasks.length, tasks: goalTasks };
  }

  // Custom type management
  function addCustomType() {
    if (!newTypeName.trim()) return;
    const newType: UserTaskType = {
      id: `ut_${Date.now()}`,
      label: newTypeName.trim(),
      employeeId: currentUser.id,
    };
    onUserTaskTypesChange([...userTaskTypes, newType]);
    setNewTypeName("");
  }

  function saveTypeEdit(typeId: string) {
    if (!editingTypeName.trim()) return;
    onUserTaskTypesChange(
      userTaskTypes.map((ut) => ut.id === typeId ? { ...ut, label: editingTypeName.trim() } : ut)
    );
    setEditingTypeId(null);
    setEditingTypeName("");
  }

  function deleteCustomType(typeId: string) {
    onUserTaskTypesChange(userTaskTypes.filter((ut) => ut.id !== typeId));
    // Move tasks with this customTypeId to plain variable
    onTasksChange(
      tasks.map((t) => t.customTypeId === typeId ? { ...t, customTypeId: undefined } : t)
    );
  }

  function exportExcel() {
    const customTasks = myCustomTypes.flatMap((ct) =>
      branchTasks.filter((t) => t.customTypeId === ct.id)
    );
    const allTasks = [...permanentTasks, ...variableTasks, ...unplannedTasks, ...customTasks];
    const rows = allTasks.map((t) => {
      const row: Record<string, string> = {
        "Задача": t.title,
        "Тип": getTaskTypeLabel(t.type, t.customTypeId),
        "Категория": getCategory(t.categoryId)?.name || "\u2014",
        "Ответственный": getEmployeeName(t.assigneeId) || "\u2014",
      };
      days.forEach((day) => {
        const state = getCellState(t, day);
        row[String(day)] = state === "done" ? "\u2713" : state === "planned" ? "\u25CB" : "";
      });
      row["Запланировано"] = String(t.scheduledDates.length);
      row["Выполнено"] = String(t.completedDates.length);
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Планер");
    const brName = getBranchName(activeBranchId);
    XLSX.writeFile(wb, `Планер_${brName}_${currentMonth}.xlsx`);
    setShowExportMenu(false);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.addFont("https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf", "Roboto", "normal");

    const brName = getBranchName(activeBranchId);
    doc.setFontSize(12);
    doc.text(`${brName} \u2014 ${getMonthLabel(currentMonth)}`, 14, 15);
    doc.setFontSize(8);
    doc.text(`${currentUser.name} | ${currentUser.roleLabel}`, 14, 20);

    const customTasksPdf = myCustomTypes.flatMap((ct) =>
      branchTasks.filter((t) => t.customTypeId === ct.id)
    );
    const allTasks = [...permanentTasks, ...variableTasks, ...unplannedTasks, ...customTasksPdf];
    const head = [["Задача", "Тип", "Категория", "Ответственный", ...days.map(String), "План", "Факт"]];
    const body = allTasks.map((t) => [
      t.title,
      getTaskTypeShort(t.type, t.customTypeId),
      getCategory(t.categoryId)?.name || "-",
      getEmployeeName(t.assigneeId) || "-",
      ...days.map((day) => {
        const state = getCellState(t, day);
        return state === "done" ? "V" : state === "planned" ? "o" : "";
      }),
      String(t.scheduledDates.length),
      String(t.completedDates.length),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 24,
      styles: { fontSize: 5, cellPadding: 1 },
      headStyles: { fillColor: [30, 120, 220], fontSize: 5 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 10 },
        2: { cellWidth: 12 },
        3: { cellWidth: 20 },
      },
      theme: "grid",
    });

    doc.save(`Планер_${brName}_${currentMonth}.pdf`);
    setShowExportMenu(false);
  }

  const TASK_COL_WIDTH = 220;
  const ASSIGNEE_COL_WIDTH = 100;
  const DATE_COL_WIDTH = 32;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 flex items-end justify-between gap-2 md:gap-4 flex-shrink-0 border-b border-border flex-wrap">
        <div className="flex gap-1">
          {userBranches.map((b) => (
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
          <button
            onClick={() => setActiveBranchId(NO_BRANCH_ID)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeBranchId === NO_BRANCH_ID
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Общие
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              План: <strong className="text-foreground font-mono">{totalScheduled}</strong>
            </span>
            <span>
              Факт: <strong className="text-success font-mono">{totalCompleted}</strong>
            </span>
            <span>
              <strong
                className={`font-mono ${
                  conversionRate >= 70
                    ? "text-success"
                    : conversionRate >= 40
                    ? "text-warning"
                    : "text-destructive"
                }`}
              >
                {conversionRate}%
              </strong>
            </span>
            <span>
              Перенесено: <strong className="text-warning font-mono">{totalRescheduled}</strong>
            </span>
            <span>
              Не выполнено: <strong className="text-destructive font-mono">{overdueCount}</strong>
            </span>
          </div>

          {/* Assignee filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1.5 outline-none bg-background"
          >
            <option value="">Все</option>
            {branchEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name.split(" ")[0]}
              </option>
            ))}
          </select>

          {todayDay && (
            <button
              onClick={() => setShowToday(!showToday)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                showToday
                  ? "bg-accent text-white border-accent"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              <Icon name="Sun" size={12} />
              Сегодня
              {todayTasks.length > 0 && (
                <span
                  className={`text-[10px] font-mono ml-0.5 ${
                    showToday ? "text-white/80" : "text-accent"
                  }`}
                >
                  {todayTasks.length}
                </span>
              )}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowTypeManager(!showTypeManager)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                showTypeManager
                  ? "bg-accent text-white border-accent"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
              title="Настроить типы задач"
            >
              <Icon name="Settings" size={12} />
              Типы
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-all font-medium"
            >
              <Icon name="Download" size={12} />
              Экспорт
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in min-w-[140px]">
                  <button
                    onClick={exportExcel}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Icon name="FileSpreadsheet" size={13} className="text-success" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Icon name="FileText" size={13} className="text-destructive" />
                    PDF (.pdf)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showToday && todayDay && (
        <div className="mx-4 md:mx-6 mt-3 rounded-lg today-panel overflow-hidden animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-warning/20">
            <Icon name="CalendarDays" size={13} className="text-warning" />
            <p className="text-xs font-semibold text-foreground">
              Задачи на сегодня -- {todayDay}{" "}
              {new Date(
                parseInt(currentMonth.split("-")[0]),
                parseInt(currentMonth.split("-")[1]) - 1,
                todayDay
              ).toLocaleDateString("ru-RU", { month: "long" })}
            </p>
            <span className="ml-auto text-xs text-muted-foreground">
              {todayTasks.filter((t) => t.completedDates.includes(todayDay)).length} из{" "}
              {todayTasks.length} выполнено
            </span>
          </div>
          {todayTasks.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Нет задач на сегодня</p>
          ) : (
            <div className="divide-y divide-accent/10">
              {todayTasks.map((t) => {
                const isDone = t.completedDates.includes(todayDay);
                const cat = getCategory(t.categoryId);
                const assignee = getEmployeeName(t.assigneeId);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/5 transition-colors"
                  >
                    <button
                      onClick={() => toggleDate(t.id, todayDay)}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        isDone
                          ? "bg-success border-success text-white"
                          : "border-border hover:border-success"
                      }`}
                    >
                      {isDone && <Icon name="Check" size={10} />}
                    </button>
                    <span
                      className={`text-xs flex-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {t.title}
                    </span>
                    {assignee && (
                      <span className="text-[10px] text-muted-foreground">
                        <Icon name="User" size={10} className="inline mr-0.5" />
                        {assignee.split(" ")[0]}
                      </span>
                    )}
                    {cat && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full badge-${cat.color}`}>
                        {cat.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {getBranchName(t.branchId)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        t.type === "permanent"
                          ? "bg-muted text-muted-foreground"
                          : t.type === "unplanned"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {getTaskTypeShort(t.type, t.customTypeId)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom type manager */}
      {showTypeManager && (
        <div className="mx-4 md:mx-6 mt-3 border border-border rounded-lg bg-card overflow-hidden animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <Icon name="Settings" size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Пользовательские типы задач</p>
            <button onClick={() => setShowTypeManager(false)} className="ml-auto text-muted-foreground hover:text-foreground">
              <Icon name="X" size={14} />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {myCustomTypes.map((ct) => (
              <div key={ct.id} className="flex items-center gap-2">
                {editingTypeId === ct.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingTypeName}
                      onChange={(e) => setEditingTypeName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveTypeEdit(ct.id)}
                      className="flex-1 text-xs border border-accent rounded px-2 py-1 outline-none bg-background"
                    />
                    <button onClick={() => saveTypeEdit(ct.id)} className="text-success hover:opacity-80">
                      <Icon name="Check" size={13} />
                    </button>
                    <button onClick={() => setEditingTypeId(null)} className="text-muted-foreground hover:text-foreground">
                      <Icon name="X" size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-foreground">{ct.label}</span>
                    <button
                      onClick={() => { setEditingTypeId(ct.id); setEditingTypeName(ct.label); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="Pencil" size={11} />
                    </button>
                    <button
                      onClick={() => deleteCustomType(ct.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon name="Trash2" size={11} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {myCustomTypes.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Нет пользовательских типов</p>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomType()}
                placeholder="Название нового типа..."
                className="flex-1 text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-accent bg-background"
              />
              <button
                onClick={addCustomType}
                className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 font-medium"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal goals */}
      <div className="mx-4 md:mx-6 mt-3 flex-shrink-0">
        <button
          onClick={() => setShowGoals(!showGoals)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <Icon name={showGoals ? "ChevronDown" : "ChevronRight"} size={13} />
          <Icon name="Target" size={13} />
          Мои цели ({myGoals.length})
        </button>

        {showGoals && (
          <div className="flex flex-wrap gap-2 mb-1">
            {myGoals.map((goal) => {
              const progress = getGoalProgress(goal.id);
              const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
              const isExpanded = expandedGoalIds.has(goal.id);

              return (
                <div
                  key={goal.id}
                  className="border border-border rounded-lg bg-card overflow-hidden min-w-[200px] max-w-[360px] flex-1"
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => {
                      setExpandedGoalIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(goal.id)) next.delete(goal.id); else next.add(goal.id);
                        return next;
                      });
                    }}
                  >
                    <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={12} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate flex-1">{goal.title}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-accent"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{progress.done}/{progress.total}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePersonalGoal(goal.id); }}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    >
                      <Icon name="Trash2" size={11} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-3 py-2 space-y-1">
                      {progress.tasks.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">Нет задач</p>
                      )}
                      {progress.tasks.map((t) => {
                        const totalSch = t.scheduledDates.length;
                        const totalComp = t.completedDates.length;
                        return (
                          <div key={t.id} className="flex items-center gap-1.5 text-[10px]">
                            <Icon name={totalComp >= totalSch && totalSch > 0 ? "CheckCircle" : "Circle"} size={10}
                              className={totalComp >= totalSch && totalSch > 0 ? "text-success" : "text-muted-foreground"} />
                            <span className="truncate flex-1 text-foreground">{t.title}</span>
                            <span className="text-muted-foreground font-mono">{totalComp}/{totalSch}</span>
                          </div>
                        );
                      })}
                      {addingGoalTask === goal.id ? (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            autoFocus
                            value={goalTaskTitle}
                            onChange={(e) => setGoalTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTaskFromGoal(goal.id)}
                            placeholder="Задача..."
                            className="flex-1 text-[10px] border border-border rounded px-1.5 py-1 outline-none focus:border-accent bg-background"
                          />
                          <button onClick={() => addTaskFromGoal(goal.id)} className="text-success"><Icon name="Check" size={12} /></button>
                          <button onClick={() => setAddingGoalTask(null)} className="text-muted-foreground"><Icon name="X" size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingGoalTask(goal.id); setGoalTaskTitle(""); }}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors pt-1"
                        >
                          <Icon name="Plus" size={10} />
                          Добавить задачу
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {addingGoal ? (
              <div className="border border-accent/30 rounded-lg bg-card px-3 py-2 min-w-[200px] max-w-[360px] flex-1 animate-fade-in">
                <input
                  autoFocus
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPersonalGoal()}
                  placeholder="Название цели..."
                  className="w-full text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-accent bg-background mb-2"
                />
                <div className="flex gap-1.5">
                  <button onClick={addPersonalGoal} className="text-xs bg-accent text-white px-2.5 py-1 rounded hover:opacity-90 font-medium">Создать</button>
                  <button onClick={() => { setAddingGoal(false); setNewGoalTitle(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded border border-border">Отмена</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingGoal(true)}
                className="flex items-center justify-center gap-1.5 border border-dashed border-border rounded-lg px-4 py-3 text-xs text-muted-foreground hover:text-accent hover:border-accent transition-colors min-w-[140px]"
              >
                <Icon name="Plus" size={13} />
                Цель
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6 pt-3">
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table
              className="border-collapse"
              style={{
                minWidth: TASK_COL_WIDTH + ASSIGNEE_COL_WIDTH + days.length * DATE_COL_WIDTH + 60,
              }}
            >
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-3 sticky left-0 bg-muted/40 z-10 border-r border-border"
                    style={{ width: TASK_COL_WIDTH, minWidth: TASK_COL_WIDTH }}
                  >
                    Задача
                  </th>
                  <th className="text-xs font-medium text-muted-foreground px-2 py-3 border-r border-border w-12 text-center">
                    Кат.
                  </th>
                  <th
                    className="text-xs font-medium text-muted-foreground px-2 py-3 border-r border-border text-center"
                    style={{ width: ASSIGNEE_COL_WIDTH, minWidth: ASSIGNEE_COL_WIDTH }}
                  >
                    Ответственный
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={`text-center border-r border-border last:border-r-0 ${
                        isWeekend(day, currentMonth) ? "bg-muted/60" : ""
                      } ${todayDay === day ? "bg-accent/10" : ""}`}
                      style={{ width: DATE_COL_WIDTH, minWidth: DATE_COL_WIDTH }}
                    >
                      <div className="flex flex-col items-center py-1.5 gap-0.5">
                        <span
                          className={`text-[10px] font-normal ${
                            isWeekend(day, currentMonth)
                              ? "text-muted-foreground/60"
                              : "text-muted-foreground"
                          }`}
                        >
                          {getWeekdayName(day, currentMonth)}
                        </span>
                        <span
                          className={`text-xs font-mono font-medium leading-none ${
                            todayDay === day
                              ? "text-accent"
                              : isWeekend(day, currentMonth)
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr className="section-permanent">
                  <td
                    colSpan={days.length + 3}
                    className="px-4 py-2 text-xs font-semibold text-[hsl(210,100%,42%)] uppercase tracking-wider border-b border-border"
                  >
                    Постоянные задачи
                  </td>
                </tr>
                {permanentTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    days={days}
                    currentMonth={currentMonth}
                    category={getCategory(task.categoryId)}
                    canEdit={true}
                    editingTaskId={editingTaskId}
                    editingTitle={editingTitle}
                    onEditingTitleChange={setEditingTitle}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onDelete={deleteTask}
                    onToggleDate={toggleDate}
                    getCellState={getCellState}
                    todayDay={todayDay}
                    employees={branchEmployees}
                    assigneeName={getEmployeeName(task.assigneeId)}
                    onAssigneeChange={updateAssignee}
                    onCommentChange={updateComment}
                  />
                ))}
                {permanentTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 3}
                      className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border"
                    >
                      Нет постоянных задач -- добавьте ниже
                    </td>
                  </tr>
                )}

                <tr className="section-variable">
                  <td
                    colSpan={days.length + 3}
                    className="px-4 py-2 text-xs font-semibold text-[hsl(38,92%,38%)] uppercase tracking-wider border-b border-border"
                  >
                    Переменные задачи
                  </td>
                </tr>
                {variableTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    days={days}
                    currentMonth={currentMonth}
                    category={getCategory(task.categoryId)}
                    canEdit={true}
                    editingTaskId={editingTaskId}
                    editingTitle={editingTitle}
                    onEditingTitleChange={setEditingTitle}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onDelete={deleteTask}
                    onToggleDate={toggleDate}
                    getCellState={getCellState}
                    todayDay={todayDay}
                    employees={branchEmployees}
                    assigneeName={getEmployeeName(task.assigneeId)}
                    onAssigneeChange={updateAssignee}
                    onCommentChange={updateComment}
                  />
                ))}
                {variableTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 3}
                      className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border"
                    >
                      Нет переменных задач
                    </td>
                  </tr>
                )}

                <tr className="section-unplanned">
                  <td
                    colSpan={days.length + 3}
                    className="px-4 py-2 text-xs font-semibold text-[hsl(0,72%,42%)] uppercase tracking-wider border-b border-border"
                  >
                    Внеплановые задачи
                  </td>
                </tr>
                {unplannedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    days={days}
                    currentMonth={currentMonth}
                    category={getCategory(task.categoryId)}
                    canEdit={true}
                    editingTaskId={editingTaskId}
                    editingTitle={editingTitle}
                    onEditingTitleChange={setEditingTitle}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onDelete={deleteTask}
                    onToggleDate={toggleDate}
                    getCellState={getCellState}
                    todayDay={todayDay}
                    employees={branchEmployees}
                    assigneeName={getEmployeeName(task.assigneeId)}
                    onAssigneeChange={updateAssignee}
                    onCommentChange={updateComment}
                  />
                ))}
                {unplannedTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 3}
                      className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border"
                    >
                      Нет внеплановых задач
                    </td>
                  </tr>
                )}

                {/* Custom type sections */}
                {myCustomTypes.map((ct) => {
                  const ctTasks = branchTasks.filter((t) => t.customTypeId === ct.id);
                  return (
                    <React.Fragment key={ct.id}>
                      <tr className="section-custom">
                        <td
                          colSpan={days.length + 3}
                          className="px-4 py-2 text-xs font-semibold text-[hsl(270,60%,45%)] uppercase tracking-wider border-b border-border"
                        >
                          {ct.label}
                        </td>
                      </tr>
                      {ctTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          days={days}
                          currentMonth={currentMonth}
                          category={getCategory(task.categoryId)}
                          canEdit={true}
                          editingTaskId={editingTaskId}
                          editingTitle={editingTitle}
                          onEditingTitleChange={setEditingTitle}
                          onStartEdit={startEdit}
                          onSaveEdit={saveEdit}
                          onDelete={deleteTask}
                          onToggleDate={toggleDate}
                          getCellState={getCellState}
                          todayDay={todayDay}
                          employees={branchEmployees}
                          assigneeName={getEmployeeName(task.assigneeId)}
                          onAssigneeChange={updateAssignee}
                          onCommentChange={updateComment}
                        />
                      ))}
                      {ctTasks.length === 0 && (
                        <tr>
                          <td
                            colSpan={days.length + 3}
                            className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border"
                          >
                            Нет задач типа "{ct.label}"
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {addingTask ? (
                  <tr className="border-t border-border">
                    <td
                      className="px-4 py-2 sticky left-0 bg-background z-10"
                      style={{ width: TASK_COL_WIDTH }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTask()}
                          placeholder="Название задачи..."
                          className="flex-1 text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-accent bg-background"
                        />
                        <select
                          value={newTaskType}
                          onChange={(e) =>
                            setNewTaskType(e.target.value as TaskType)
                          }
                          className="text-xs border border-border rounded px-1.5 py-1.5 outline-none bg-background"
                        >
                          <option value="variable">Переменная</option>
                          <option value="permanent">Постоянная</option>
                          <option value="unplanned">Внеплановая</option>
                          {myCustomTypes.map((ct) => (
                            <option key={ct.id} value={ct.id}>{ct.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-1 text-center border-r border-border" />
                    <td className="px-1 border-r border-border">
                      <select
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        className="w-full text-[10px] border border-border rounded px-1 py-1 outline-none bg-background"
                      >
                        <option value="">--</option>
                        {branchEmployees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name.split(" ")[0]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td colSpan={days.length}>
                      <div className="flex items-center gap-2 px-2">
                        <button onClick={addTask} className="text-success hover:opacity-80">
                          <Icon name="Check" size={14} />
                        </button>
                        <button
                          onClick={() => setAddingTask(false)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr className="border-t border-border">
                    <td colSpan={days.length + 3} className="px-4 py-2.5">
                      <button
                        onClick={() => setAddingTask(true)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                      >
                        <Icon name="Plus" size={13} />
                        Добавить задачу
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm cell-planned" />
            <span>Запланировано (1 клик)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm cell-done" />
            <span>Выполнено (2 клика)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-muted border border-border" />
            <span>Снять отметку (3 клика)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- TaskRow ----

interface TaskRowProps {
  task: Task;
  days: number[];
  currentMonth: string;
  category?: Category;
  canEdit: boolean;
  editingTaskId: string | null;
  editingTitle: string;
  onEditingTitleChange: (v: string) => void;
  onStartEdit: (t: Task) => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleDate: (id: string, day: number) => void;
  getCellState: (t: Task, day: number) => "done" | "planned" | "none";
  todayDay: number | null;
  employees: Employee[];
  assigneeName: string;
  onAssigneeChange: (taskId: string, assigneeId: string) => void;
  onCommentChange: (taskId: string, comment: string) => void;
}

function TaskRow({
  task,
  days,
  currentMonth,
  category,
  canEdit,
  editingTaskId,
  editingTitle,
  onEditingTitleChange,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onToggleDate,
  getCellState,
  todayDay,
  employees,
  assigneeName,
  onAssigneeChange,
  onCommentChange,
}: TaskRowProps) {
  const isEditing = editingTaskId === task.id;
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(task.comment || "");

  return (
    <tr className="border-b border-border hover:bg-muted/10 group transition-colors">
      <td
        className="px-4 py-2 sticky left-0 bg-card z-10 border-r border-border group-hover:bg-muted/5"
        style={{ minWidth: 220, maxWidth: 220 }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit(task.id)}
            onBlur={() => onSaveEdit(task.id)}
            className="w-full text-xs border border-accent rounded px-2 py-1 outline-none bg-background"
          />
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {task.fromGroupTaskId && (
                <Icon name="Link" size={11} className="text-accent flex-shrink-0" />
              )}
              <span className="text-xs text-foreground truncate flex-1">{task.title}</span>
              {canEdit && (
                <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setCommentDraft(task.comment || "");
                      setEditingComment(true);
                    }}
                    className="text-muted-foreground hover:text-accent"
                  >
                    <Icon name="MessageSquare" size={11} />
                  </button>
                  <button
                    onClick={() => onStartEdit(task)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="Pencil" size={11} />
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Icon name="Trash2" size={11} />
                  </button>
                </div>
              )}
            </div>
            {task.goalTitle && (
              <span className="text-[9px] text-accent/70 truncate leading-tight">
                <Icon name="Target" size={9} className="inline mr-0.5" />
                {task.goalTitle}
              </span>
            )}
            {task.comment && !editingComment && (
              <span className="text-[9px] text-muted-foreground truncate leading-tight">
                <Icon name="MessageSquare" size={9} className="inline mr-0.5" />
                {task.comment}
              </span>
            )}
            {editingComment && (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  autoFocus
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onCommentChange(task.id, commentDraft.trim());
                      setEditingComment(false);
                    }
                    if (e.key === "Escape") setEditingComment(false);
                  }}
                  placeholder="Комментарий..."
                  className="flex-1 text-[10px] border border-border rounded px-1.5 py-0.5 outline-none focus:border-accent bg-background"
                />
                <button
                  onClick={() => {
                    onCommentChange(task.id, commentDraft.trim());
                    setEditingComment(false);
                  }}
                  className="text-success"
                >
                  <Icon name="Check" size={11} />
                </button>
                <button onClick={() => setEditingComment(false)} className="text-muted-foreground">
                  <Icon name="X" size={11} />
                </button>
              </div>
            )}
          </div>
        )}
      </td>

      <td className="text-center px-1 border-r border-border">
        {category && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full badge-${category.color}`}
          >
            {category.name.slice(0, 3)}
          </span>
        )}
      </td>

      <td className="text-center px-1 border-r border-border relative" style={{ minWidth: 100, maxWidth: 100 }}>
        <button
          onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-full px-1"
          title={assigneeName || "Назначить ответственного"}
        >
          {assigneeName ? (
            <span className="flex items-center gap-0.5 justify-center">
              <Icon name="User" size={10} className="flex-shrink-0" />
              {assigneeName.split(" ")[0]}
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-50 transition-opacity">
              <Icon name="UserPlus" size={11} />
            </span>
          )}
        </button>
        {showAssigneeDropdown && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowAssigneeDropdown(false)} />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in min-w-[140px]">
              <button
                onClick={() => {
                  onAssigneeChange(task.id, "");
                  setShowAssigneeDropdown(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                -- Никто
              </button>
              {employees.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    onAssigneeChange(task.id, e.id);
                    setShowAssigneeDropdown(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] hover:bg-muted/50 transition-colors ${
                    task.assigneeId === e.id ? "text-accent font-medium" : "text-foreground"
                  }`}
                >
                  <Icon name="User" size={11} />
                  {e.name}
                </button>
              ))}
            </div>
          </>
        )}
      </td>

      {days.map((day) => {
        const state = getCellState(task, day);
        return (
          <td
            key={day}
            onClick={() => onToggleDate(task.id, day)}
            title={
              state === "done"
                ? "Выполнено -- клик снимет"
                : state === "planned"
                ? "Запланировано -- клик отметит выполненным"
                : "Клик запланирует"
            }
            className={`border-r border-border last:border-r-0 cursor-pointer transition-colors text-center
              ${isWeekend(day, currentMonth) ? "bg-muted/30" : ""}
              ${todayDay === day ? "bg-accent/5" : ""}
              ${state === "done" ? "cell-done" : state === "planned" ? "cell-planned" : "cell-hover"}
            `}
            style={{ width: 32, height: 36 }}
          >
            {state === "done" && <span className="text-[10px] font-mono">{"\u2713"}</span>}
            {state === "planned" && (
              <span className="text-[10px] font-mono">{"\u00B7"}</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}