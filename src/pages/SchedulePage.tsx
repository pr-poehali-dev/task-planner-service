import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { Branch, Employee } from "@/store/data";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

const CELL_COLORS = [
  { id: "none", label: "Без цвета", hex: "#f8f9fa" },
  { id: "blue", label: "Синий", hex: "#dbeafe" },
  { id: "green", label: "Зелёный", hex: "#dcfce7" },
  { id: "yellow", label: "Жёлтый", hex: "#fef9c3" },
  { id: "pink", label: "Розовый", hex: "#fce7f3" },
  { id: "purple", label: "Фиолетовый", hex: "#f3e8ff" },
  { id: "orange", label: "Оранжевый", hex: "#ffedd5" },
  { id: "cyan", label: "Бирюзовый", hex: "#cffafe" },
  { id: "lavender", label: "Лавандовый", hex: "#e8e0f0" },
];

interface ScheduleCell {
  training: string;
  trainer: string;
  colorId: string;
  paid?: boolean;
}

interface TimeSlot {
  time: string;
  cells: ScheduleCell[];
}

interface HallSchedule {
  hallName: string;
  timeSlots: TimeSlot[];
}

interface ScheduleData {
  title: string;
  halls: HallSchedule[];
  address: string;
  phone: string;
  nickname: string;
}

interface ExportOptions {
  showTitle: boolean;
  showGrid: boolean;
  showFooter: boolean;
}

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
}

function createEmptyRow(): TimeSlot {
  return {
    time: "",
    cells: DAYS.map(() => ({ training: "", trainer: "", colorId: "none", paid: false })),
  };
}

function createDefaultHall(name = "Зал 1"): HallSchedule {
  return {
    hallName: name,
    timeSlots: [createEmptyRow(), createEmptyRow(), createEmptyRow(), createEmptyRow(), createEmptyRow()],
  };
}

function createDefaultSchedule(): ScheduleData {
  return {
    title: "РАСПИСАНИЕ ТРЕНИРОВОК",
    halls: [createDefaultHall()],
    address: "",
    phone: "",
    nickname: "",
  };
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

function mergeHalls(halls: HallSchedule[]): TimeSlot[] {
  const timeMap = new Map<string, ScheduleCell[]>();
  const order: string[] = [];
  for (const hall of halls) {
    for (const slot of hall.timeSlots) {
      const key = slot.time || `__empty_${order.length}`;
      if (!timeMap.has(key)) {
        timeMap.set(key, DAYS.map(() => ({ training: "", trainer: "", colorId: "none", paid: false })));
        order.push(key);
      }
      const existing = timeMap.get(key)!;
      slot.cells.forEach((cell, i) => {
        if (cell.training && !existing[i].training) {
          existing[i] = { ...cell };
        } else if (cell.training && existing[i].training) {
          existing[i] = {
            training: existing[i].training + " / " + cell.training,
            trainer: [existing[i].trainer, cell.trainer].filter(Boolean).join(" / "),
            colorId: existing[i].colorId,
            paid: existing[i].paid || cell.paid,
          };
        }
      });
    }
  }
  return order.map((key) => ({
    time: key.startsWith("__empty_") ? "" : key,
    cells: timeMap.get(key)!,
  }));
}

const ASPECT_RATIO = 297 / 210;

export default function SchedulePage({ branches }: Props) {
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id || "");
  const [schedules, setSchedules] = useState<Record<string, ScheduleData>>({});
  const [activeHallIdx, setActiveHallIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "merged">("single");
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingHallName, setEditingHallName] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<{ row: number; col: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpts, setExportOpts] = useState<ExportOptions>({ showTitle: true, showGrid: true, showFooter: true });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const schedule = schedules[activeBranchId] || createDefaultSchedule();
  const hall = schedule.halls[activeHallIdx] || schedule.halls[0];
  const displaySlots = viewMode === "merged" && schedule.halls.length > 1
    ? mergeHalls(schedule.halls)
    : hall?.timeSlots || [];

  const isMerged = viewMode === "merged" && schedule.halls.length > 1;

  const updateSchedule = useCallback(
    (updater: (s: ScheduleData) => ScheduleData) => {
      setSchedules((prev) => ({
        ...prev,
        [activeBranchId]: updater(prev[activeBranchId] || createDefaultSchedule()),
      }));
    },
    [activeBranchId]
  );

  function updateCell(row: number, col: number, field: keyof ScheduleCell, value: string | boolean) {
    updateSchedule((s) => {
      const halls = [...s.halls];
      const slots = [...halls[activeHallIdx].timeSlots];
      const cells = [...slots[row].cells];
      cells[col] = { ...cells[col], [field]: value };
      slots[row] = { ...slots[row], cells };
      halls[activeHallIdx] = { ...halls[activeHallIdx], timeSlots: slots };
      return { ...s, halls };
    });
  }

  function updateTime(row: number, value: string) {
    const formatted = formatTimeInput(value);
    updateSchedule((s) => {
      const halls = [...s.halls];
      const slots = [...halls[activeHallIdx].timeSlots];
      slots[row] = { ...slots[row], time: formatted };
      halls[activeHallIdx] = { ...halls[activeHallIdx], timeSlots: slots };
      return { ...s, halls };
    });
  }

  function addRow() {
    updateSchedule((s) => {
      const halls = [...s.halls];
      halls[activeHallIdx] = {
        ...halls[activeHallIdx],
        timeSlots: [...halls[activeHallIdx].timeSlots, createEmptyRow()],
      };
      return { ...s, halls };
    });
  }

  function removeRow(index: number) {
    updateSchedule((s) => {
      const halls = [...s.halls];
      halls[activeHallIdx] = {
        ...halls[activeHallIdx],
        timeSlots: halls[activeHallIdx].timeSlots.filter((_, i) => i !== index),
      };
      return { ...s, halls };
    });
  }

  function addHall() {
    updateSchedule((s) => ({
      ...s,
      halls: [...s.halls, createDefaultHall(`Зал ${s.halls.length + 1}`)],
    }));
    setActiveHallIdx(schedule.halls.length);
    setViewMode("single");
  }

  function removeHall(idx: number) {
    if (schedule.halls.length <= 1) return;
    updateSchedule((s) => ({
      ...s,
      halls: s.halls.filter((_, i) => i !== idx),
    }));
    setActiveHallIdx((prev) => (prev >= idx ? Math.max(0, prev - 1) : prev));
    setViewMode("single");
  }

  function getCellColor(colorId: string) {
    return CELL_COLORS.find((c) => c.id === colorId) || CELL_COLORS[0];
  }

  function resetEditing() {
    setEditingCell(null);
    setEditingTime(null);
    setColorPickerFor(null);
    setEditingTitle(false);
    setEditingHallName(false);
  }

  async function doExport(format: "png" | "pdf") {
    if (!tableRef.current) return;
    setExporting(true);
    resetEditing();
    setShowExportMenu(false);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `расписание-${branches.find((b) => b.id === activeBranchId)?.name || "филиал"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 3, canvas.height / 3] });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
        pdf.save(`расписание-${branches.find((b) => b.id === activeBranchId)?.name || "филиал"}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleAiUpdate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch("https://functions.poehali.dev/e05189fb-4764-4507-a479-6c56d3c7cccc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim(), schedule: JSON.stringify(schedule) }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.schedule) setSchedules((prev) => ({ ...prev, [activeBranchId]: data.schedule }));
      }
    } catch { /* silently fail */ } finally {
      setAiLoading(false);
      setAiPrompt("");
    }
  }

  const rowCount = displaySlots.length || 1;

  // Render a schedule grid (used for both normal and export views)
  function renderGrid(slots: TimeSlot[], isExport: boolean) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: `64px repeat(7, 1fr)${!isExport ? " 28px" : ""}`, gap: 4 }}>
          <div style={{ borderRadius: 8, background: "#e8e0f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 0" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1a2e", letterSpacing: "0.05em" }}>ВРЕМЯ</span>
          </div>
          {DAYS.map((day) => (
            <div key={day} style={{ borderRadius: 8, background: "#e8e0f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 0" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e", letterSpacing: "0.08em" }}>{day}</span>
            </div>
          ))}
          {!isExport && <div />}
        </div>

        {/* Rows */}
        {slots.map((slot, rowIdx) => {
          const cellHeight = `calc((100% - ${rowCount * 4}px) / ${rowCount})`;
          return (
            <div key={rowIdx} style={{ display: "grid", gridTemplateColumns: `64px repeat(7, 1fr)${!isExport ? " 28px" : ""}`, gap: 4, height: cellHeight, minHeight: 44 }}>
              {/* Time */}
              <div style={{ borderRadius: 10, background: "#f0edf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!isExport && !isMerged && editingTime === rowIdx ? (
                  <input
                    autoFocus
                    value={slot.time}
                    onChange={(e) => updateTime(rowIdx, e.target.value)}
                    onBlur={() => setEditingTime(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingTime(null)}
                    style={{ width: "100%", fontSize: 12, fontWeight: 800, textAlign: "center", background: "transparent", outline: "none", border: "none", fontFamily: "monospace", color: "#1a1a2e" }}
                    placeholder="0000"
                  />
                ) : (
                  <button
                    onClick={() => !isExport && !isMerged && setEditingTime(rowIdx)}
                    style={{ width: "100%", height: "100%", fontSize: 12, fontWeight: 800, textAlign: "center", background: "transparent", border: "none", cursor: isExport || isMerged ? "default" : "text", fontFamily: "monospace", color: "#1a1a2e", letterSpacing: "0.02em" }}
                  >
                    {slot.time || (!isExport ? "—" : "")}
                  </button>
                )}
              </div>

              {/* Cells */}
              {slot.cells.map((cell, colIdx) => {
                const color = getCellColor(cell.colorId);
                const isEditing = !isMerged && editingCell?.row === rowIdx && editingCell?.col === colIdx;
                const showCP = !isMerged && colorPickerFor?.row === rowIdx && colorPickerFor?.col === colIdx;

                return (
                  <div
                    key={colIdx}
                    style={{
                      borderRadius: 10,
                      background: color.hex,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      cursor: isExport || isMerged ? "default" : "pointer",
                      transition: "box-shadow 0.15s",
                      boxShadow: isEditing ? "0 0 0 2px #7c5cbf" : "none",
                      padding: "4px 6px",
                    }}
                    onClick={() => { if (!isExport && !isMerged && !isEditing) { setEditingCell({ row: rowIdx, col: colIdx }); setColorPickerFor(null); } }}
                  >
                    {isEditing && !isExport ? (
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <input autoFocus value={cell.training} onChange={(e) => updateCell(rowIdx, colIdx, "training", e.target.value)} placeholder="Тренировка"
                          style={{ width: "100%", fontSize: 11, fontWeight: 600, textAlign: "center", background: "transparent", outline: "none", border: "none", borderBottom: "1px solid #c4b5d0", paddingBottom: 1 }} />
                        <input value={cell.trainer} onChange={(e) => updateCell(rowIdx, colIdx, "trainer", e.target.value)} placeholder="Тренер"
                          style={{ width: "100%", fontSize: 9, textAlign: "center", background: "transparent", outline: "none", border: "none", borderBottom: "1px solid #c4b5d0", color: "#666", paddingBottom: 1 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                          <button onClick={(e) => { e.stopPropagation(); setColorPickerFor(showCP ? null : { row: rowIdx, col: colIdx }); }}
                            style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#888", background: "none", border: "none", cursor: "pointer" }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color.hex, border: "1px solid #ccc", display: "inline-block" }} />Цвет
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); updateCell(rowIdx, colIdx, "paid", !cell.paid); }}
                            style={{ fontSize: 9, color: cell.paid ? "#7c5cbf" : "#bbb", background: "none", border: "none", cursor: "pointer", fontWeight: cell.paid ? 700 : 400 }}>
                            $ {cell.paid ? "✓" : ""}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingCell(null); setColorPickerFor(null); }}
                            style={{ fontSize: 9, color: "#7c5cbf", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>OK</button>
                        </div>
                        {showCP && (
                          <div style={{ position: "absolute", zIndex: 30, top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4, background: "#fff", border: "1px solid #e0dce6", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: 8, display: "flex", gap: 5, flexWrap: "wrap", width: 180 }}>
                            {CELL_COLORS.map((c) => (
                              <button key={c.id} onClick={(e) => { e.stopPropagation(); updateCell(rowIdx, colIdx, "colorId", c.id); setColorPickerFor(null); }} title={c.label}
                                style={{ width: 22, height: 22, borderRadius: "50%", border: cell.colorId === c.id ? "2px solid #7c5cbf" : "2px solid #ddd", background: c.hex, cursor: "pointer", transform: cell.colorId === c.id ? "scale(1.15)" : "none", transition: "all 0.12s" }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        {cell.training ? (
                          <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e", lineHeight: 1.2 }}>{cell.training}</span>
                              {cell.paid && <span style={{ fontSize: 9, fontWeight: 700, color: "#7c5cbf" }}>$</span>}
                            </div>
                            {cell.trainer && <p style={{ fontSize: 9, color: "#777", lineHeight: 1.2, marginTop: 1 }}>{cell.trainer}</p>}
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}

              {!isExport && !isMerged && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => removeRow(rowIdx)} className="text-muted-foreground/30 hover:text-destructive transition-colors" title="Удалить строку"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <Icon name="X" size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Расписание</h1>
        <div className="flex gap-2 relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity font-medium">
            <Icon name="Download" size={14} />Выгрузить
            <Icon name="ChevronDown" size={12} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-border rounded-lg shadow-lg p-3 w-[220px]" onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Что включить</p>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input type="checkbox" checked={exportOpts.showTitle} onChange={(e) => setExportOpts((o) => ({ ...o, showTitle: e.target.checked }))} className="rounded" />
                <span className="text-xs">Заголовок</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input type="checkbox" checked={exportOpts.showGrid} onChange={(e) => setExportOpts((o) => ({ ...o, showGrid: e.target.checked }))} className="rounded" />
                <span className="text-xs">Расписание</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={exportOpts.showFooter} onChange={(e) => setExportOpts((o) => ({ ...o, showFooter: e.target.checked }))} className="rounded" />
                <span className="text-xs">Контакты</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => doExport("png")} disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-accent text-white px-2 py-1.5 rounded hover:opacity-90 font-medium disabled:opacity-50">
                  <Icon name="Image" size={12} />PNG
                </button>
                <button onClick={() => doExport("pdf")} disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-foreground text-background px-2 py-1.5 rounded hover:opacity-90 font-medium disabled:opacity-50">
                  <Icon name="FileText" size={12} />PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Branch tabs */}
      {branches.length > 1 && (
        <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
          {branches.map((b) => (
            <button key={b.id} onClick={() => { setActiveBranchId(b.id); resetEditing(); setActiveHallIdx(0); setViewMode("single"); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${activeBranchId === b.id ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Hall tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted/20 p-0.5 rounded-lg">
          {schedule.halls.map((h, idx) => (
            <div key={idx} className="flex items-center">
              <button onClick={() => { setActiveHallIdx(idx); setViewMode("single"); resetEditing(); }}
                className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${viewMode === "single" && activeHallIdx === idx ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
                {h.hallName}
              </button>
              {schedule.halls.length > 1 && viewMode === "single" && activeHallIdx === idx && (
                <button onClick={() => removeHall(idx)} className="ml-0.5 p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors" title="Удалить зал">
                  <Icon name="X" size={11} />
                </button>
              )}
            </div>
          ))}
          {schedule.halls.length > 1 && (
            <button onClick={() => { setViewMode("merged"); resetEditing(); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${viewMode === "merged" ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              <Icon name="Layers" size={11} className="inline mr-1" />Общее
            </button>
          )}
        </div>
        <button onClick={addHall} className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-1">
          <Icon name="Plus" size={12} />Добавить зал
        </button>
        {viewMode === "single" && !editingHallName && (
          <button onClick={() => setEditingHallName(true)} className="text-[10px] text-muted-foreground/50 hover:text-accent transition-colors flex items-center gap-1">
            <Icon name="Pencil" size={10} />Имя зала
          </button>
        )}
        {editingHallName && viewMode === "single" && (
          <div className="flex items-center gap-1">
            <input autoFocus value={hall?.hallName || ""} onChange={(e) => updateSchedule((s) => {
              const halls = [...s.halls]; halls[activeHallIdx] = { ...halls[activeHallIdx], hallName: e.target.value }; return { ...s, halls };
            })}
              onBlur={() => setEditingHallName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingHallName(false)}
              className="text-xs border border-accent/30 rounded px-2 py-1 outline-none focus:border-accent bg-background" style={{ width: 120 }} />
          </div>
        )}
      </div>

      {/* Schedule card */}
      <div ref={tableRef} className="bg-white rounded-2xl overflow-hidden"
        style={{ aspectRatio: `${ASPECT_RATIO}`, padding: exporting ? "28px 32px 20px" : "20px 24px 16px", display: "flex", flexDirection: "column" }}>

        {/* Title */}
        {(exporting ? exportOpts.showTitle : true) && (
          <div style={{ marginBottom: exporting ? 14 : 10, textAlign: "left" }}>
            {exporting ? (
              <div style={{ display: "inline-block", background: "#e8e0f0", borderRadius: 8, padding: "6px 20px" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {schedule.title}
                </span>
              </div>
            ) : editingTitle ? (
              <div className="inline-flex items-center gap-2">
                <input autoFocus value={schedule.title} onChange={(e) => updateSchedule((s) => ({ ...s, title: e.target.value }))}
                  onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                  className="text-sm font-extrabold bg-transparent outline-none border-b-2 border-accent/40 px-3 py-1 uppercase tracking-wide" style={{ minWidth: 220 }} />
              </div>
            ) : (
              <button onClick={() => setEditingTitle(true)} className="inline-block rounded-lg px-4 py-1.5 hover:bg-purple-50 transition-colors cursor-text" style={{ background: "#e8e0f0" }}>
                <span className="text-sm font-extrabold text-[#1a1a2e] uppercase tracking-wide">{schedule.title}</span>
                <Icon name="Pencil" size={10} className="inline ml-2 text-muted-foreground/50" />
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {(exporting ? exportOpts.showGrid : true) && renderGrid(displaySlots, exporting)}

        {/* Add row (only in single mode, not exporting) */}
        {!exporting && !isMerged && (
          <button onClick={addRow} className="text-muted-foreground hover:text-accent transition-colors"
            style={{ width: "100%", padding: "5px 0", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
            <Icon name="Plus" size={12} />Добавить строку
          </button>
        )}

        {/* Footer */}
        {(exporting ? exportOpts.showFooter : true) && (
          <div style={{ marginTop: exporting ? 8 : 6, borderTop: "1px solid #eee", paddingTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 20px", alignItems: "center", justifyContent: "center" }}>
            {exporting ? (
              <>
                {schedule.address && <span style={{ fontSize: 10, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>📍 {schedule.address}</span>}
                {schedule.phone && <span style={{ fontSize: 10, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>📞 {schedule.phone}</span>}
                {schedule.nickname && <span style={{ fontSize: 10, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>@ {schedule.nickname}</span>}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Icon name="MapPin" size={12} className="text-muted-foreground/50" />
                  <input value={schedule.address} onChange={(e) => updateSchedule((s) => ({ ...s, address: e.target.value }))} placeholder="Адрес филиала"
                    className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground" style={{ minWidth: 130 }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="Phone" size={12} className="text-muted-foreground/50" />
                  <input value={schedule.phone} onChange={(e) => updateSchedule((s) => ({ ...s, phone: e.target.value }))} placeholder="Телефон"
                    className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground" style={{ minWidth: 110 }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="AtSign" size={12} className="text-muted-foreground/50" />
                  <input value={schedule.nickname} onChange={(e) => updateSchedule((s) => ({ ...s, nickname: e.target.value }))} placeholder="Никнейм / соцсеть"
                    className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground" style={{ minWidth: 120 }} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Helper */}
      {!exporting && (
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Sparkles" size={14} className="text-accent" />
            <span className="text-xs font-medium text-foreground">ИИ-помощник</span>
            <span className="text-[10px] text-muted-foreground">Опишите изменения текстом</span>
          </div>
          <div className="flex gap-2">
            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAiUpdate()}
              placeholder='Например: "Добавь йогу в среду в 18:00, тренер Анна"'
              className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 outline-none focus:border-accent" disabled={aiLoading} />
            <button onClick={handleAiUpdate} disabled={aiLoading || !aiPrompt.trim()}
              className="text-xs bg-accent text-white px-4 py-2 rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-50 flex items-center gap-1.5">
              {aiLoading ? (<><Icon name="Loader2" size={12} className="animate-spin" />Обновляю...</>) : (<><Icon name="Wand2" size={12} />Применить</>)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
