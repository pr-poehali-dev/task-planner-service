import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Employee } from "@/store/data";
import { type ProjectInfo } from "@/store/persist";
import { createProject, joinProject } from "@/store/api";

type Screen = "welcome" | "create" | "join" | "created" | "login";

interface Props {
  projectInfo: ProjectInfo | null;
  employees: Employee[];
  passwords: Record<string, string>;
  onLogin: (employee: Employee) => void;
  onProjectCreate: (data: {
    projectId: string;
    inviteCode: string;
    name: string;
    data: Record<string, unknown>;
  }) => void;
  onProjectJoin: (data: {
    projectId: string;
    inviteCode: string;
    name: string;
    data: Record<string, unknown>;
  }) => void;
  onProjectSwitch: () => void;
}

export default function LoginPage({
  projectInfo,
  employees,
  passwords,
  onLogin,
  onProjectCreate,
  onProjectJoin,
  onProjectSwitch,
}: Props) {
  const initialScreen: Screen =
    projectInfo && employees.length > 0 ? "login" : "welcome";
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [projectName, setProjectName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [createdResult, setCreatedResult] = useState<{
    projectId: string;
    inviteCode: string;
    name: string;
    data: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [selectedId, setSelectedId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const selectedEmployee = employees.find((e) => e.id === selectedId);

  function handleEmployeeLogin() {
    if (!selectedId) {
      setLoginError("Выберите сотрудника");
      return;
    }
    if (!password) {
      setLoginError("Введите пароль");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    setTimeout(() => {
      if (password === passwords[selectedId]) {
        const emp = employees.find((e) => e.id === selectedId)!;
        onLogin(emp);
      } else {
        setLoginError("Неверный пароль");
        setLoginLoading(false);
      }
    }, 600);
  }

  async function handleCreate() {
    if (!projectName.trim()) {
      setError("Введите название проекта");
      return;
    }
    if (!ownerName.trim()) {
      setError("Введите ваше имя");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await createProject(projectName.trim(), ownerName.trim());
      setCreatedCode(result.inviteCode);
      setCreatedResult(result);
      setScreen("created");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка создания проекта");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      setError("Введите код проекта");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await joinProject(inviteCode.trim());
      onProjectJoin(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Проект не найден");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleEnterProject() {
    if (createdResult) {
      onProjectCreate(createdResult);
    }
  }

  const roleColors: Record<string, string> = {
    director: "bg-destructive/10 text-destructive",
    manager: "bg-accent/10 text-accent",
    marketer: "bg-success/10 text-success",
    custom: "bg-muted text-muted-foreground",
  };

  const logo = (
    <div className="flex items-center justify-center gap-3 mb-10">
      <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
        <Icon name="Zap" size={18} className="text-background" />
      </div>
      <span className="text-xl font-semibold text-foreground tracking-tight">
        Планер
      </span>
    </div>
  );

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          {logo}
          <div className="border border-border rounded-2xl bg-card p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-foreground mb-1">
              Добро пожаловать
            </h1>
            <p className="text-xs text-muted-foreground mb-6">
              Создайте проект или присоединитесь к существующему
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setScreen("create");
                  setError("");
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 border border-border rounded-xl hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Icon
                    name="Plus"
                    size={16}
                    className="text-accent"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Создать проект
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Новое рабочее пространство
                  </p>
                </div>
                <Icon
                  name="ChevronRight"
                  size={13}
                  className="ml-auto text-muted-foreground"
                />
              </button>
              <button
                onClick={() => {
                  setScreen("join");
                  setError("");
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 border border-border rounded-xl hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Icon
                    name="Users"
                    size={16}
                    className="text-muted-foreground group-hover:text-accent transition-colors"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Присоединиться
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    У меня есть код проекта
                  </p>
                </div>
                <Icon
                  name="ChevronRight"
                  size={13}
                  className="ml-auto text-muted-foreground"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "create") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          {logo}
          <div className="border border-border rounded-2xl bg-card p-8 shadow-sm">
            <button
              onClick={() => setScreen("welcome")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
            >
              <Icon name="ArrowLeft" size={13} />
              Назад
            </button>
            <h1 className="text-lg font-semibold text-foreground mb-1">
              Новый проект
            </h1>
            <p className="text-xs text-muted-foreground mb-6">
              Создайте рабочее пространство для команды
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Название проекта
                </label>
                <input
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setError("");
                  }}
                  placeholder="Мой бизнес"
                  autoFocus
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-accent bg-background transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Ваше имя
                </label>
                <input
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Иван Петров"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-accent bg-background transition-colors"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <Icon name="AlertCircle" size={11} />
                  {error}
                </p>
              )}
              <button
                onClick={handleCreate}
                disabled={loading}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    Создаём...
                  </>
                ) : (
                  <>
                    <Icon name="Rocket" size={14} />
                    Создать проект
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "created") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          {logo}
          <div className="border border-border rounded-2xl bg-card p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="Check" size={22} className="text-success" />
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-1">
              Проект создан!
            </h1>
            <p className="text-xs text-muted-foreground mb-6">
              Отправьте этот код коллегам для доступа
            </p>
            <div className="bg-muted rounded-xl p-4 mb-4">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                Код проекта
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-foreground tracking-widest font-mono">
                  {createdCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Icon name={copied ? "Check" : "Copy"} size={16} />
                </button>
              </div>
              {copied && (
                <p className="text-[11px] text-success mt-1">Скопировано!</p>
              )}
            </div>
            <button
              onClick={handleEnterProject}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-foreground text-background hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Icon name="ArrowRight" size={14} />
              Войти в проект
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          {logo}
          <div className="border border-border rounded-2xl bg-card p-8 shadow-sm">
            <button
              onClick={() => setScreen("welcome")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
            >
              <Icon name="ArrowLeft" size={13} />
              Назад
            </button>
            <h1 className="text-lg font-semibold text-foreground mb-1">
              Присоединиться
            </h1>
            <p className="text-xs text-muted-foreground mb-6">
              Введите код, который вам прислали
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Код проекта
                </label>
                <input
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="PLAN-XXXXXX"
                  autoFocus
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-accent bg-background transition-colors font-mono tracking-wider text-center"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <Icon name="AlertCircle" size={11} />
                  {error}
                </p>
              )}
              <button
                onClick={handleJoin}
                disabled={loading}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    Подключаемся...
                  </>
                ) : (
                  <>
                    <Icon name="Users" size={14} />
                    Присоединиться
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {logo}
        <div className="border border-border rounded-2xl bg-card p-8 shadow-sm">
          {projectInfo && (
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <Icon name="FolderOpen" size={13} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {projectInfo.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {projectInfo.inviteCode}
                </p>
              </div>
              <button
                onClick={onProjectSwitch}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-foreground/20 transition-colors"
              >
                Сменить
              </button>
            </div>
          )}
          <h1 className="text-lg font-semibold text-foreground mb-1">
            Вход в систему
          </h1>
          <p className="text-xs text-muted-foreground mb-6">
            Выберите сотрудника и введите пароль
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-foreground mb-2">
              Сотрудник
            </label>
            <div className="grid gap-2">
              {employees.map((emp) => {
                const initials = emp.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2);
                const isSelected = selectedId === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedId(emp.id);
                      setPassword("");
                      setLoginError("");
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected
                          ? "bg-accent text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {emp.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {emp.roleLabel}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        roleColors[emp.role] || roleColors.custom
                      }`}
                    >
                      {emp.roleLabel}
                    </span>
                    {isSelected && (
                      <Icon
                        name="Check"
                        size={14}
                        className="text-accent flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {selectedEmployee && (
            <div className="mb-4 animate-fade-in">
              <label className="block text-xs font-medium text-foreground mb-2">
                Пароль для{" "}
                <span className="text-accent">
                  {selectedEmployee.name.split(" ")[0]}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmployeeLogin()}
                  placeholder="Введите пароль"
                  autoFocus
                  className={`w-full text-sm border rounded-lg px-3 py-2.5 pr-10 outline-none transition-colors bg-background ${
                    loginError
                      ? "border-destructive focus:border-destructive"
                      : "border-border focus:border-accent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={14} />
                </button>
              </div>
              {loginError && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <Icon name="AlertCircle" size={11} />
                  {loginError}
                </p>
              )}
            </div>
          )}
          <button
            onClick={handleEmployeeLogin}
            disabled={loginLoading || !selectedId}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              loginLoading || !selectedId
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
            }`}
          >
            {loginLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                Входим...
              </>
            ) : (
              <>
                <Icon name="LogIn" size={14} />
                Войти
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
