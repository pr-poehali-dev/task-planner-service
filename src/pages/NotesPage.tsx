import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Employee, type Note, type NoteAttachment } from "@/store/data";

interface Props {
  currentUser: Employee;
  employees: Employee[];
  notes: Note[];
  onNotesChange: (n: Note[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sendNotification(title: string, body: string) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.svg" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(title, { body, icon: "/favicon.svg" });
        }
      });
    }
  } catch {
    // Notification not available
  }
}

export default function NotesPage({
  currentUser,
  employees,
  notes,
  onNotesChange,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newAttachments, setNewAttachments] = useState<NoteAttachment[]>([]);
  const [newShareWith, setNewShareWith] = useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editShareWith, setEditShareWith] = useState<string[]>([]);

  const otherEmployees = employees.filter((e) => e.id !== currentUser.id);

  // Notes the user owns or that are shared with them
  const myNotes = notes.filter(
    (n) =>
      n.ownerEmployeeId === currentUser.id ||
      n.sharedWithEmployeeIds.includes(currentUser.id)
  );

  const visibleNotes = search
    ? myNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase())
      )
    : myNotes;

  function handleFileUpload(files: FileList | null, target: "new" | "edit", noteId?: string) {
    if (!files) return;
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: NoteAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          dataUrl: reader.result as string,
          type: file.type,
          size: file.size,
        };
        if (target === "new") {
          setNewAttachments((prev) => [...prev, attachment]);
        } else if (target === "edit" && noteId) {
          onNotesChange(
            notes.map((n) =>
              n.id === noteId
                ? { ...n, attachments: [...n.attachments, attachment], updatedAt: new Date().toISOString() }
                : n
            )
          );
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function createNote() {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const note: Note = {
      id: `note_${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      ownerEmployeeId: currentUser.id,
      sharedWithEmployeeIds: newShareWith,
      attachments: newAttachments,
      createdAt: now,
      updatedAt: now,
    };
    onNotesChange([...notes, note]);

    // Notify shared users
    newShareWith.forEach((empId) => {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        sendNotification("Планер", `Вам поделились заметкой: ${note.title}`);
      }
    });

    setNewTitle("");
    setNewContent("");
    setNewAttachments([]);
    setNewShareWith([]);
    setCreating(false);
  }

  function deleteNote(noteId: string) {
    onNotesChange(notes.filter((n) => n.id !== noteId));
    if (expandedNoteId === noteId) setExpandedNoteId(null);
  }

  function expandNote(note: Note) {
    if (expandedNoteId === note.id) {
      setExpandedNoteId(null);
      return;
    }
    setExpandedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditShareWith(note.sharedWithEmployeeIds);
  }

  function saveNoteEdit(noteId: string) {
    const prevNote = notes.find((n) => n.id === noteId);
    const newShared = editShareWith.filter(
      (id) => !prevNote?.sharedWithEmployeeIds.includes(id)
    );

    onNotesChange(
      notes.map((n) =>
        n.id === noteId
          ? {
              ...n,
              title: editTitle.trim() || n.title,
              content: editContent,
              sharedWithEmployeeIds: editShareWith,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );

    // Notify newly shared users
    newShared.forEach((empId) => {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        sendNotification("Планер", `Вам поделились заметкой: ${editTitle.trim() || prevNote?.title}`);
      }
    });
  }

  function removeAttachment(noteId: string, attachmentId: string) {
    onNotesChange(
      notes.map((n) =>
        n.id === noteId
          ? { ...n, attachments: n.attachments.filter((a) => a.id !== attachmentId), updatedAt: new Date().toISOString() }
          : n
      )
    );
  }

  function getEmployeeName(id: string) {
    return employees.find((e) => e.id === id)?.name || id;
  }

  function toggleShareWith(empId: string, target: "new" | "edit") {
    if (target === "new") {
      setNewShareWith((prev) =>
        prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
      );
    } else {
      setEditShareWith((prev) =>
        prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
      );
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Заметки</h2>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 text-xs font-medium bg-accent text-white px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} />
          Новая заметка
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="border border-accent/30 rounded-lg bg-card p-4 space-y-3 animate-fade-in">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Заголовок заметки..."
            className="w-full text-sm font-medium border border-border rounded px-3 py-2 outline-none focus:border-accent bg-background"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Содержимое..."
            rows={4}
            className="w-full text-xs border border-border rounded px-3 py-2 outline-none focus:border-accent bg-background resize-y"
          />

          {/* Attachments */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-accent transition-colors w-fit">
              <Icon name="Paperclip" size={13} />
              Прикрепить файлы
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, "new")}
              />
            </label>
            {newAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-1.5 text-[10px] bg-muted px-2 py-1 rounded">
                    <Icon name="File" size={10} />
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                    <button
                      onClick={() => setNewAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share */}
          {otherEmployees.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Поделиться с:</p>
              <div className="flex flex-wrap gap-1.5">
                {otherEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => toggleShareWith(emp.id, "new")}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      newShareWith.includes(emp.id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {emp.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={createNote}
              className="text-xs bg-accent text-white px-4 py-2 rounded hover:opacity-90 font-medium"
            >
              Создать
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewTitle("");
                setNewContent("");
                setNewAttachments([]);
                setNewShareWith([]);
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-4 py-2 rounded border border-border"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по заметкам..."
          className="w-full text-xs border border-border rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-accent bg-background"
        />
      </div>

      {/* Notes list */}
      {visibleNotes.length === 0 && !creating && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="StickyNote" size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет заметок</p>
          <p className="text-xs mt-1">Создайте первую заметку или получите от коллеги</p>
        </div>
      )}

      <div className="grid gap-3">
        {visibleNotes.map((note) => {
          const isOwner = note.ownerEmployeeId === currentUser.id;
          const isExpanded = expandedNoteId === note.id;
          const sharedFrom = !isOwner
            ? getEmployeeName(note.ownerEmployeeId)
            : null;

          return (
            <div
              key={note.id}
              className="border border-border rounded-lg bg-card overflow-hidden"
            >
              {/* Card header */}
              <div
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => expandNote(note)}
              >
                <Icon
                  name={isExpanded ? "ChevronDown" : "ChevronRight"}
                  size={14}
                  className="text-muted-foreground mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {note.title}
                    </span>
                    {sharedFrom && (
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full flex-shrink-0">
                        от {sharedFrom.split(" ")[0]}
                      </span>
                    )}
                    {note.attachments.length > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                        <Icon name="Paperclip" size={10} />
                        {note.attachments.length}
                      </span>
                    )}
                  </div>
                  {!isExpanded && note.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {note.content.slice(0, 120)}
                      {note.content.length > 120 ? "..." : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.updatedAt).toLocaleDateString("ru-RU")}
                  </span>
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded view */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3 animate-fade-in">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveNoteEdit(note.id)}
                    className="w-full text-sm font-medium border border-border rounded px-3 py-2 outline-none focus:border-accent bg-background"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onBlur={() => saveNoteEdit(note.id)}
                    rows={5}
                    className="w-full text-xs border border-border rounded px-3 py-2 outline-none focus:border-accent bg-background resize-y"
                  />

                  {/* Attachments */}
                  {note.attachments.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Вложения:</p>
                      <div className="flex flex-wrap gap-2">
                        {note.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-1.5 text-[11px] bg-muted px-2.5 py-1.5 rounded"
                          >
                            <Icon name="File" size={11} />
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="text-accent hover:underline truncate max-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {att.name}
                            </a>
                            <span className="text-muted-foreground">
                              ({formatFileSize(att.size)})
                            </span>
                            {isOwner && (
                              <button
                                onClick={() => removeAttachment(note.id, att.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Icon name="X" size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add attachment */}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-accent transition-colors w-fit">
                    <Icon name="Paperclip" size={13} />
                    Прикрепить файл
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files, "edit", note.id)}
                    />
                  </label>

                  {/* Share */}
                  {otherEmployees.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Поделиться с:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {otherEmployees.map((emp) => {
                          const isShared = editShareWith.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              onClick={() => {
                                const newShareList = isShared
                                  ? editShareWith.filter((id) => id !== emp.id)
                                  : [...editShareWith, emp.id];
                                setEditShareWith(newShareList);

                                // Directly update the note with new share list
                                const prevNote = notes.find((n) => n.id === note.id);
                                if (!isShared && prevNote && !prevNote.sharedWithEmployeeIds.includes(emp.id)) {
                                  sendNotification("Планер", `Вам поделились заметкой: ${editTitle.trim() || prevNote.title}`);
                                }
                                onNotesChange(
                                  notes.map((n) =>
                                    n.id === note.id
                                      ? { ...n, sharedWithEmployeeIds: newShareList, updatedAt: new Date().toISOString() }
                                      : n
                                  )
                                );
                              }}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                isShared
                                  ? "border-accent bg-accent/10 text-accent"
                                  : "border-border text-muted-foreground hover:border-accent/50"
                              }`}
                            >
                              {emp.name.split(" ")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {note.sharedWithEmployeeIds.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Доступна:{" "}
                      {note.sharedWithEmployeeIds
                        .map((id) => getEmployeeName(id).split(" ")[0])
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}