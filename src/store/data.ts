export type Role = "director" | "manager" | "marketer" | "custom";

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export interface Employee {
  id: string;
  name: string;
  role: Role | string;
  roleLabel: string;
  branchIds: string[];
  avatar?: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  color: "high" | "medium" | "low";
}

export type TaskType = "permanent" | "variable";
export type TaskStatus = "pending" | "done" | "in-progress";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  employeeId: string;
  branchId: string;
  categoryId?: string;
  monthYear: string; // "2026-03"
  scheduledDates: number[];
  completedDates: number[];
  repeat?: "weekly" | "daily" | "none";
  repeatDays?: number[]; // 0=Sun,1=Mon,...
  fromGroupTaskId?: string;
  deadline?: number;
}

export interface GroupGoal {
  id: string;
  title: string;
  branchId: string;
}

export interface GroupTask {
  id: string;
  goalId: string;
  title: string;
  branchId: string;
  deadline: string; // ISO date "2026-03-20"
  categoryId: string;
  assignedEmployeeId: string;
  monthYear: string;
  completedByEmployee?: boolean;
}

export interface AppState {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  tasks: Task[];
  groupGoals: GroupGoal[];
  groupTasks: GroupTask[];
  currentMonth: string; // "2026-03"
  activePage: string;
  selectedBranchId: string | null;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────

export const MOCK_BRANCHES: Branch[] = [
  { id: "b1", name: "Центральный", city: "Москва" },
  { id: "b2", name: "Северный", city: "Санкт-Петербург" },
  { id: "b3", name: "Южный", city: "Краснодар" },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: "c1", name: "Срочно", color: "high" },
  { id: "c2", name: "Важно", color: "medium" },
  { id: "c3", name: "Плановое", color: "low" },
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "e1",
    name: "Александр Петров",
    role: "director",
    roleLabel: "Директор",
    branchIds: ["b1", "b2", "b3"],
    email: "director@company.ru",
  },
  {
    id: "e2",
    name: "Мария Иванова",
    role: "manager",
    roleLabel: "Управляющий",
    branchIds: ["b1", "b2"],
    email: "manager@company.ru",
  },
  {
    id: "e3",
    name: "Дмитрий Козлов",
    role: "marketer",
    roleLabel: "Маркетолог",
    branchIds: ["b1"],
    email: "marketing@company.ru",
  },
  {
    id: "e4",
    name: "Ольга Смирнова",
    role: "manager",
    roleLabel: "Управляющий",
    branchIds: ["b3"],
    email: "manager2@company.ru",
  },
];

export const MOCK_TASKS: Task[] = [
  // Permanent tasks for e2 in b1
  {
    id: "t1",
    title: "Утренний обход торгового зала",
    type: "permanent",
    employeeId: "e2",
    branchId: "b1",
    categoryId: "c3",
    monthYear: "2026-03",
    scheduledDates: [1,2,3,4,5,8,9,10,11,12,15,16,17,18,19,22,23,24,25,26,29,30,31],
    completedDates: [1,2,3,4,5,8,9,10,11],
    repeat: "weekly",
    repeatDays: [1,2,3,4,5],
  },
  {
    id: "t2",
    title: "Отчёт по выручке за день",
    type: "permanent",
    employeeId: "e2",
    branchId: "b1",
    categoryId: "c2",
    monthYear: "2026-03",
    scheduledDates: [1,2,3,4,5,8,9,10,11,12,15,16,17,18,19,22,23,24,25,26,29,30,31],
    completedDates: [1,2,3,4,5,8,9],
    repeat: "weekly",
    repeatDays: [1,2,3,4,5],
  },
  {
    id: "t3",
    title: "Проверка товарных остатков",
    type: "permanent",
    employeeId: "e2",
    branchId: "b1",
    categoryId: "c3",
    monthYear: "2026-03",
    scheduledDates: [3,10,17,24,31],
    completedDates: [3,10,17],
    repeat: "weekly",
    repeatDays: [2],
  },
  // Variable tasks for e2 in b1
  {
    id: "t4",
    title: "Провести собеседование с кандидатом",
    type: "variable",
    employeeId: "e2",
    branchId: "b1",
    categoryId: "c1",
    monthYear: "2026-03",
    scheduledDates: [15],
    completedDates: [15],
  },
  {
    id: "t5",
    title: "Обновить ценники на новую коллекцию",
    type: "variable",
    employeeId: "e2",
    branchId: "b1",
    categoryId: "c2",
    monthYear: "2026-03",
    scheduledDates: [20, 21],
    completedDates: [],
    deadline: 21,
  },
  // Tasks for e3 marketer in b1
  {
    id: "t6",
    title: "Публикация в социальных сетях",
    type: "permanent",
    employeeId: "e3",
    branchId: "b1",
    categoryId: "c3",
    monthYear: "2026-03",
    scheduledDates: [1,3,5,8,10,12,15,17,19,22,24,26,29,31],
    completedDates: [1,3,5,8,10,12,15],
    repeat: "weekly",
    repeatDays: [1,3,5],
  },
  {
    id: "t7",
    title: "Анализ конкурентов",
    type: "variable",
    employeeId: "e3",
    branchId: "b1",
    categoryId: "c2",
    monthYear: "2026-03",
    scheduledDates: [14, 28],
    completedDates: [14],
    fromGroupTaskId: "gt1",
  },
  // Tasks for e2 in b2
  {
    id: "t8",
    title: "Утренний обход торгового зала",
    type: "permanent",
    employeeId: "e2",
    branchId: "b2",
    categoryId: "c3",
    monthYear: "2026-03",
    scheduledDates: [1,2,3,4,5,8,9,10,11,12],
    completedDates: [1,2,3,4,5],
  },
];

export const MOCK_GROUP_GOALS: GroupGoal[] = [
  { id: "gg1", title: "Увеличить выручку на 15% к концу квартала", branchId: "b1" },
  { id: "gg2", title: "Запустить новую маркетинговую кампанию", branchId: "b1" },
  { id: "gg3", title: "Оптимизировать логистику поставок", branchId: "b2" },
];

export const MOCK_GROUP_TASKS: GroupTask[] = [
  {
    id: "gt1",
    goalId: "gg2",
    title: "Анализ конкурентов и рынка",
    branchId: "b1",
    deadline: "2026-03-28",
    categoryId: "c2",
    assignedEmployeeId: "e3",
    monthYear: "2026-03",
    completedByEmployee: false,
  },
  {
    id: "gt2",
    goalId: "gg2",
    title: "Разработать контент-план на апрель",
    branchId: "b1",
    deadline: "2026-03-25",
    categoryId: "c1",
    assignedEmployeeId: "e3",
    monthYear: "2026-03",
    completedByEmployee: false,
  },
  {
    id: "gt3",
    goalId: "gg1",
    title: "Провести акцию для постоянных клиентов",
    branchId: "b1",
    deadline: "2026-03-20",
    categoryId: "c1",
    assignedEmployeeId: "e2",
    monthYear: "2026-03",
    completedByEmployee: true,
  },
  {
    id: "gt4",
    goalId: "gg1",
    title: "Внедрить программу лояльности",
    branchId: "b1",
    deadline: "2026-03-31",
    categoryId: "c2",
    assignedEmployeeId: "e2",
    monthYear: "2026-03",
    completedByEmployee: false,
  },
  {
    id: "gt5",
    goalId: "gg3",
    title: "Пересмотреть договоры с поставщиками",
    branchId: "b2",
    deadline: "2026-03-22",
    categoryId: "c1",
    assignedEmployeeId: "e2",
    monthYear: "2026-03",
    completedByEmployee: false,
  },
];

export function getDaysInMonth(monthYear: string): number[] {
  const [year, month] = monthYear.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => i + 1);
}

export function getWeekdayName(day: number, monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const names = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  return names[date.getDay()];
}

export function isWeekend(day: number, monthYear: string): boolean {
  const [year, month] = monthYear.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0 || d.getDay() === 6;
}

export function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  const months = [
    "Январь","Февраль","Март","Апрель","Май","Июнь",
    "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
  ];
  return `${months[month - 1]} ${year}`;
}
