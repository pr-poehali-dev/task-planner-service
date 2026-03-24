import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Employee, EMPLOYEE_PASSWORDS } from "@/store/data";

interface Props {
  employees: Employee[];
  onLogin: (employee: Employee) => void;
  passwords: Record<string, string>;
}

export default function LoginPage({ employees, onLogin, passwords }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const selectedEmployee = employees.find((e) => e.id === selectedId);

  function handleLogin() {
    if (!selectedId) {
      setError("Выберите сотрудника");
      return;
    }
    if (!password) {
      setError("Введите пароль");
      return;
    }

    setLoading(true);
    setError("");

    // Имитируем небольшую задержку для ощущения реального входа
    setTimeout(() => {
      const correctPassword = passwords[selectedId];
      if (password === correctPassword) {
        const emp = employees.find((e) => e.id === selectedId)!;
        onLogin(emp);
      } else {
        setError("Неверный пароль");
        setLoading(false);
      }
    }, 600);
  }

  const roleColors: Record<string, string> = {
    director: "bg-destructive/10 text-destructive",
    manager: "bg-accent/10 text-accent",
    marketer: "bg-success/10 text-success",
    custom: "bg-muted text-muted-foreground",
  };

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
          <h1 className="text-lg font-semibold text-foreground mb-1">Вход в систему</h1>
          <p className="text-xs text-muted-foreground mb-6">
            Выберите сотрудника и введите пароль
          </p>

          {/* Employee selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-foreground mb-2">Сотрудник</label>
            <div className="grid gap-2">
              {employees.map((emp) => {
                const initials = emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                const isSelected = selectedId === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedId(emp.id);
                      setPassword("");
                      setError("");
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? "bg-accent text-white" : "bg-muted text-foreground"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                      <p className="text-[11px] text-muted-foreground">{emp.roleLabel}</p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        roleColors[emp.role] || roleColors.custom
                      }`}
                    >
                      {emp.roleLabel}
                    </span>
                    {isSelected && (
                      <Icon name="Check" size={14} className="text-accent flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password field — shows when employee is selected */}
          {selectedEmployee && (
            <div className="mb-4 animate-fade-in">
              <label className="block text-xs font-medium text-foreground mb-2">
                Пароль для{" "}
                <span className="text-accent">{selectedEmployee.name.split(" ")[0]}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Введите пароль"
                  autoFocus
                  className={`w-full text-sm border rounded-lg px-3 py-2.5 pr-10 outline-none transition-colors bg-background ${
                    error
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
              {error && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <Icon name="AlertCircle" size={11} />
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleLogin}
            disabled={loading || !selectedId}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              loading || !selectedId
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
            }`}
          >
            {loading ? (
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

        {/* Hint for demo */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-[11px] text-muted-foreground text-center mb-1.5 font-medium">
            Тестовые пароли
          </p>
          <div className="grid grid-cols-2 gap-1">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground truncate">{emp.name.split(" ")[0]}</span>
                <span className="font-mono text-foreground/60 ml-1">
                  {passwords[emp.id] || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
