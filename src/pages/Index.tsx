import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import PlannerPage from "@/pages/PlannerPage";
import TeamPage from "@/pages/TeamPage";
import ManagementPage from "@/pages/ManagementPage";
import StatisticsPage from "@/pages/StatisticsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotesPage from "@/pages/NotesPage";
import FilesPage from "@/pages/FilesPage";
import Icon from "@/components/ui/icon";
import {
  DEFAULT_PERMISSIONS,
  type Branch,
  type Employee,
  type Category,
  type Task,
  type GroupGoal,
  type GroupTask,
  type PersonalGoal,
  type UserTaskType,
  type Note,
  type SharedFile,
} from "@/store/data";
import {
  loadFromStorage,
  saveToStorage,
  loadProjectInfo,
  saveProjectInfo,
  clearProjectInfo,
  type ProjectInfo,
} from "@/store/persist";
import { loadProjectData, saveProjectData } from "@/store/api";

export default function Index() {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(loadProjectInfo);
  const [projectLoading, setProjectLoading] = useState(true);

  const [activePage, setActivePage] = useState("planner");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupGoals, setGroupGoals] = useState<GroupGoal[]>([]);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>([]);
  const [personalGoals, setPersonalGoals] = useState<PersonalGoal[]>([]);
  const [userTaskTypes, setUserTaskTypes] = useState<UserTaskType[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [notificationShown, setNotificationShown] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyProjectData(d: Record<string, unknown>) {
    setBranches((d.branches as Branch[]) || []);
    setEmployees((d.employees as Employee[]) || []);
    setCategories((d.categories as Category[]) || []);
    setTasks((d.tasks as Task[]) || []);
    setGroupGoals((d.groupGoals as GroupGoal[]) || []);
    setGroupTasks((d.groupTasks as GroupTask[]) || []);
    setPersonalGoals((d.personalGoals as PersonalGoal[]) || []);
    setUserTaskTypes((d.userTaskTypes as UserTaskType[]) || []);
    setNotes((d.notes as Note[]) || []);
    setSharedFiles((d.files as SharedFile[]) || []);
    setPasswords((d.passwords as Record<string, string>) || {});
  }

  // ─── Load on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectInfo) {
      setProjectLoading(false);
      return;
    }
    loadProjectData(projectInfo.projectId)
      .then((result) => {
        applyProjectData(result.data);
        const savedUserId = localStorage.getItem("planner_current_user");
        if (savedUserId) {
          const emps = (result.data.employees as Employee[]) || [];
          const emp = emps.find((e) => e.id === savedUserId);
          if (emp) setCurrentUser(emp);
        }
        setProjectLoading(false);
      })
      .catch(() => {
        const saved = loadFromStorage();
        if (saved) {
          setBranches((saved.branches || []) as Branch[]);
          setEmployees((saved.employees || []) as Employee[]);
          setCategories((saved.categories || []) as Category[]);
          setTasks((saved.tasks || []) as Task[]);
          setGroupGoals((saved.groupGoals || []) as GroupGoal[]);
          setGroupTasks((saved.groupTasks || []) as GroupTask[]);
          setPersonalGoals((saved.personalGoals || []) as PersonalGoal[]);
          setUserTaskTypes((saved.userTaskTypes || []) as UserTaskType[]);
          setNotes((saved.notes || []) as Note[]);
          setSharedFiles((saved.files || []) as SharedFile[]);
          setPasswords(saved.passwords || {});
          if (saved.currentUserId) {
            const emps = (saved.employees || []) as Employee[];
            const emp = emps.find((e) => e.id === saved.currentUserId);
            if (emp) setCurrentUser(emp);
          }
        }
        setProjectLoading(false);
      });
  }, []);

  // ─── Persist ──────────────────────────────────────────────────────────
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
      notes,
      files: sharedFiles,
      passwords,
      currentUserId: currentUser?.id || null,
    });

    if (projectInfo) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveProjectData(projectInfo.projectId, {
          branches,
          employees,
          categories,
          tasks,
          groupGoals,
          groupTasks,
          personalGoals,
          userTaskTypes,
          notes,
          files: sharedFiles,
          passwords,
        }).catch(() => {});
      }, 2000);
    }
  }, [
    branches,
    employees,
    categories,
    tasks,
    groupGoals,
    groupTasks,
    personalGoals,
    userTaskTypes,
    notes,
    sharedFiles,
    passwords,
    currentUser,
    projectInfo,
  ]);

  useEffect(() => {
    if (!projectLoading) {
      persist();
    }
  }, [persist, projectLoading]);

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
      // not available
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────
  function handleLogin(emp: Employee) {
    setCurrentUser(emp);
    setActivePage("planner");
    setNotificationShown(false);
    localStorage.setItem("planner_current_user", emp.id);
  }

  function handleLogout() {
    setCurrentUser(null);
    setActivePage("planner");
    localStorage.removeItem("planner_current_user");
  }

  function handleProjectCreate(result: {
    projectId: string;
    inviteCode: string;
    name: string;
    data: Record<string, unknown>;
  }) {
    const info: ProjectInfo = {
      projectId: result.projectId,
      name: result.name,
      inviteCode: result.inviteCode,
    };
    saveProjectInfo(info);
    setProjectInfo(info);
    applyProjectData(result.data);
    setCurrentUser(null);
    localStorage.removeItem("planner_current_user");
  }

  function handleProjectJoin(result: {
    projectId: string;
    inviteCode: string;
    name: string;
    data: Record<string, unknown>;
  }) {
    const info: ProjectInfo = {
      projectId: result.projectId,
      name: result.name,
      inviteCode: result.inviteCode,
    };
    saveProjectInfo(info);
    setProjectInfo(info);
    applyProjectData(result.data);
    setCurrentUser(null);
    localStorage.removeItem("planner_current_user");
  }

  function handleProjectSwitch() {
    clearProjectInfo();
    setProjectInfo(null);
    setCurrentUser(null);
    setBranches([]);
    setEmployees([]);
    setCategories([]);
    setTasks([]);
    setGroupGoals([]);
    setGroupTasks([]);
    setPersonalGoals([]);
    setUserTaskTypes([]);
    setNotes([]);
    setSharedFiles([]);
    setPasswords({});
    localStorage.removeItem("planner_current_user");
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

  // ─── Loading ──────────────────────────────────────────────────────────
  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <Icon name="Zap" size={18} className="text-background" />
          </div>
          <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Загружаем проект...</p>
        </div>
      </div>
    );
  }

  // ─── Login ────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <LoginPage
        projectInfo={projectInfo}
        employees={employees}
        passwords={passwords}
        onLogin={handleLogin}
        onProjectCreate={handleProjectCreate}
        onProjectJoin={handleProjectJoin}
        onProjectSwitch={handleProjectSwitch}
      />
    );
  }

  // ─── Filtering ────────────────────────────────────────────────────────
  const isDirector = currentUser.role === "director";
  const userBranchIds = currentUser.branchIds;

  const visibleBranches = isDirector
    ? branches
    : branches.filter((b) => userBranchIds.includes(b.id));

  const visibleGoals = isDirector
    ? groupGoals
    : groupGoals.filter(
        (g) => g.branchId === "all" || userBranchIds.includes(g.branchId)
      );

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
      projectInfo={projectInfo}
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
          notes={notes}
          onNavigate={setActivePage}
        />
      )}
      {activePage === "team" &&
        (isDirector ||
          (currentUser.permissions || DEFAULT_PERMISSIONS)
            .canViewTeamPlanner) && (
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
      {activePage === "notes" && (
        <NotesPage
          currentUser={currentUser}
          employees={employees}
          notes={notes}
          onNotesChange={setNotes}
        />
      )}
      {activePage === "files" && (
        <FilesPage
          currentUser={currentUser}
          employees={employees}
          files={sharedFiles}
          onFilesChange={setSharedFiles}
        />
      )}
      {activePage === "profile" && (
        <ProfilePage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          onUserChange={handleUserChange}
          onNavigate={setActivePage}
          projectInfo={projectInfo}
        />
      )}
      {activePage === "settings" && (
        <div className="p-6 text-sm text-muted-foreground">
          Настройки — в разработке
        </div>
      )}
    </Layout>
  );
}