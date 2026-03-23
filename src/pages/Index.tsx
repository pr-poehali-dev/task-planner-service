import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import PlannerPage from "@/pages/PlannerPage";
import TeamPage from "@/pages/TeamPage";
import ManagementPage from "@/pages/ManagementPage";
import StatisticsPage from "@/pages/StatisticsPage";
import ProfilePage from "@/pages/ProfilePage";
import {
  MOCK_BRANCHES,
  MOCK_EMPLOYEES,
  MOCK_CATEGORIES,
  MOCK_TASKS,
  MOCK_GROUP_GOALS,
  MOCK_GROUP_TASKS,
  MOCK_PERSONAL_GOALS,
  MOCK_USER_TASK_TYPES,
  EMPLOYEE_PASSWORDS,
  DEFAULT_PERMISSIONS,
  type Branch,
  type Employee,
  type Category,
  type Task,
  type GroupGoal,
  type GroupTask,
  type PersonalGoal,
  type UserTaskType,
} from "@/store/data";
import { loadFromStorage, saveToStorage } from "@/store/persist";

function getInitialState() {
  const saved = loadFromStorage();
  if (saved) {
    return {
      branches: (saved.branches || MOCK_BRANCHES) as Branch[],
      employees: (saved.employees || MOCK_EMPLOYEES) as Employee[],
      categories: (saved.categories || MOCK_CATEGORIES) as Category[],
      tasks: (saved.tasks || MOCK_TASKS) as Task[],
      groupGoals: (saved.groupGoals || MOCK_GROUP_GOALS) as GroupGoal[],
      groupTasks: (saved.groupTasks || MOCK_GROUP_TASKS) as GroupTask[],
      personalGoals: (saved.personalGoals || MOCK_PERSONAL_GOALS) as PersonalGoal[],
      userTaskTypes: (saved.userTaskTypes || MOCK_USER_TASK_TYPES) as UserTaskType[],
      passwords: saved.passwords || EMPLOYEE_PASSWORDS,
      currentUserId: saved.currentUserId,
    };
  }
  return {
    branches: MOCK_BRANCHES,
    employees: MOCK_EMPLOYEES,
    categories: MOCK_CATEGORIES,
    tasks: MOCK_TASKS,
    groupGoals: MOCK_GROUP_GOALS,
    groupTasks: MOCK_GROUP_TASKS,
    personalGoals: MOCK_PERSONAL_GOALS,
    userTaskTypes: MOCK_USER_TASK_TYPES,
    passwords: EMPLOYEE_PASSWORDS,
    currentUserId: null as string | null,
  };
}

export default function Index() {
  const initial = getInitialState();

  const [activePage, setActivePage] = useState("planner");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [branches, setBranches] = useState<Branch[]>(initial.branches);
  const [employees, setEmployees] = useState<Employee[]>(initial.employees);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [groupGoals, setGroupGoals] = useState<GroupGoal[]>(initial.groupGoals);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>(initial.groupTasks);
  const [personalGoals, setPersonalGoals] = useState<PersonalGoal[]>(initial.personalGoals);
  const [userTaskTypes, setUserTaskTypes] = useState<UserTaskType[]>(initial.userTaskTypes);
  const [passwords, setPasswords] = useState<Record<string, string>>(initial.passwords);
  const [currentUser, setCurrentUser] = useState<Employee | null>(
    initial.currentUserId
      ? initial.employees.find((e: Employee) => e.id === initial.currentUserId) || null
      : null
  );
  const [notificationShown, setNotificationShown] = useState(false);

  // ─── Persist ────────────────────────────────────────────────────────────
  const persist = useCallback(() => {
    saveToStorage({
      branches,
      employees,
      categories,
      tasks,
      groupGoals,
      groupTasks,
      personalGoals,
      userTaskTypes,
      passwords,
      currentUserId: currentUser?.id || null,
    });
  }, [branches, employees, categories, tasks, groupGoals, groupTasks, personalGoals, userTaskTypes, passwords, currentUser]);

  useEffect(() => {
    persist();
  }, [persist]);

  // ─── Notifications ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || notificationShown) return;

    const now = new Date();
    const todayMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayDay = now.getDate();

    const todayTasks = tasks.filter(
      (t) =>
        t.employeeId === currentUser.id &&
        t.monthYear === todayMonthYear &&
        t.scheduledDates.includes(todayDay) &&
        !t.completedDates.includes(todayDay)
    );

    if (todayTasks.length === 0) return;

    setNotificationShown(true);

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        showNotification(todayTasks.length);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            showNotification(todayTasks.length);
          }
        });
      }
    }
  }, [currentUser, tasks, notificationShown]);

  function showNotification(count: number) {
    try {
      new Notification("Планер — задачи на сегодня", {
        body: `У вас ${count} ${count === 1 ? "невыполненная задача" : count < 5 ? "невыполненные задачи" : "невыполненных задач"} на сегодня`,
        icon: "/favicon.svg",
      });
    } catch {
      // Notification not available
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────
  function handleLogin(emp: Employee) {
    setCurrentUser(emp);
    setActivePage("planner");
    setNotificationShown(false);
  }

  function handleLogout() {
    setCurrentUser(null);
    setActivePage("planner");
  }

  function handleUserChange(updated: Employee) {
    setCurrentUser(updated);
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handlePasswordChange(empId: string, newPassword: string) {
    setPasswords((prev) => ({ ...prev, [empId]: newPassword }));
  }

  function handleTasksChange(newTasks: Task[]) {
    setTasks(newTasks);
  }

  // ─── Login ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <LoginPage
        employees={employees}
        onLogin={handleLogin}
        passwords={passwords}
      />
    );
  }

  // ─── Filtering ─────────────────────────────────────────────────────────
  const isDirector = currentUser.role === "director";
  const userBranchIds = currentUser.branchIds;

  const visibleBranches = isDirector
    ? branches
    : branches.filter((b) => userBranchIds.includes(b.id));

  const visibleGoals = isDirector
    ? groupGoals
    : groupGoals.filter((g) => g.branchId === "all" || userBranchIds.includes(g.branchId));

  const visibleGroupTasks = isDirector
    ? groupTasks
    : groupTasks.filter((gt) => userBranchIds.includes(gt.branchId));

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      currentUser={currentUser}
      currentMonth={currentMonth}
      onMonthChange={setCurrentMonth}
      onLogout={handleLogout}
    >
      {activePage === "planner" && (
        <PlannerPage
          currentUser={currentUser}
          branches={visibleBranches}
          employees={employees}
          categories={categories}
          tasks={tasks}
          onTasksChange={handleTasksChange}
          currentMonth={currentMonth}
          personalGoals={personalGoals}
          onPersonalGoalsChange={setPersonalGoals}
          userTaskTypes={userTaskTypes}
          onUserTaskTypesChange={setUserTaskTypes}
        />
      )}
      {activePage === "team" && (isDirector || (currentUser.permissions || DEFAULT_PERMISSIONS).canViewTeamPlanner) && (
        <TeamPage
          currentUser={currentUser}
          branches={isDirector ? branches : visibleBranches}
          employees={employees}
          categories={categories}
          groupGoals={visibleGoals}
          groupTasks={visibleGroupTasks}
          tasks={tasks}
          onGroupGoalsChange={setGroupGoals}
          onGroupTasksChange={setGroupTasks}
          onTasksChange={handleTasksChange}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "management" && (
        <ManagementPage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          categories={categories}
          passwords={passwords}
          tasks={tasks}
          onBranchesChange={setBranches}
          onEmployeesChange={setEmployees}
          onCategoriesChange={setCategories}
          onPasswordChange={handlePasswordChange}
          onTasksChange={handleTasksChange}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "statistics" && (
        <StatisticsPage
          employees={isDirector ? employees : [currentUser]}
          branches={isDirector ? branches : visibleBranches}
          tasks={tasks}
          groupTasks={isDirector ? groupTasks : visibleGroupTasks}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "profile" && (
        <ProfilePage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          onUserChange={handleUserChange}
          onNavigate={setActivePage}
        />
      )}
      {activePage === "settings" && (
        <div className="p-6 text-sm text-muted-foreground">Настройки — в разработке</div>
      )}
    </Layout>
  );
}