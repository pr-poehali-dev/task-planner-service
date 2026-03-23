import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { type Employee, type SharedFile } from "@/store/data";

interface Props {
  currentUser: Employee;
  employees: Employee[];
  files: SharedFile[];
  onFilesChange: (f: SharedFile[]) => void;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.txt";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string, name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || type === "application/pdf") return "FileText";
  if (
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    type.includes("word")
  )
    return "FileText";
  if (
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    type.includes("spreadsheet") ||
    type.includes("excel")
  )
    return "FileSpreadsheet";
  return "File";
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

export default function FilesPage({
  currentUser,
  employees,
  files,
  onFilesChange,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareDropdownId, setShareDropdownId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherEmployees = employees.filter((e) => e.id !== currentUser.id);

  const myFiles = files.filter(
    (f) =>
      f.ownerEmployeeId === currentUser.id ||
      f.sharedWithEmployeeIds.includes(currentUser.id)
  );

  const uploadFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const arr = Array.from(fileList);
      arr.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const newFile: SharedFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            dataUrl: reader.result as string,
            type: file.type,
            size: file.size,
            ownerEmployeeId: currentUser.id,
            sharedWithEmployeeIds: [],
            createdAt: new Date().toISOString(),
          };
          onFilesChange([...files, newFile]);
        };
        reader.readAsDataURL(file);
      });
    },
    [currentUser.id, files, onFilesChange]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function deleteFile(fileId: string) {
    onFilesChange(files.filter((f) => f.id !== fileId));
  }

  function startRename(file: SharedFile) {
    setRenamingId(file.id);
    setRenameValue(file.name);
  }

  function saveRename(fileId: string) {
    if (renameValue.trim()) {
      onFilesChange(
        files.map((f) =>
          f.id === fileId ? { ...f, name: renameValue.trim() } : f
        )
      );
    }
    setRenamingId(null);
  }

  function toggleShareWith(fileId: string, empId: string) {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const isShared = file.sharedWithEmployeeIds.includes(empId);
    const newShared = isShared
      ? file.sharedWithEmployeeIds.filter((id) => id !== empId)
      : [...file.sharedWithEmployeeIds, empId];

    onFilesChange(
      files.map((f) =>
        f.id === fileId ? { ...f, sharedWithEmployeeIds: newShared } : f
      )
    );

    if (!isShared) {
      sendNotification("Планер", `Вам предоставлен доступ к файлу: ${file.name}`);
    }
  }

  function getEmployeeName(id: string) {
    return employees.find((e) => e.id === id)?.name || id;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Файлы</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium bg-accent text-white px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Icon name="Upload" size={14} />
          Загрузить
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg py-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <Icon
          name="CloudUpload"
          size={28}
          className={`${dragging ? "text-accent" : "text-muted-foreground"}`}
        />
        <p className="text-xs text-muted-foreground">
          {dragging
            ? "Отпустите для загрузки"
            : "Перетащите файлы сюда или нажмите для выбора"}
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          PDF, DOC, DOCX, XLS, XLSX, TXT
        </p>
      </div>

      {/* Files list */}
      {myFiles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="FolderOpen" size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет файлов</p>
          <p className="text-xs mt-1">Загрузите первый файл</p>
        </div>
      )}

      <div className="grid gap-2">
        {myFiles.map((file) => {
          const isOwner = file.ownerEmployeeId === currentUser.id;
          const iconName = getFileIcon(file.type, file.name);
          const isRenaming = renamingId === file.id;
          const showShare = shareDropdownId === file.id;

          return (
            <div
              key={file.id}
              className="flex items-center gap-3 border border-border rounded-lg bg-card px-4 py-3 hover:bg-muted/10 transition-colors group"
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Icon name={iconName} size={16} className="text-muted-foreground" />
              </div>

              {/* Name & info */}
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(file.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => saveRename(file.id)}
                    className="w-full text-xs font-medium border border-accent rounded px-2 py-1 outline-none bg-background"
                  />
                ) : (
                  <p className="text-xs font-medium text-foreground truncate">
                    {file.name}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{new Date(file.createdAt).toLocaleDateString("ru-RU")}</span>
                  {!isOwner && (
                    <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                      от {getEmployeeName(file.ownerEmployeeId).split(" ")[0]}
                    </span>
                  )}
                  {file.sharedWithEmployeeIds.length > 0 && isOwner && (
                    <span className="flex items-center gap-0.5">
                      <Icon name="Users" size={9} />
                      {file.sharedWithEmployeeIds.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Download */}
                <a
                  href={file.dataUrl}
                  download={file.name}
                  className="p-1.5 rounded text-muted-foreground hover:text-accent hover:bg-muted/50 transition-colors"
                  title="Скачать"
                >
                  <Icon name="Download" size={14} />
                </a>

                {isOwner && (
                  <>
                    {/* Rename */}
                    <button
                      onClick={() => startRename(file)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors hidden group-hover:block"
                      title="Переименовать"
                    >
                      <Icon name="Pencil" size={13} />
                    </button>

                    {/* Share */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShareDropdownId(showShare ? null : file.id)
                        }
                        className="p-1.5 rounded text-muted-foreground hover:text-accent hover:bg-muted/50 transition-colors"
                        title="Поделиться"
                      >
                        <Icon name="Share2" size={13} />
                      </button>
                      {showShare && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setShareDropdownId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in min-w-[160px]">
                            <p className="px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border">
                              Поделиться с
                            </p>
                            {otherEmployees.map((emp) => (
                              <button
                                key={emp.id}
                                onClick={() =>
                                  toggleShareWith(file.id, emp.id)
                                }
                                className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] hover:bg-muted/50 transition-colors ${
                                  file.sharedWithEmployeeIds.includes(emp.id)
                                    ? "text-accent font-medium"
                                    : "text-foreground"
                                }`}
                              >
                                <Icon
                                  name={
                                    file.sharedWithEmployeeIds.includes(emp.id)
                                      ? "CheckSquare"
                                      : "Square"
                                  }
                                  size={12}
                                />
                                {emp.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors hidden group-hover:block"
                      title="Удалить"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
