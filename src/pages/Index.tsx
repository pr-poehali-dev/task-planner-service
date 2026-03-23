import { useState } from "react";
import Layout from "@/components/Layout";
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

  const [currentUser, setCurrentUser] = useState<Employee>(MOCK_EMPLOYEES[0]);
  const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [groupGoals, setGroupGoals] = useState<GroupGoal[]>(MOCK_GROUP_GOALS);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>(MOCK_GROUP_TASKS);

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      currentUser={currentUser}
      currentMonth={currentMonth}
      onMonthChange={setCurrentMonth}
    >
      {activePage === "planner" && (
        <PlannerPage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          categories={categories}
          tasks={tasks}
          onTasksChange={setTasks}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "team" && (
        <TeamPage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          categories={categories}
          groupGoals={groupGoals}
          groupTasks={groupTasks}
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
          onBranchesChange={setBranches}
          onEmployeesChange={setEmployees}
          onCategoriesChange={setCategories}
        />
      )}
      {activePage === "statistics" && (
        <StatisticsPage
          employees={employees}
          branches={branches}
          tasks={tasks}
          groupTasks={groupTasks}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "profile" && (
        <ProfilePage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          onUserChange={(updated) => {
            setCurrentUser(updated);
            setEmployees((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
          }}
          onNavigate={setActivePage}
        />
      )}
      {activePage === "settings" && (
        <div className="p-6 text-sm text-muted-foreground">Настройки — в разработке</div>
      )}
    </Layout>
  );
}
