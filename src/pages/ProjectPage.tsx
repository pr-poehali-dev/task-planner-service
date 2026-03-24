import { useState } from "react";
import Icon from "@/components/ui/icon";
import { createProject, joinProject } from "@/store/api";
import { loadProjectInfo } from "@/store/persist";

type Mode = "select" | "create" | "join" | "created";

interface Props {
  onProjectReady: (projectId: string, projectName: string, inviteCode: string, data: unknown) => void;
}

export default function ProjectPage({ onProjectReady }: Props) {
  const savedProject = loadProjectInfo();

  const [mode, setMode] = useState<Mode>("select");
  const [projectName, setProjectName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // After create — store these to show invite code screen
  const [createdProjectId, setCreatedProjectId] = useState("");
  const [createdProjectName, setCreatedProjectName] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [createdData, setCreatedData] = useState<unknown>(null);
  const [codeCopied, setCodeCopied] = useState(false);

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
      setCreatedProjectId(result.projectId);
      setCreatedProjectName(result.name);
      setCreatedInviteCode(result.inviteCode);
      setCreatedData(result.data);
      setMode("created");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания проекта");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteInput.trim()) {
      setError("Введите код приглашения");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await joinProject(inviteInput.trim().toUpperCase());
      onProjectReady(result.projectId, result.name, result.inviteCode, result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Проект не найден");
    } finally {
      setLoading(false);
    }
  }

  function handleContinueWithCreated() {
    onProjectReady(createdProjectId, createdProjectName, createdInviteCode, createdData);
  }

  function handleContinueSaved() {
    if (savedProject) {
      onProjectReady(savedProject.projectId, savedProject.name, savedProject.inviteCode, null);
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleInviteInputChange(value: string) {
    // Auto-uppercase and allow only valid characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setInviteInput(cleaned);
    setError("");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <Icon name="Zap" size={18} className="text-background" />
          </div>
          <span className="text-xl font-semibold text-foreground tracking-tight">Планер</span>
        </div>

        {/* Card */}
        <div className="border border-border rounded-2xl bg-card p-8 shadow-sm">

          {/* ── Select Mode ──────────────────────────────────────── */}
          {mode === "select" && (
            <>
              <h1 className="text-lg font-semibold text-foreground mb-1">Проект</h1>
              <p className="text-xs text-muted-foreground mb-6">
                Создайте новый проект или присоединитесь к существующему
              </p>

              {/* Saved project shortcut */}
              {savedProject && (
                <div className="mb-5 p-3 rounded-lg border border-accent/30 bg-accent/5 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="FolderOpen" size={14} className="text-accent" />
                    <span className="text-sm font-medium text-foreground">{savedProject.name}</span>
                  </div>
                  <button
                    onClick={handleContinueSaved}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-foreground text-background hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="ArrowRight" size={14} />
                    Продолжить
                  </button>
                  <button
                    onClick={() => setMode("select")}
                    className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
                  >
                    Другой проект
                  </button>
                </div>
              )}

              <div className="grid gap-3">
                <button
                  onClick={() => { setMode("create"); setError(""); }}
                  className="flex items-center gap-3 px-4 py-4 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                    <Icon name="Plus" size={18} className="text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Создать проект</p>
                    <p className="text-xs text-muted-foreground">Новый проект для вашей команды</p>
                  </div>
                </button>

                <button
                  onClick={() => { setMode("join"); setError(""); }}
                  className="flex items-center gap-3 px-4 py-4 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                    <Icon name="UserPlus" size={18} className="text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">У меня есть код</p>
                    <p className="text-xs text-muted-foreground">Присоединиться по коду приглашения</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Create Mode ──────────────────────────────────────── */}
          {mode === "create" && (
            <>
              <button
                onClick={() => { setMode("select"); setError(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <Icon name="ArrowLeft" size={12} />
                Назад
              </button>

              <h1 className="text-lg font-semibold text-foreground mb-1">Новый проект</h1>
              <p className="text-xs text-muted-foreground mb-6">
                Заполните данные для создания проекта
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-foreground mb-2">
                  Название проекта
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => { setProjectName(e.target.value); setError(""); }}
                  placeholder="Например: Мой бизнес"
                  autoFocus
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none transition-colors bg-background focus:border-accent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-foreground mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => { setOwnerName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Имя Фамилия"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none transition-colors bg-background focus:border-accent"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive mb-4 flex items-center gap-1">
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
                    <Icon name="Plus" size={14} />
                    Создать проект
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Created — Show Invite Code ────────────────────────── */}
          {mode === "created" && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Icon name="Check" size={24} className="text-success" />
                </div>
                <h1 className="text-lg font-semibold text-foreground mb-1">Проект создан</h1>
                <p className="text-xs text-muted-foreground">
                  Поделитесь этим кодом с коллегами
                </p>
              </div>

              <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-2">Код приглашения</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-bold text-foreground tracking-widest font-mono">
                    {createdInviteCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(createdInviteCode)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Копировать код"
                  >
                    <Icon name={codeCopied ? "Check" : "Copy"} size={16} className={codeCopied ? "text-success" : ""} />
                  </button>
                </div>
                {codeCopied && (
                  <p className="text-xs text-success mt-1 animate-fade-in">Скопировано</p>
                )}
              </div>

              <div className="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs text-foreground">
                  <span className="font-medium">Проект:</span> {createdProjectName}
                </p>
              </div>

              <button
                onClick={handleContinueWithCreated}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-foreground text-background hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Icon name="ArrowRight" size={14} />
                Продолжить
              </button>
            </>
          )}

          {/* ── Join Mode ────────────────────────────────────────── */}
          {mode === "join" && (
            <>
              <button
                onClick={() => { setMode("select"); setError(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <Icon name="ArrowLeft" size={12} />
                Назад
              </button>

              <h1 className="text-lg font-semibold text-foreground mb-1">Присоединиться</h1>
              <p className="text-xs text-muted-foreground mb-6">
                Введите код приглашения от вашего коллеги
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-foreground mb-2">
                  Код приглашения
                </label>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => handleInviteInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="PLAN-XXXXXX"
                  autoFocus
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none transition-colors bg-background focus:border-accent font-mono tracking-wider text-center uppercase"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive mb-4 flex items-center gap-1">
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
                    <Icon name="UserPlus" size={14} />
                    Присоединиться
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
