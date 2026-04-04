import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { Branch, Employee } from "@/store/data";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

const CELL_COLORS = [
  { id: "none", label: "Без цвета", bg: "#f8f9fa", hex: "#f8f9fa" },
  { id: "blue", label: "Синий", bg: "#dbeafe", hex: "#dbeafe" },
  { id: "green", label: "Зелёный", bg: "#dcfce7", hex: "#dcfce7" },
  { id: "yellow", label: "Жёлтый", bg: "#fef9c3", hex: "#fef9c3" },
  { id: "pink", label: "Розовый", bg: "#fce7f3", hex: "#fce7f3" },
  { id: "purple", label: "Фиолетовый", bg: "#f3e8ff", hex: "#f3e8ff" },
  { id: "orange", label: "Оранжевый", bg: "#ffedd5", hex: "#ffedd5" },
  { id: "cyan", label: "Бирюзовый", bg: "#cffafe", hex: "#cffafe" },
  { id: "lavender", label: "Лавандовый", bg: "#e8e0f0", hex: "#e8e0f0" },
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
    cells: DAYS.map(() => ({ training: "", trainer: "", colorId: "none", paid: false })),
  };
}

function createDefaultSchedule(): ScheduleData {
  return {
    title: "РАСПИСАНИЕ ТРЕНИРОВОК",
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

const ASPECT_RATIO = 297 / 210;

export default function SchedulePage({ branches }: Props) {
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id || "");
  const [schedules, setSchedules] = useState<Record<string, ScheduleData>>({});
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
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

  function updateCell(row: number, col: number, field: keyof ScheduleCell, value: string | boolean) {
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
    setEditingTitle(false);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 3,
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
    setEditingTitle(false);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 3, canvas.height / 3],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
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

  const rowCount = schedule.timeSlots.length || 1;

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
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          aspectRatio: `${ASPECT_RATIO}`,
          padding: exporting ? "28px 32px 20px" : "20px 24px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: exporting ? 16 : 12, textAlign: "center" }}>
          {exporting ? (
            <div
              style={{
                display: "inline-block",
                background: "#e8e0f0",
                borderRadius: 12,
                padding: "10px 36px",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#1a1a2e",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {schedule.title}
              </span>
            </div>
          ) : editingTitle ? (
            <div className="inline-flex items-center gap-2">
              <input
                autoFocus
                value={schedule.title}
                onChange={(e) => updateSchedule((s) => ({ ...s, title: e.target.value }))}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="text-base font-extrabold text-center bg-transparent outline-none border-b-2 border-accent/40 px-4 py-1 uppercase tracking-wide"
                style={{ minWidth: 250 }}
              />
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="inline-block rounded-xl px-6 py-2 hover:bg-purple-50 transition-colors cursor-text"
              style={{ background: "#e8e0f0" }}
            >
              <span className="text-base font-extrabold text-[#1a1a2e] uppercase tracking-wide">
                {schedule.title}
              </span>
              <Icon name="Pencil" size={11} className="inline ml-2 text-muted-foreground/50" />
            </button>
          )}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `64px repeat(7, 1fr)${!exporting ? " 28px" : ""}`,
              gap: 4,
            }}
          >
            <div
              style={{
                borderRadius: 8,
                background: "#e8e0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 0",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1a2e", letterSpacing: "0.05em" }}>
                ВРЕМЯ
              </span>
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                style={{
                  borderRadius: 8,
                  background: "#e8e0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 0",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e", letterSpacing: "0.08em" }}>
                  {day}
                </span>
              </div>
            ))}
            {!exporting && <div />}
          </div>

          {/* Data rows */}
          {schedule.timeSlots.map((slot, rowIdx) => {
            const cellHeight = `calc((100% - ${(rowCount) * 4}px) / ${rowCount})`;

            return (
              <div
                key={rowIdx}
                style={{
                  display: "grid",
                  gridTemplateColumns: `64px repeat(7, 1fr)${!exporting ? " 28px" : ""}`,
                  gap: 4,
                  height: cellHeight,
                  minHeight: 44,
                }}
              >
                {/* Time cell */}
                <div
                  style={{
                    borderRadius: 10,
                    background: "#f0edf5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!exporting && editingTime === rowIdx ? (
                    <input
                      autoFocus
                      value={slot.time}
                      onChange={(e) => updateTime(rowIdx, e.target.value)}
                      onBlur={() => setEditingTime(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingTime(null)}
                      style={{
                        width: "100%",
                        fontSize: 12,
                        fontWeight: 800,
                        textAlign: "center",
                        background: "transparent",
                        outline: "none",
                        border: "none",
                        fontFamily: "monospace",
                        color: "#1a1a2e",
                      }}
                      placeholder="00:00"
                    />
                  ) : (
                    <button
                      onClick={() => !exporting && setEditingTime(rowIdx)}
                      style={{
                        width: "100%",
                        height: "100%",
                        fontSize: 12,
                        fontWeight: 800,
                        textAlign: "center",
                        background: "transparent",
                        border: "none",
                        cursor: exporting ? "default" : "text",
                        fontFamily: "monospace",
                        color: "#1a1a2e",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {slot.time || (!exporting ? "—" : "")}
                    </button>
                  )}
                </div>

                {/* Day cells */}
                {slot.cells.map((cell, colIdx) => {
                  const color = getCellColor(cell.colorId);
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const showColorPicker = colorPickerFor?.row === rowIdx && colorPickerFor?.col === colIdx;

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
                        cursor: exporting ? "default" : "pointer",
                        transition: "box-shadow 0.15s",
                        boxShadow: isEditing ? "0 0 0 2px #7c5cbf" : "none",
                        padding: "4px 6px",
                      }}
                      onClick={() => {
                        if (!exporting && !isEditing) {
                          setEditingCell({ row: rowIdx, col: colIdx });
                          setColorPickerFor(null);
                        }
                      }}
                    >
                      {isEditing && !exporting ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <input
                            autoFocus
                            value={cell.training}
                            onChange={(e) => updateCell(rowIdx, colIdx, "training", e.target.value)}
                            placeholder="Тренировка"
                            style={{
                              width: "100%",
                              fontSize: 11,
                              fontWeight: 600,
                              textAlign: "center",
                              background: "transparent",
                              outline: "none",
                              border: "none",
                              borderBottom: "1px solid #c4b5d0",
                              paddingBottom: 1,
                            }}
                          />
                          <input
                            value={cell.trainer}
                            onChange={(e) => updateCell(rowIdx, colIdx, "trainer", e.target.value)}
                            placeholder="Тренер"
                            style={{
                              width: "100%",
                              fontSize: 9,
                              textAlign: "center",
                              background: "transparent",
                              outline: "none",
                              border: "none",
                              borderBottom: "1px solid #c4b5d0",
                              color: "#666",
                              paddingBottom: 1,
                            }}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerFor(showColorPicker ? null : { row: rowIdx, col: colIdx });
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 9,
                                color: "#888",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background: color.hex,
                                  border: "1px solid #ccc",
                                  display: "inline-block",
                                }}
                              />
                              Цвет
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCell(rowIdx, colIdx, "paid", !cell.paid);
                              }}
                              style={{
                                fontSize: 9,
                                color: cell.paid ? "#7c5cbf" : "#bbb",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: cell.paid ? 700 : 400,
                              }}
                            >
                              $ {cell.paid ? "✓" : ""}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell(null);
                                setColorPickerFor(null);
                              }}
                              style={{
                                fontSize: 9,
                                color: "#7c5cbf",
                                fontWeight: 600,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              OK
                            </button>
                          </div>
                          {showColorPicker && (
                            <div
                              style={{
                                position: "absolute",
                                zIndex: 30,
                                top: "100%",
                                left: "50%",
                                transform: "translateX(-50%)",
                                marginTop: 4,
                                background: "#fff",
                                border: "1px solid #e0dce6",
                                borderRadius: 10,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                                padding: 8,
                                display: "flex",
                                gap: 5,
                                flexWrap: "wrap",
                                width: 170,
                              }}
                            >
                              {CELL_COLORS.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCell(rowIdx, colIdx, "colorId", c.id);
                                    setColorPickerFor(null);
                                  }}
                                  title={c.label}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    border: cell.colorId === c.id ? "2px solid #7c5cbf" : "2px solid #ddd",
                                    background: c.hex,
                                    cursor: "pointer",
                                    transform: cell.colorId === c.id ? "scale(1.15)" : "none",
                                    transition: "all 0.12s",
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", width: "100%" }}>
                          {cell.training ? (
                            <>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e", lineHeight: 1.2 }}>
                                  {cell.training}
                                </span>
                                {cell.paid && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#7c5cbf" }}>$</span>
                                )}
                              </div>
                              {cell.trainer && (
                                <p style={{ fontSize: 9, color: "#777", lineHeight: 1.2, marginTop: 1 }}>
                                  {cell.trainer}
                                </p>
                              )}
                            </>
                          ) : !exporting ? (
                            <span style={{ fontSize: 9, color: "#ccc", opacity: 0 }} className="group-hover:opacity-100">
                              +
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Delete row button */}
                {!exporting && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <button
                      onClick={() => removeRow(rowIdx)}
                      className="text-muted-foreground/30 hover:text-destructive transition-colors"
                      title="Удалить строку"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add row */}
        {!exporting && (
          <button
            onClick={addRow}
            className="text-muted-foreground hover:text-accent transition-colors"
            style={{
              width: "100%",
              padding: "6px 0",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            <Icon name="Plus" size={12} />
            Добавить строку
          </button>
        )}

        {/* Footer info */}
        <div
          style={{
            marginTop: exporting ? 10 : 8,
            borderTop: "1px solid #eee",
            paddingTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 20px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {exporting ? (
            <>
              {schedule.address && (
                <span style={{ fontSize: 11, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>
                  📍 {schedule.address}
                </span>
              )}
              {schedule.phone && (
                <span style={{ fontSize: 11, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>
                  📞 {schedule.phone}
                </span>
              )}
              {schedule.nickname && (
                <span style={{ fontSize: 11, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>
                  @ {schedule.nickname}
                </span>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <Icon name="MapPin" size={12} className="text-muted-foreground/50" />
                <input
                  value={schedule.address}
                  onChange={(e) => updateSchedule((s) => ({ ...s, address: e.target.value }))}
                  placeholder="Адрес филиала"
                  className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground"
                  style={{ minWidth: 130 }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="Phone" size={12} className="text-muted-foreground/50" />
                <input
                  value={schedule.phone}
                  onChange={(e) => updateSchedule((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="Телефон"
                  className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground"
                  style={{ minWidth: 110 }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="AtSign" size={12} className="text-muted-foreground/50" />
                <input
                  value={schedule.nickname}
                  onChange={(e) => updateSchedule((s) => ({ ...s, nickname: e.target.value }))}
                  placeholder="Никнейм / соцсеть"
                  className="text-xs bg-transparent outline-none border-b border-transparent focus:border-accent/30 text-foreground"
                  style={{ minWidth: 120 }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Helper */}
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
