import { useState } from "react";
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
  EMPLOYEE_PASSWORDS,
  type Branch,
  type Employee,
  type Category,
  type Task,
  type GroupGoal,
  type GroupTask,
} from "@/store/data";

export default function Index() {
  const [activePage, setActivePage] = useState("planner");
  const [currentMonth, setCurrentMonth] = useState("2026-03");
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>(EMPLOYEE_PASSWORDS);

  const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [groupGoals, setGroupGoals] = useState<GroupGoal[]>(MOCK_GROUP_GOALS);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>(MOCK_GROUP_TASKS);

  function handleLogin(emp: Employee) {
    setCurrentUser(emp);
    setActivePage("planner");
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

  // ─── Экран входа ────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <LoginPage
        employees={employees}
        onLogin={handleLogin}
        passwords={passwords}
      />
    );
  }

  // ─── Фильтрация по роли ─────────────────────────────────────────────────
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

  const visibleEmployees = isDirector ? employees : employees;

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
          employees={visibleEmployees}
          categories={categories}
          tasks={tasks}
          onTasksChange={setTasks}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "team" && (
        <TeamPage
          currentUser={currentUser}
          branches={isDirector ? branches : visibleBranches}
          employees={visibleEmployees}
          categories={categories}
          groupGoals={visibleGoals}
          groupTasks={visibleGroupTasks}
          tasks={tasks}
          onGroupGoalsChange={setGroupGoals}
          onGroupTasksChange={setGroupTasks}
          onTasksChange={setTasks}
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
          onBranchesChange={setBranches}
          onEmployeesChange={setEmployees}
          onCategoriesChange={setCategories}
          onPasswordChange={handlePasswordChange}
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
