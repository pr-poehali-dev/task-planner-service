import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  type Task,
  type Employee,
  type Branch,
  type Category,
  MOCK_TASKS,
  MOCK_CATEGORIES,
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
  employees,
  categories,
  tasks,
  onTasksChange,
  currentMonth,
}: Props) {
  const userBranches = branches.filter((b) =>
    currentUser.branchIds.includes(b.id)
  );
  const [activeBranchId, setActiveBranchId] = useState(
    userBranches[0]?.id || ""
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<"permanent" | "variable">("variable");
  const [addingTask, setAddingTask] = useState(false);

  const days = getDaysInMonth(currentMonth);

  const branchTasks = tasks.filter(
    (t) =>
      t.employeeId === currentUser.id &&
      t.branchId === activeBranchId &&
      t.monthYear === currentMonth
  );
  const permanentTasks = branchTasks.filter((t) => t.type === "permanent");
  const variableTasks = branchTasks.filter((t) => t.type === "variable");

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

  const today = new Date();
  const todayDay = today.getMonth() + 1 === parseInt(currentMonth.split("-")[1]) &&
    today.getFullYear() === parseInt(currentMonth.split("-")[0])
    ? today.getDate() : null;

  const totalTasks = branchTasks.length;
  const completedTasks = branchTasks.filter((t) => t.scheduledDates.length > 0 &&
    t.scheduledDates.every((d) => t.completedDates.includes(d)) && t.scheduledDates.length > 0).length;
  const conversionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const TASK_COL_WIDTH = 220;
  const DATE_COL_WIDTH = 32;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Branch tabs + stats */}
      <div className="px-6 pt-5 pb-0 flex items-start justify-between gap-4 flex-shrink-0">
        <div className="flex gap-1">
          {userBranches.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBranchId(b.id)}
              className={`px-4 py-2 text-xs font-medium rounded-t-md transition-colors border-b-2 ${
                activeBranchId === b.id
                  ? "border-accent text-accent bg-accent/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pb-2">
          <span>
            Всего задач: <strong className="text-foreground">{totalTasks}</strong>
          </span>
          <span>
            Выполнено:{" "}
            <strong className="text-success">{completedTasks}</strong>
          </span>
          <span>
            Конверсия:{" "}
            <strong className={conversionRate >= 70 ? "text-success" : conversionRate >= 40 ? "text-warning" : "text-destructive"}>
              {conversionRate}%
            </strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6 pt-0">
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: TASK_COL_WIDTH + days.length * DATE_COL_WIDTH + 60 }}>
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
                        <span className={`text-[10px] font-normal ${isWeekend(day, currentMonth) ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {getWeekdayName(day, currentMonth)}
                        </span>
                        <span className={`text-xs font-mono font-medium leading-none ${todayDay === day ? "text-accent" : isWeekend(day, currentMonth) ? "text-muted-foreground" : "text-foreground"}`}>
                          {day}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Permanent tasks section */}
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
                    canEdit={currentUser.role === "director"}
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
                    <td colSpan={days.length + 2} className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border">
                      Постоянные задачи назначает директор
                    </td>
                  </tr>
                )}

                {/* Variable tasks section */}
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
                    canEdit
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
                    <td colSpan={days.length + 2} className="px-4 py-4 text-xs text-muted-foreground italic">
                      Нет переменных задач
                    </td>
                  </tr>
                )}

                {/* Add task row */}
                {addingTask ? (
                  <tr className="border-t border-border bg-accent/3">
                    <td className="px-4 py-2 sticky left-0 bg-background z-10" style={{ width: TASK_COL_WIDTH }}>
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
                          onChange={(e) => setNewTaskType(e.target.value as "permanent" | "variable")}
                          className="text-xs border border-border rounded px-1.5 py-1.5 outline-none bg-background"
                        >
                          <option value="variable">Переменная</option>
                          {currentUser.role === "director" && <option value="permanent">Постоянная</option>}
                        </select>
                        <button onClick={addTask} className="text-success hover:opacity-80">
                          <Icon name="Check" size={14} />
                        </button>
                        <button onClick={() => setAddingTask(false)} className="text-muted-foreground hover:text-destructive">
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
            <span>Запланировано (нажмите ячейку)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm cell-done" />
            <span>Выполнено (нажмите ещё раз)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-muted border border-border" />
            <span>Нажмите ещё раз чтобы снять</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        className="px-4 py-2 sticky left-0 bg-card z-10 border-r border-border"
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
                <button onClick={() => onStartEdit(task)} className="text-muted-foreground hover:text-foreground">
                  <Icon name="Pencil" size={11} />
                </button>
                <button onClick={() => onDelete(task.id)} className="text-muted-foreground hover:text-destructive">
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
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full badge-${category.color}`}>
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
            className={`border-r border-border last:border-r-0 cursor-pointer transition-colors text-center
              ${isWeekend(day, currentMonth) ? "bg-muted/30" : ""}
              ${todayDay === day ? "bg-accent/5" : ""}
              ${state === "done" ? "cell-done" : state === "planned" ? "cell-planned" : "cell-hover"}
            `}
            style={{ width: 32, height: 36 }}
          >
            {state === "done" && (
              <span className="text-[10px] font-mono">✓</span>
            )}
            {state === "planned" && (
              <span className="text-[10px] font-mono opacity-60">·</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
