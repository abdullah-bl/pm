"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AttachmentList, type AttachmentType } from "@/components/attachment-list";
import { listTaskAttachments, adminDeleteAttachment } from "@/lib/actions/files";
import {
  getProjectDetail,
  listTasks,
  newTask,
  editTask,
  removeTask,
  listComments,
  addComment,
  removeComment,
  listProjects,
} from "@/lib/actions/tasks";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiChat3Line,
  RiCalendarLine,
  RiUserLine,
  RiFlagLine,
  RiMoreLine,
  RiSendPlaneLine,
} from "@remixicon/react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  assigneeName: string | null;
  assigneeImage: string | null;
};

type CommentType = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  authorName: string | null;
  authorImage: string | null;
};

const statusColumns = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
] as const;

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ name: string; description: string | null } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; description: string; status: string; priority: string; dueDate: string }>({ title: "", description: "", status: "todo", priority: "medium", dueDate: "" });
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", priority: "medium" as string });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<AttachmentType[]>([]);

  const loadProject = useCallback(async () => {
    const [projRes, tasksRes] = await Promise.all([
      getProjectDetail({ id: projectId }),
      listTasks({ projectId }),
    ]);
    if (projRes?.data) setProject(projRes.data as any);
    if (tasksRes?.data) setTasks(tasksRes.data as any);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  const loadComments = async (taskId: string) => {
    const res = await listComments({ taskId });
    if (res?.data) setComments(res.data as any);
  };

  const loadAttachments = async (taskId: string) => {
    const res = await listTaskAttachments({ taskId });
    if (res?.data) setTaskAttachments(res.data as AttachmentType[]);
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    });
    setEditMode(false);
    setDeleteConfirm(false);
    loadComments(task.id);
    loadAttachments(task.id);
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title.trim()) return;
    const res = await newTask({
      title: newTaskForm.title,
      description: newTaskForm.description || undefined,
      priority: newTaskForm.priority as any,
      projectId,
    });
    if (res?.data) {
      toast.success("Task created");
      setShowNewTask(false);
      setNewTaskForm({ title: "", description: "", priority: "medium" });
      loadProject();
    } else {
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    const res = await editTask({
      id: selectedTask.id,
      title: editForm.title,
      description: editForm.description || undefined,
      status: editForm.status as any,
      priority: editForm.priority as any,
      dueDate: editForm.dueDate ? new Date(editForm.dueDate) : null,
    });
    if (res?.data) {
      toast.success("Task updated");
      setEditMode(false);
      loadProject();
      // refresh selected task
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) {
        setSelectedTask({ ...updated, title: editForm.title, description: editForm.description, status: editForm.status, priority: editForm.priority, dueDate: editForm.dueDate ? new Date(editForm.dueDate).getTime() : null });
      }
    } else {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    const res = await removeTask({ id: selectedTask.id });
    if (res?.data) {
      toast.success("Task deleted");
      setSelectedTask(null);
      loadProject();
    } else {
      toast.error("Failed to delete task");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedTask) return;
    const res = await addComment({ content: commentText, taskId: selectedTask.id });
    if (res?.data) {
      setCommentText("");
      loadComments(selectedTask.id);
    } else {
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (id: string) => {
    const res = await removeComment({ id });
    if (res?.data && selectedTask) {
      loadComments(selectedTask.id);
    } else {
      toast.error("Failed to delete comment");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const res = await editTask({ id: taskId, status: newStatus as any });
    if (res?.data) {
      loadProject();
    }
  };

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-64 animate-pulse rounded-lg border bg-card" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/collections")}>
          <RiArrowLeftLine className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project?.name ?? "—"}</h1>
          {project?.description && <p className="text-muted-foreground">{project.description}</p>}
        </div>
        <Button className="gap-2" onClick={() => setShowNewTask(true)}>
          <RiAddLine className="size-4" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusColumns.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">{col.label}</h3>
              <Badge variant="secondary" className="text-xs">{tasksByStatus(col.key).length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {tasksByStatus(col.key).map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTask(t)}
                  className="w-full text-left rounded-lg border bg-card p-3 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityColors[t.priority] || ""}`}>
                      {t.priority}
                    </span>
                    {t.assigneeName && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RiUserLine className="size-3" />
                        {t.assigneeName}
                      </span>
                    )}
                    {t.dueDate && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RiCalendarLine className="size-3" />
                        {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowNewTask(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Task</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewTask(false)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input placeholder="Task title" value={newTaskForm.title} onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Optional description" value={newTaskForm.description} onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancel</Button>
                <Button onClick={handleCreateTask}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedTask(null)} />
          <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editMode ? "Edit Task" : selectedTask.title}
              </h2>
              <div className="flex items-center gap-1">
                {!editMode && (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>Edit</Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)}>
                  <RiCloseLine className="size-4" />
                </Button>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button onClick={handleUpdateTask}>Save</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{selectedTask.status.replace("_", " ")}</Badge>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${priorityColors[selectedTask.priority] || ""}`}>
                    {selectedTask.priority}
                  </span>
                </div>
                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedTask.assigneeName && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RiUserLine className="size-3.5" />
                      {selectedTask.assigneeName}
                    </div>
                  )}
                  {selectedTask.dueDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RiCalendarLine className="size-3.5" />
                      {new Date(selectedTask.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    Created {new Date(selectedTask.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Attachments */}
                <AttachmentList
                  attachments={taskAttachments}
                  taskId={selectedTask.id}
                  canDelete={true}
                  isAdmin={true}
                  onAttachmentChange={() => loadAttachments(selectedTask.id)}
                />

                <Separator />

                {/* Comments */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <RiChat3Line className="size-4" />
                    Comments ({comments.length})
                  </h3>
                  {comments.length > 0 && (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {(c.authorName || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{c.authorName || "Unknown"}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                              <button onClick={() => handleDeleteComment(c.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                                <RiDeleteBinLine className="size-3" />
                              </button>
                            </div>
                            <p className="text-sm mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    />
                    <Button size="icon" onClick={handleAddComment}>
                      <RiSendPlaneLine className="size-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Delete */}
                {!deleteConfirm ? (
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(true)}>
                    <RiDeleteBinLine className="size-3.5" />
                    Delete Task
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Are you sure?</span>
                    <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteTask}>Delete</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
