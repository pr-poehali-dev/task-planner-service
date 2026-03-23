import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  type Task,
  type Employee,
  type Branch,
  type Category,
  getDaysInMonth,
  getWeekdayName,
  isWeekend,
} from "@/store/data";

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  currentMonth: string;
}

export default function PlannerPage({
  currentUser,
  branches,
  categories,
  tasks,
  onTasksChange,
  currentMonth,
}: Props) {
  const userBranches = branches.filter((b) =>
    currentUser.branchIds.includes(b.id)
  );
  const [activeBranchId, setActiveBranchId] = useState(userBranches[0]?.id || "");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<"permanent" | "variable">("variable");
  const [addingTask, setAddingTask] = useState(false);
  const [showToday, setShowToday] = useState(false);

  const days = getDaysInMonth(currentMonth);

  const today = new Date();
  const todayDay =
    today.getMonth() + 1 === parseInt(currentMonth.split("-")[1]) &&
    today.getFullYear() === parseInt(currentMonth.split("-")[0])
      ? today.getDate()
      : null;

  const branchTasks = tasks.filter(
    (t) =>
      t.employeeId === currentUser.id &&
      t.branchId === activeBranchId &&
      t.monthYear === currentMonth
  );
  const permanentTasks = branchTasks.filter((t) => t.type === "permanent");
  const variableTasks = branchTasks.filter((t) => t.type === "variable");

  // Today's tasks across ALL branches
  const todayTasks = todayDay
    ? tasks.filter(
        (t) =>
          t.employeeId === currentUser.id &&
          t.monthYear === currentMonth &&
          (t.scheduledDates.includes(todayDay) || t.completedDates.includes(todayDay))
      )
    : [];

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
          return {
            ...t,
            scheduledDates: t.scheduledDates.filter((d) => d !== day),
            completedDates: t.completedDates.filter((d) => d !== day),
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

  function addTask() {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `t_${Date.now()}`,
      title: newTaskTitle.trim(),
      type: newTaskType,
      employeeId: currentUser.id,
      branchId: activeBranchId,
      monthYear: currentMonth,
      scheduledDates: [],
      completedDates: [],
    };
    onTasksChange([...tasks, newTask]);
    setNewTaskTitle("");
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
    return branches.find((b) => b.id === branchId)?.name || branchId;
  }

  const totalScheduled = branchTasks.reduce((acc, t) => acc + t.scheduledDates.length, 0);
  const totalCompleted = branchTasks.reduce((acc, t) => acc + t.completedDates.length, 0);
  const conversionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const TASK_COL_WIDTH = 220;
  const DATE_COL_WIDTH = 32;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Top row: branch tabs + controls */}
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
        </div>

        <div className="flex items-center gap-3 pb-2">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Запланировано: <strong className="text-foreground font-mono">{totalScheduled}</strong>
            </span>
            <span>
              Выполнено: <strong className="text-success font-mono">{totalCompleted}</strong>
            </span>
            <span>
              Конверсия:{" "}
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
          </div>

          {/* Today button */}
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
        </div>
      </div>

      {/* Today panel */}
      {showToday && todayDay && (
        <div className="mx-6 mt-3 border border-accent/20 rounded-lg bg-accent/3 overflow-hidden animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-accent/15">
            <Icon name="CalendarDays" size={13} className="text-accent" />
            <p className="text-xs font-semibold text-foreground">
              Задачи на сегодня — {todayDay}{" "}
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
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {t.type === "permanent" ? "Пост." : "Перем."}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6 pt-3">
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table
              className="border-collapse"
              style={{
                minWidth: TASK_COL_WIDTH + days.length * DATE_COL_WIDTH + 60,
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
                {/* Permanent tasks */}
                <tr className="bg-muted/20">
                  <td
                    colSpan={days.length + 2}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border"
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
                  />
                ))}
                {permanentTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 2}
                      className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border"
                    >
                      Нет постоянных задач — добавьте ниже
                    </td>
                  </tr>
                )}

                {/* Variable tasks */}
                <tr className="bg-muted/20">
                  <td
                    colSpan={days.length + 2}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border"
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
                  />
                ))}
                {variableTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 2}
                      className="px-4 py-4 text-xs text-muted-foreground italic"
                    >
                      Нет переменных задач
                    </td>
                  </tr>
                )}

                {/* Add task row */}
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
                            setNewTaskType(e.target.value as "permanent" | "variable")
                          }
                          className="text-xs border border-border rounded px-1.5 py-1.5 outline-none bg-background"
                        >
                          <option value="variable">Переменная</option>
                          <option value="permanent">Постоянная</option>
                        </select>
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
                    <td colSpan={days.length + 1} />
                  </tr>
                ) : (
                  <tr className="border-t border-border">
                    <td colSpan={days.length + 2} className="px-4 py-2.5">
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

        {/* Legend */}
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

// ─── TaskRow ────────────────────────────────────────────────────────────────

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
}: TaskRowProps) {
  const isEditing = editingTaskId === task.id;

  return (
    <tr className="border-b border-border hover:bg-muted/10 group transition-colors">
      {/* Task name */}
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
          <div className="flex items-center gap-1.5 min-w-0">
            {task.fromGroupTaskId && (
              <Icon name="Link" size={11} className="text-accent flex-shrink-0" />
            )}
            <span className="text-xs text-foreground truncate flex-1">{task.title}</span>
            {canEdit && (
              <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
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
        )}
      </td>

      {/* Category */}
      <td className="text-center px-1 border-r border-border">
        {category && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full badge-${category.color}`}
          >
            {category.name.slice(0, 3)}
          </span>
        )}
      </td>

      {/* Date cells */}
      {days.map((day) => {
        const state = getCellState(task, day);
        return (
          <td
            key={day}
            onClick={() => onToggleDate(task.id, day)}
            title={
              state === "done"
                ? "Выполнено — клик снимет"
                : state === "planned"
                ? "Запланировано — клик отметит выполненным"
                : "Клик запланирует"
            }
            className={`border-r border-border last:border-r-0 cursor-pointer transition-colors text-center
              ${isWeekend(day, currentMonth) ? "bg-muted/30" : ""}
              ${todayDay === day ? "bg-accent/5" : ""}
              ${state === "done" ? "cell-done" : state === "planned" ? "cell-planned" : "cell-hover"}
            `}
            style={{ width: 32, height: 36 }}
          >
            {state === "done" && <span className="text-[10px] font-mono">✓</span>}
            {state === "planned" && (
              <span className="text-[10px] font-mono opacity-60">·</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}