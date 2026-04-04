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
import SchedulePage from "@/pages/SchedulePage";
import Icon from "@/components/ui/icon";
import {
  MOCK_BRANCHES,
  MOCK_EMPLOYEES,
  MOCK_CATEGORIES,
  MOCK_TASKS,
  MOCK_GROUP_GOALS,
  MOCK_GROUP_TASKS,
  MOCK_PERSONAL_GOALS,
  MOCK_USER_TASK_TYPES,
  MOCK_NOTES,
  MOCK_FILES,
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
import { saveProjectData, loadProjectData } from "@/store/api";

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
      notes: (saved.notes || MOCK_NOTES) as Note[],
      files: (saved.files || MOCK_FILES) as SharedFile[],
      passwords: saved.passwords || EMPLOYEE_PASSWORDS,
      currentUserId: saved.currentUserId,
    };
  }
  return {
    branches: [] as Branch[],
    employees: [] as Employee[],
    categories: [] as Category[],
    tasks: [] as Task[],
    groupGoals: [] as GroupGoal[],
    groupTasks: [] as GroupTask[],
    personalGoals: [] as PersonalGoal[],
    userTaskTypes: [] as UserTaskType[],
    notes: [] as Note[],
    files: [] as SharedFile[],
    passwords: {} as Record<string, string>,
    currentUserId: null as string | null,
  };
}

export default function Index() {
  const initial = getInitialState();
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(loadProjectInfo);
  const [projectLoading, setProjectLoading] = useState(false);

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
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>(initial.files);
  const [passwords, setPasswords] = useState<Record<string, string>>(initial.passwords);
  const [currentUser, setCurrentUser] = useState<Employee | null>(
    initial.currentUserId
      ? initial.employees.find((e: Employee) => e.id === initial.currentUserId) || null
      : null
  );
  const [notificationShown, setNotificationShown] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataVersionRef = useRef(0);

  function collectData() {
    return {
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
    };
  }

  function applyProjectData(data: Record<string, unknown>) {
    if (data.branches) setBranches(data.branches as Branch[]);
    if (data.employees) setEmployees(data.employees as Employee[]);
    if (data.categories) setCategories(data.categories as Category[]);
    if (data.tasks) setTasks(data.tasks as Task[]);
    if (data.groupGoals) setGroupGoals(data.groupGoals as GroupGoal[]);
    if (data.groupTasks) setGroupTasks(data.groupTasks as GroupTask[]);
    if (data.personalGoals) setPersonalGoals(data.personalGoals as PersonalGoal[]);
    if (data.userTaskTypes) setUserTaskTypes(data.userTaskTypes as UserTaskType[]);
    if (data.notes) setNotes(data.notes as Note[]);
    if (data.files) setSharedFiles(data.files as SharedFile[]);
    if (data.passwords) setPasswords(data.passwords as Record<string, string>);
  }

  // Load project from server on start
  useEffect(() => {
    if (!projectInfo) return;
    setProjectLoading(true);
    loadProjectData(projectInfo.projectId)
      .then((result) => {
        applyProjectData(result.data);
      })
      .catch(() => {})
      .finally(() => setProjectLoading(false));
  }, [projectInfo?.projectId]);

  // ─── Persist locally ──────────────────────────────────────────────────
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
  }, [branches, employees, categories, tasks, groupGoals, groupTasks, personalGoals, userTaskTypes, notes, sharedFiles, passwords, currentUser]);

  useEffect(() => {
    persist();
  }, [persist]);

  // ─── Auto-save to server (debounced) ─────────────────────────────────
  useEffect(() => {
    if (!projectInfo) return;
    dataVersionRef.current += 1;
    const ver = dataVersionRef.current;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (ver !== dataVersionRef.current) return;
      saveProjectData(projectInfo.projectId, collectData()).catch(() => {});
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [branches, employees, categories, tasks, groupGoals, groupTasks, personalGoals, userTaskTypes, notes, sharedFiles, passwords, projectInfo]);

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

  // ─── Project handlers ────────────────────────────────────────────────
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
    const emps = (result.data.employees || []) as Employee[];
    if (emps.length === 1) {
      setCurrentUser(emps[0]);
    } else {
      setCurrentUser(null);
      localStorage.removeItem("planner_current_user");
    }
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
    saveToStorage({
      branches: [],
      employees: [],
      categories: [],
      tasks: [],
      groupGoals: [],
      groupTasks: [],
      personalGoals: [],
      userTaskTypes: [],
      notes: [],
      files: [],
      passwords: {},
      currentUserId: null,
    });
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

  // ─── Loading ────────────────────────────────────────────────────────────
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

  // ─── Login ──────────────────────────────────────────────────────────────
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

  // ─── Filtering ──────────────────────────────────────────────────────────
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
          onGroupGoalsChange={setGroupGoals}
          onGroupTasksChange={setGroupTasks}
          tasks={tasks}
          onTasksChange={handleTasksChange}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "management" && isDirector && (
        <ManagementPage
          currentUser={currentUser}
          branches={branches}
          employees={employees}
          categories={categories}
          onBranchesChange={setBranches}
          onEmployeesChange={setEmployees}
          onCategoriesChange={setCategories}
          passwords={passwords}
          onPasswordChange={handlePasswordChange}
          tasks={tasks}
          onTasksChange={handleTasksChange}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "statistics" && (
        <StatisticsPage
          currentUser={currentUser}
          branches={visibleBranches}
          employees={employees}
          categories={categories}
          tasks={tasks}
          groupGoals={visibleGoals}
          groupTasks={visibleGroupTasks}
          currentMonth={currentMonth}
        />
      )}
      {activePage === "schedule" && (
        <SchedulePage
          currentUser={currentUser}
          branches={isDirector ? branches : visibleBranches}
          employees={employees}
        />
      )}
      {activePage === "notes" && (
        <NotesPage
          currentUser={currentUser}
          notes={notes}
          onNotesChange={setNotes}
          employees={employees}
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
    </Layout>
  );
}