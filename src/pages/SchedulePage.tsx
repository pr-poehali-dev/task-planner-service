import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { Branch, Employee } from "@/store/data";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const CELL_COLORS = [
  { id: "none", label: "Без цвета", bg: "bg-background", hex: "#ffffff" },
  { id: "blue", label: "Синий", bg: "bg-blue-100", hex: "#dbeafe" },
  { id: "green", label: "Зелёный", bg: "bg-green-100", hex: "#dcfce7" },
  { id: "yellow", label: "Жёлтый", bg: "bg-yellow-100", hex: "#fef9c3" },
  { id: "pink", label: "Розовый", bg: "bg-pink-100", hex: "#fce7f3" },
  { id: "purple", label: "Фиолетовый", bg: "bg-purple-100", hex: "#f3e8ff" },
  { id: "orange", label: "Оранжевый", bg: "bg-orange-100", hex: "#ffedd5" },
  { id: "cyan", label: "Бирюзовый", bg: "bg-cyan-100", hex: "#cffafe" },
];

interface ScheduleCell {
  training: string;
  trainer: string;
  colorId: string;
}

interface TimeSlot {
  time: string;
  cells: ScheduleCell[];
}

interface ScheduleData {
  title: string;
  timeSlots: TimeSlot[];
  address: string;
  phone: string;
  nickname: string;
}

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
}

function createEmptyRow(): TimeSlot {
  return {
    time: "",
    cells: DAYS.map(() => ({ training: "", trainer: "", colorId: "none" })),
  };
}

function createDefaultSchedule(): ScheduleData {
  return {
    title: "Расписание тренировок",
    timeSlots: [
      createEmptyRow(),
      createEmptyRow(),
      createEmptyRow(),
      createEmptyRow(),
      createEmptyRow(),
    ],
    address: "",
    phone: "",
    nickname: "",
  };
}

export default function SchedulePage({ currentUser, branches, employees }: Props) {
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id || "");
  const [schedules, setSchedules] = useState<Record<string, ScheduleData>>({});
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<{ row: number; col: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const schedule = schedules[activeBranchId] || createDefaultSchedule();

  const updateSchedule = useCallback(
    (updater: (s: ScheduleData) => ScheduleData) => {
      setSchedules((prev) => ({
        ...prev,
        [activeBranchId]: updater(prev[activeBranchId] || createDefaultSchedule()),
      }));
    },
    [activeBranchId]
  );

  function updateCell(row: number, col: number, field: keyof ScheduleCell, value: string) {
    updateSchedule((s) => {
      const slots = [...s.timeSlots];
      const cells = [...slots[row].cells];
      cells[col] = { ...cells[col], [field]: value };
      slots[row] = { ...slots[row], cells };
      return { ...s, timeSlots: slots };
    });
  }

  function updateTime(row: number, value: string) {
    updateSchedule((s) => {
      const slots = [...s.timeSlots];
      slots[row] = { ...slots[row], time: value };
      return { ...s, timeSlots: slots };
    });
  }

  function addRow() {
    updateSchedule((s) => ({
      ...s,
      timeSlots: [...s.timeSlots, createEmptyRow()],
    }));
  }

  function removeRow(index: number) {
    updateSchedule((s) => ({
      ...s,
      timeSlots: s.timeSlots.filter((_, i) => i !== index),
    }));
  }

  function getCellColor(colorId: string) {
    return CELL_COLORS.find((c) => c.id === colorId) || CELL_COLORS[0];
  }

  async function exportPNG() {
    if (!tableRef.current) return;
    setExporting(true);
    setEditingCell(null);
    setEditingTime(null);
    setColorPickerFor(null);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `расписание-${branches.find((b) => b.id === activeBranchId)?.name || "филиал"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportPDF() {
    if (!tableRef.current) return;
    setExporting(true);
    setEditingCell(null);
    setEditingTime(null);
    setColorPickerFor(null);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`расписание-${branches.find((b) => b.id === activeBranchId)?.name || "филиал"}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  async function handleAiUpdate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    try {
      const prompt = aiPrompt.trim();
      const currentSchedule = JSON.stringify(schedule);

      const response = await fetch(
        "https://functions.poehali.dev/e05189fb-4764-4507-a479-6c56d3c7cccc",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, schedule: currentSchedule }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.schedule) {
          setSchedules((prev) => ({
            ...prev,
            [activeBranchId]: data.schedule,
          }));
        }
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
      setAiPrompt("");
    }
  }

  const isDirector = currentUser.role === "director";
  const branchName = branches.find((b) => b.id === activeBranchId)?.name || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Расписание</h1>
        <div className="flex gap-2">
          <button
            onClick={exportPNG}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
          >
            <Icon name="Image" size={14} />
            PNG
          </button>
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1.5 rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
          >
            <Icon name="FileText" size={14} />
            PDF
          </button>
        </div>
      </div>

      {branches.length > 1 && (
        <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setActiveBranchId(b.id);
                setEditingCell(null);
                setEditingTime(null);
                setColorPickerFor(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${
                activeBranchId === b.id
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div
        ref={tableRef}
        className="bg-white rounded-lg border border-border overflow-hidden"
        style={{ padding: exporting ? "24px" : undefined }}
      >
        {exporting && (
          <h2
            className="text-xl font-bold text-center mb-4"
            style={{ color: "#111" }}
          >
            {schedule.title} {branchName && `— ${branchName}`}
          </h2>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="border border-border bg-muted/40 px-3 py-2.5 text-xs font-semibold text-foreground w-20 text-center">
                  Время
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="border border-border bg-muted/40 px-3 py-2.5 text-xs font-semibold text-foreground text-center"
                  >
                    {day}
                  </th>
                ))}
                {!exporting && (
                  <th className="border border-border bg-muted/40 px-1 py-2.5 w-8"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {schedule.timeSlots.map((slot, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="border border-border px-1 py-1 text-center align-top">
                    {!exporting && editingTime === rowIdx ? (
                      <input
                        autoFocus
                        value={slot.time}
                        onChange={(e) => updateTime(rowIdx, e.target.value)}
                        onBlur={() => setEditingTime(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingTime(null)}
                        className="w-full text-xs text-center bg-transparent outline-none border-b border-accent px-1 py-1 font-mono"
                        placeholder="09:00"
                      />
                    ) : (
                      <button
                        onClick={() => !exporting && setEditingTime(rowIdx)}
                        className="w-full text-xs text-center py-1 font-mono text-foreground hover:bg-muted/30 rounded cursor-text min-h-[32px]"
                      >
                        {slot.time || (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </button>
                    )}
                  </td>
                  {slot.cells.map((cell, colIdx) => {
                    const color = getCellColor(cell.colorId);
                    const isEditing =
                      editingCell?.row === rowIdx && editingCell?.col === colIdx;
                    const showColorPicker =
                      colorPickerFor?.row === rowIdx &&
                      colorPickerFor?.col === colIdx;

                    return (
                      <td
                        key={colIdx}
                        className={`border border-border px-2 py-1.5 align-top relative group cursor-pointer transition-colors ${color.bg}`}
                        style={exporting && cell.colorId !== "none" ? { backgroundColor: color.hex } : undefined}
                        onClick={() => {
                          if (!exporting && !isEditing) {
                            setEditingCell({ row: rowIdx, col: colIdx });
                            setColorPickerFor(null);
                          }
                        }}
                      >
                        {isEditing && !exporting ? (
                          <div className="space-y-1">
                            <input
                              autoFocus
                              value={cell.training}
                              onChange={(e) =>
                                updateCell(rowIdx, colIdx, "training", e.target.value)
                              }
                              placeholder="Тренировка"
                              className="w-full text-xs font-medium bg-transparent outline-none border-b border-accent/30 pb-0.5"
                            />
                            <input
                              value={cell.trainer}
                              onChange={(e) =>
                                updateCell(rowIdx, colIdx, "trainer", e.target.value)
                              }
                              placeholder="Тренер"
                              className="w-full text-[10px] text-muted-foreground bg-transparent outline-none border-b border-accent/30 pb-0.5"
                            />
                            <div className="flex items-center justify-between pt-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setColorPickerFor(
                                    showColorPicker ? null : { row: rowIdx, col: colIdx }
                                  );
                                }}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent"
                              >
                                <div
                                  className={`w-3 h-3 rounded-full border border-border ${color.bg}`}
                                />
                                Цвет
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell(null);
                                  setColorPickerFor(null);
                                }}
                                className="text-[10px] text-accent font-medium"
                              >
                                Готово
                              </button>
                            </div>
                            {showColorPicker && (
                              <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-border rounded-lg shadow-lg p-2 flex gap-1.5 flex-wrap w-[180px]">
                                {CELL_COLORS.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateCell(rowIdx, colIdx, "colorId", c.id);
                                      setColorPickerFor(null);
                                    }}
                                    title={c.label}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${
                                      cell.colorId === c.id
                                        ? "border-accent scale-110"
                                        : "border-border hover:border-accent/50"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="min-h-[36px]">
                            {cell.training ? (
                              <>
                                <p className="text-xs font-medium text-foreground leading-tight">
                                  {cell.training}
                                </p>
                                {cell.trainer && (
                                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                    {cell.trainer}
                                  </p>
                                )}
                              </>
                            ) : !exporting ? (
                              <span className="text-[10px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                Нажмите
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {!exporting && (
                    <td className="border border-border px-1 py-1 text-center align-middle">
                      <button
                        onClick={() => removeRow(rowIdx)}
                        className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                        title="Удалить строку"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!exporting && (
          <button
            onClick={addRow}
            className="w-full py-2 text-xs text-muted-foreground hover:text-accent hover:bg-muted/20 transition-colors flex items-center justify-center gap-1 border-t border-border"
          >
            <Icon name="Plus" size={12} />
            Добавить строку
          </button>
        )}

        <div
          className={`border-t border-border px-4 py-3 ${exporting ? "bg-muted/20" : ""}`}
          style={exporting ? { backgroundColor: "#f8f8f8" } : undefined}
        >
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 items-center">
            {exporting ? (
              <>
                {schedule.address && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    📍 {schedule.address}
                  </span>
                )}
                {schedule.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    📞 {schedule.phone}
                  </span>
                )}
                {schedule.nickname && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    @ {schedule.nickname}
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Icon name="MapPin" size={12} className="text-muted-foreground/60" />
                  <input
                    value={schedule.address}
                    onChange={(e) =>
                      updateSchedule((s) => ({ ...s, address: e.target.value }))
                    }
                    placeholder="Адрес филиала"
                    className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground min-w-[140px]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="Phone" size={12} className="text-muted-foreground/60" />
                  <input
                    value={schedule.phone}
                    onChange={(e) =>
                      updateSchedule((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="Телефон"
                    className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground min-w-[120px]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="AtSign" size={12} className="text-muted-foreground/60" />
                  <input
                    value={schedule.nickname}
                    onChange={(e) =>
                      updateSchedule((s) => ({ ...s, nickname: e.target.value }))
                    }
                    placeholder="Никнейм / соцсеть"
                    className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground min-w-[130px]"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!exporting && (
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Sparkles" size={14} className="text-accent" />
            <span className="text-xs font-medium text-foreground">ИИ-помощник</span>
            <span className="text-[10px] text-muted-foreground">
              Опишите изменения в расписании текстом
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAiUpdate()}
              placeholder='Например: "Добавь йогу в среду в 18:00, тренер Анна"'
              className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 outline-none focus:border-accent"
              disabled={aiLoading}
            />
            <button
              onClick={handleAiUpdate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="text-xs bg-accent text-white px-4 py-2 rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              {aiLoading ? (
                <>
                  <Icon name="Loader2" size={12} className="animate-spin" />
                  Обновляю...
                </>
              ) : (
                <>
                  <Icon name="Wand2" size={12} />
                  Применить
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}