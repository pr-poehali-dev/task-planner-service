import { useState, useRef, useCallback, useEffect } from "react";
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

interface MergedRow {
  time: string;
  entries: { hallName: string; cells: ScheduleCell[] }[];
}

interface Props {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  schedules: Record<string, unknown>;
  onSchedulesChange: (s: Record<string, unknown>) => void;
}

function createEmptyRow(): TimeSlot {
  return { time: "", cells: DAYS.map(() => ({ training: "", trainer: "", colorId: "none", paid: false })) };
}

function createDefaultHall(name = "Зал 1"): HallSchedule {
  return { hallName: name, timeSlots: [createEmptyRow(), createEmptyRow(), createEmptyRow(), createEmptyRow(), createEmptyRow()] };
}

function createDefaultSchedule(): ScheduleData {
  return { title: "РАСПИСАНИЕ ТРЕНИРОВОК", halls: [createDefaultHall()], address: "", phone: "", nickname: "" };
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

function buildMergedRows(halls: HallSchedule[]): MergedRow[] {
  const timeMap = new Map<string, MergedRow>();
  const order: string[] = [];
  for (const hall of halls) {
    for (const slot of hall.timeSlots) {
      const key = slot.time || `__empty_${Math.random()}`;
      if (!timeMap.has(key)) {
        timeMap.set(key, { time: slot.time, entries: [] });
        order.push(key);
      }
      const row = timeMap.get(key)!;
      const hasFilled = slot.cells.some((c) => c.training);
      if (hasFilled) {
        row.entries.push({ hallName: hall.hallName, cells: slot.cells });
      }
    }
  }
  return order.map((k) => {
    const r = timeMap.get(k)!;
    if (r.entries.length === 0) {
      r.entries.push({ hallName: halls[0]?.hallName || "", cells: DAYS.map(() => ({ training: "", trainer: "", colorId: "none", paid: false })) });
    }
    return r;
  });
}

const ASPECT = 297 / 210;

export default function SchedulePage({ branches, schedules, onSchedulesChange }: Props) {
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id || "");
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

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dirty, setDirty] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const allSchedules = schedules as Record<string, ScheduleData>;
  const schedule = allSchedules[activeBranchId] || createDefaultSchedule();
  const hall = schedule.halls[activeHallIdx] || schedule.halls[0];
  const isMerged = viewMode === "merged" && schedule.halls.length > 1;
  const mergedRows = isMerged ? buildMergedRows(schedule.halls) : [];

  useEffect(() => {
    setActiveHallIdx(0);
    setViewMode("single");
    resetEditing();
  }, [activeBranchId]);

  const updateSchedule = useCallback(
    (updater: (s: ScheduleData) => ScheduleData) => {
      const current = (schedules as Record<string, ScheduleData>)[activeBranchId] || createDefaultSchedule();
      const updated = updater(current);
      onSchedulesChange({ ...schedules, [activeBranchId]: updated });
      setDirty(true);
    },
    [activeBranchId, schedules, onSchedulesChange]
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

  function clearCell(row: number, col: number) {
    updateSchedule((s) => {
      const halls = [...s.halls];
      const slots = [...halls[activeHallIdx].timeSlots];
      const cells = [...slots[row].cells];
      cells[col] = { training: "", trainer: "", colorId: "none", paid: false };
      slots[row] = { ...slots[row], cells };
      halls[activeHallIdx] = { ...halls[activeHallIdx], timeSlots: slots };
      return { ...s, halls };
    });
  }

  function updateTime(row: number, value: string) {
    updateSchedule((s) => {
      const halls = [...s.halls];
      const slots = [...halls[activeHallIdx].timeSlots];
      slots[row] = { ...slots[row], time: formatTimeInput(value) };
      halls[activeHallIdx] = { ...halls[activeHallIdx], timeSlots: slots };
      return { ...s, halls };
    });
  }

  function addRow() {
    updateSchedule((s) => {
      const halls = [...s.halls];
      halls[activeHallIdx] = { ...halls[activeHallIdx], timeSlots: [...halls[activeHallIdx].timeSlots, createEmptyRow()] };
      return { ...s, halls };
    });
  }

  function removeRow(idx: number) {
    updateSchedule((s) => {
      const halls = [...s.halls];
      halls[activeHallIdx] = { ...halls[activeHallIdx], timeSlots: halls[activeHallIdx].timeSlots.filter((_, i) => i !== idx) };
      return { ...s, halls };
    });
  }

  function addHall() {
    updateSchedule((s) => ({ ...s, halls: [...s.halls, createDefaultHall(`Зал ${s.halls.length + 1}`)] }));
    setActiveHallIdx(schedule.halls.length);
    setViewMode("single");
  }

  function removeHall(idx: number) {
    if (schedule.halls.length <= 1) return;
    updateSchedule((s) => ({ ...s, halls: s.halls.filter((_, i) => i !== idx) }));
    setActiveHallIdx((p) => (p >= idx ? Math.max(0, p - 1) : p));
    setViewMode("single");
  }

  function getCellColor(id: string) {
    return CELL_COLORS.find((c) => c.id === id) || CELL_COLORS[0];
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
    resetEditing();
    setShowExportMenu(false);
    setExporting(true);
    await new Promise((r) => setTimeout(r, 100));
    const el = tableRef.current;
    el.querySelectorAll("[data-export-hide]").forEach((n) => (n as HTMLElement).style.visibility = "hidden");
    await new Promise((r) => setTimeout(r, 50));
    try {
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `расписание-${branches.find((b) => b.id === activeBranchId)?.name || ""}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 3, canvas.height / 3] });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
        pdf.save(`расписание-${branches.find((b) => b.id === activeBranchId)?.name || ""}.pdf`);
      }
    } finally {
      el.querySelectorAll("[data-export-hide]").forEach((n) => (n as HTMLElement).style.visibility = "");
      setExporting(false);
    }
  }

  async function handleAiUpdate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://functions.poehali.dev/e05189fb-4764-4507-a479-6c56d3c7cccc", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim(), schedule: JSON.stringify(schedule) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.schedule) { onSchedulesChange({ ...schedules, [activeBranchId]: data.schedule }); setDirty(true); }
      }
    } catch { /* */ } finally { setAiLoading(false); setAiPrompt(""); }
  }

  /* ── cell style: strict center ── */
  const cellStyle = (hex: string, isEdit: boolean): React.CSSProperties => ({
    borderRadius: 10,
    background: hex,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "box-shadow 0.15s",
    boxShadow: isEdit ? "0 0 0 2px #7c5cbf" : "none",
    padding: "4px 6px",
    minHeight: 0,
    overflow: isEdit ? "visible" : "hidden",
  });

  /* ── cell content (view mode) ── */
  function cellContent(cell: ScheduleCell) {
    if (!cell.training && !cell.paid) return null;
    return (
      <>
        {cell.paid && (
          <span style={{ position: "absolute", top: 2, right: 4, fontSize: 10, fontWeight: 700, color: "#7c5cbf", lineHeight: 1, zIndex: 1 }}>$</span>
        )}
        {cell.training && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", lineHeight: 1.15, textAlign: "center", wordBreak: "break-word", display: "block" }}>{cell.training}</span>
            {cell.trainer && <span style={{ fontSize: 10, color: "#777", lineHeight: 1.15, marginTop: 1, textAlign: "center", display: "block" }}>{cell.trainer}</span>}
          </div>
        )}
      </>
    );
  }

  /* ── editable cell ── */
  function renderEditableCell(cell: ScheduleCell, ri: number, ci: number) {
    const color = getCellColor(cell.colorId);
    const isEd = editingCell?.row === ri && editingCell?.col === ci;
    const showCP = colorPickerFor?.row === ri && colorPickerFor?.col === ci;

    return (
      <div key={ci} style={{ ...cellStyle(color.hex, isEd), cursor: "pointer" }}
        onClick={(e) => { if (isEd) { e.stopPropagation(); return; } setEditingCell({ row: ri, col: ci }); setColorPickerFor(null); }}>
        {isEd ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <input autoFocus value={cell.training} onChange={(e) => updateCell(ri, ci, "training", e.target.value)} placeholder="Тренировка"
              style={{ width: "100%", fontSize: 11, fontWeight: 600, textAlign: "center", background: "transparent", outline: "none", border: "none", borderBottom: "1px solid #c4b5d0", paddingBottom: 1 }} />
            <input value={cell.trainer} onChange={(e) => updateCell(ri, ci, "trainer", e.target.value)} placeholder="Тренер"
              style={{ width: "100%", fontSize: 9, textAlign: "center", background: "transparent", outline: "none", border: "none", borderBottom: "1px solid #c4b5d0", color: "#666", paddingBottom: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
              <button onClick={(e) => { e.stopPropagation(); setColorPickerFor(showCP ? null : { row: ri, col: ci }); }}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#888", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color.hex, border: "1px solid #ccc", display: "inline-block" }} />Цвет
              </button>
              <button onClick={(e) => { e.stopPropagation(); updateCell(ri, ci, "paid", !cell.paid); }}
                style={{ fontSize: 9, color: cell.paid ? "#7c5cbf" : "#bbb", background: "none", border: "none", cursor: "pointer", fontWeight: cell.paid ? 700 : 400 }}>$ {cell.paid ? "✓" : ""}</button>
              {(cell.training || cell.trainer || cell.paid) && (
                <button onClick={(e) => { e.stopPropagation(); clearCell(ri, ci); setEditingCell(null); setColorPickerFor(null); }}
                  style={{ fontSize: 9, color: "#e55", background: "none", border: "none", cursor: "pointer" }}>
                  <Icon name="Trash2" size={10} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setEditingCell(null); setColorPickerFor(null); }}
                style={{ fontSize: 9, color: "#7c5cbf", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>OK</button>
            </div>
            {showCP && (
              <div style={{ position: "absolute", zIndex: 30, top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4, background: "#fff", border: "1px solid #e0dce6", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: 8, display: "flex", gap: 5, flexWrap: "wrap", width: 180 }}>
                {CELL_COLORS.map((c) => (
                  <button key={c.id} onClick={(e) => { e.stopPropagation(); updateCell(ri, ci, "colorId", c.id); setColorPickerFor(null); }} title={c.label}
                    style={{ width: 22, height: 22, borderRadius: "50%", border: cell.colorId === c.id ? "2px solid #7c5cbf" : "2px solid #ddd", background: c.hex, cursor: "pointer", transform: cell.colorId === c.id ? "scale(1.15)" : "none", transition: "all 0.12s" }} />
                ))}
              </div>
            )}
          </div>
        ) : cellContent(cell)}
      </div>
    );
  }

  /* ── header cell ── */
  const hdrCell = (text: string, extra?: React.CSSProperties) => (
    <div style={{ borderRadius: 8, background: "#e8e0f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 0", height: "100%", ...extra }}>
      <span style={{ fontSize: text === "ВРЕМЯ" || text === "ЗАЛ" ? 10 : 11, fontWeight: 700, color: "#1a1a2e", letterSpacing: "0.08em", textAlign: "center" }}>{text}</span>
    </div>
  );

  /* ── single hall grid ── */
  function renderSingleGrid(slots: TimeSlot[]) {
    const cnt = slots.length || 1;
    const gridCols = `64px repeat(7, 1fr) 28px`;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4 }}>
          {hdrCell("ВРЕМЯ")}
          {DAYS.map((d) => <div key={d}>{hdrCell(d)}</div>)}
          <div />
        </div>
        {slots.map((slot, ri) => (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, flex: `1 1 calc(100%/${cnt})`, minHeight: 40 }}>
            <div style={{ borderRadius: 10, background: "#f0edf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {editingTime === ri ? (
                <input autoFocus value={slot.time} onChange={(e) => updateTime(ri, e.target.value)} onBlur={() => setEditingTime(null)} onKeyDown={(e) => e.key === "Enter" && setEditingTime(null)}
                  style={{ width: "100%", fontSize: 12, fontWeight: 800, textAlign: "center", background: "transparent", outline: "none", border: "none", fontFamily: "monospace", color: "#1a1a2e" }} placeholder="0000" />
              ) : (
                <span style={{ width: "100%", fontSize: 12, fontWeight: 800, textAlign: "center", fontFamily: "monospace", color: "#1a1a2e", cursor: "text" }}
                  onClick={() => setEditingTime(ri)}>
                  {slot.time || "—"}
                </span>
              )}
            </div>
            {slot.cells.map((c, ci) => renderEditableCell(c, ri, ci))}
            <div data-export-hide style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button onClick={() => removeRow(ri)} className="text-muted-foreground/30 hover:text-destructive transition-colors" style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><Icon name="X" size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── merged grid ── */
  function renderMergedGrid(rows: MergedRow[]) {
    const showHallCol = rows.some((r) => r.entries.length > 1);
    const gridCols = showHallCol ? `64px 56px repeat(7, 1fr)` : `64px repeat(7, 1fr)`;
    const totalSubRows = rows.reduce((s, r) => s + r.entries.length, 0) || 1;

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4 }}>
          {hdrCell("ВРЕМЯ")}
          {showHallCol && hdrCell("ЗАЛ")}
          {DAYS.map((d) => <div key={d}>{hdrCell(d)}</div>)}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", flexDirection: "column", gap: 2, flex: `${row.entries.length} 1 0%` }}>
            {row.entries.map((entry, ei) => (
              <div key={ei} style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, flex: `1 1 calc(100% / ${totalSubRows})`, minHeight: 36 }}>
                {ei === 0 ? (
                  <div style={{ borderRadius: 10, background: "#f0edf5", display: "flex", alignItems: "center", justifyContent: "center", gridRow: row.entries.length > 1 ? `span ${row.entries.length}` : undefined }}>
                    <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: "#1a1a2e" }}>{row.time}</span>
                  </div>
                ) : <div />}
                {showHallCol && (
                  <div style={{ borderRadius: 8, background: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 2px", overflow: "hidden" }}>
                    <span style={{ fontSize: Math.min(9, entry.hallName.length > 6 ? 7 : 9), fontWeight: 600, color: "#7c5cbf", textAlign: "center", lineHeight: 1.1, wordBreak: "break-word", overflow: "hidden", maxWidth: "100%" }}>{entry.hallName}</span>
                  </div>
                )}
                {entry.cells.map((cell, ci) => {
                  const color = getCellColor(cell.colorId);
                  return (
                    <div key={ci} style={{ ...cellStyle(color.hex, false), height: "100%" }}>
                      {cellContent(cell)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={() => { if (colorPickerFor) setColorPickerFor(null); }}>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Расписание</h1>
        <div className="flex gap-2 items-center relative">
          {dirty && <span className="text-[10px] text-green-600 mr-1">● Автосохранение</span>}
          <button onClick={() => setDirty(false)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-all ${dirty ? "bg-green-600 text-white hover:bg-green-700" : "bg-muted text-muted-foreground"}`}>
            <Icon name="Save" size={14} />Сохранить
          </button>
          <button onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity font-medium">
            <Icon name="Download" size={14} />Выгрузить<Icon name="ChevronDown" size={12} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-border rounded-lg shadow-lg p-3 w-[180px]" onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Формат</p>
              <div className="flex gap-2">
                <button onClick={() => doExport("png")} disabled={exporting} className="flex-1 flex items-center justify-center gap-1 text-xs bg-accent text-white px-2 py-1.5 rounded hover:opacity-90 font-medium disabled:opacity-50"><Icon name="Image" size={12} />PNG</button>
                <button onClick={() => doExport("pdf")} disabled={exporting} className="flex-1 flex items-center justify-center gap-1 text-xs bg-foreground text-background px-2 py-1.5 rounded hover:opacity-90 font-medium disabled:opacity-50"><Icon name="FileText" size={12} />PDF</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {branches.length > 1 && (
        <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
          {branches.map((b) => (
            <button key={b.id} onClick={() => setActiveBranchId(b.id)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${activeBranchId === b.id ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>{b.name}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted/20 p-0.5 rounded-lg">
          {schedule.halls.map((h, idx) => (
            <div key={idx} className="flex items-center">
              <button onClick={() => { setActiveHallIdx(idx); setViewMode("single"); resetEditing(); }}
                className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${viewMode === "single" && activeHallIdx === idx ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>{h.hallName}</button>
              {schedule.halls.length > 1 && viewMode === "single" && activeHallIdx === idx && (
                <button onClick={() => removeHall(idx)} className="ml-0.5 p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors"><Icon name="X" size={11} /></button>
              )}
            </div>
          ))}
          {schedule.halls.length > 1 && (
            <button onClick={() => { setViewMode("merged"); resetEditing(); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${viewMode === "merged" ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              <Icon name="Layers" size={11} className="inline mr-1" />Общее</button>
          )}
        </div>
        <button onClick={addHall} className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-1"><Icon name="Plus" size={12} />Добавить зал</button>
        {viewMode === "single" && !editingHallName && (
          <button onClick={() => setEditingHallName(true)} className="text-[10px] text-muted-foreground/50 hover:text-accent transition-colors flex items-center gap-1"><Icon name="Pencil" size={10} />Имя зала</button>
        )}
        {editingHallName && viewMode === "single" && (
          <input autoFocus value={hall?.hallName || ""} onChange={(e) => updateSchedule((s) => { const h = [...s.halls]; h[activeHallIdx] = { ...h[activeHallIdx], hallName: e.target.value }; return { ...s, halls: h }; })}
            onBlur={() => setEditingHallName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingHallName(false)}
            className="text-xs border border-accent/30 rounded px-2 py-1 outline-none focus:border-accent bg-background" style={{ width: 120 }} />
        )}
      </div>

      <div ref={tableRef} className="bg-white rounded-2xl overflow-hidden"
        style={{ aspectRatio: `${ASPECT}`, padding: "20px 24px 16px", display: "flex", flexDirection: "column" }}>

        <div style={{ marginBottom: 10, textAlign: "left" }}>
          {editingTitle ? (
            <input autoFocus value={schedule.title} onChange={(e) => updateSchedule((s) => ({ ...s, title: e.target.value }))}
              onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="text-sm font-extrabold bg-transparent outline-none border-b-2 border-accent/40 px-3 py-1 uppercase tracking-wide" style={{ minWidth: 220 }} />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="inline-block rounded-lg px-4 py-1.5 hover:bg-purple-50 transition-colors cursor-text" style={{ background: "#e8e0f0" }}>
              <span className="text-sm font-extrabold text-[#1a1a2e] uppercase tracking-wide">{schedule.title}</span>
              <span data-export-hide><Icon name="Pencil" size={10} className="inline ml-2 text-muted-foreground/50" /></span>
            </button>
          )}
        </div>

        {isMerged ? renderMergedGrid(mergedRows) : renderSingleGrid(hall?.timeSlots || [])}

        {!isMerged && (
          <button data-export-hide onClick={addRow} className="text-muted-foreground hover:text-accent transition-colors"
            style={{ width: "100%", padding: "5px 0", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
            <Icon name="Plus" size={12} />Добавить строку</button>
        )}

        <div style={{ marginTop: 6, borderTop: "1px solid #eee", paddingTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 20px", alignItems: "center", justifyContent: "center" }}>
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
            <input value={schedule.nickname} onChange={(e) => updateSchedule((s) => ({ ...s, nickname: e.target.value }))} placeholder="Никнейм"
              className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground" style={{ minWidth: 120 }} />
          </div>
        </div>
      </div>

      {!exporting && (
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Sparkles" size={14} className="text-accent" />
            <span className="text-xs font-medium text-foreground">ИИ-помощник</span>
            <span className="text-[10px] text-muted-foreground">Опишите изменения текстом</span>
          </div>
          <div className="flex gap-2">
            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAiUpdate()}
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