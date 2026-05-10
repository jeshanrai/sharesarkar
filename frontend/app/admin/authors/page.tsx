"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPen, Plus, X, Eye, EyeOff, Pencil, Trash2,
  Shield, FileText, Video, Send, Check, AlertCircle,
  Search, ToggleLeft, ToggleRight, KeyRound
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Author {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  can_create_news: boolean;
  can_edit_own_news: boolean;
  can_publish: boolean;
  can_manage_videos: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  can_create_news: true,
  can_edit_own_news: true,
  can_publish: false,
  can_manage_videos: false,
};

export default function AuthorsPage() {
  const router = useRouter();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  useEffect(() => {
    const role = localStorage.getItem("admin_role");
    if (role !== "admin") {
      router.push("/admin");
      return;
    }
    fetchAuthors();
  }, [router]);

  async function fetchAuthors() {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/authors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuthors(await res.json());
      } else if (res.status === 403) {
        router.push("/admin");
      }
    } catch {
      // API error
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowModal(true);
  }

  function openEdit(author: Author) {
    setEditingId(author.id);
    setForm({
      username: author.username,
      full_name: author.full_name,
      email: author.email,
      password: "",
      can_create_news: author.can_create_news,
      can_edit_own_news: author.can_edit_own_news,
      can_publish: author.can_publish,
      can_manage_videos: author.can_manage_videos,
    });
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = editingId
        ? `${API_URL}/api/admin/authors/${editingId}`
        : `${API_URL}/api/admin/authors`;

      const body: Record<string, unknown> = {
        full_name: form.full_name,
        email: form.email,
        can_create_news: form.can_create_news,
        can_edit_own_news: form.can_edit_own_news,
        can_publish: form.can_publish,
        can_manage_videos: form.can_manage_videos,
      };

      if (!editingId) {
        body.username = form.username;
        body.password = form.password;
      } else if (form.password) {
        body.password = form.password;
      }

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSuccess(editingId ? "Author updated successfully" : "Author created successfully");
      fetchAuthors();

      if (!editingId) {
        setTimeout(() => {
          setShowModal(false);
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/authors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuthors((prev) => prev.filter((a) => a.id !== id));
        setDeleteConfirm(null);
      }
    } catch {
      // Error
    }
  }

  async function toggleActive(author: Author) {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/authors/${author.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !author.is_active }),
      });
      if (res.ok) {
        fetchAuthors();
      }
    } catch {
      // Error
    }
  }

  const filtered = authors.filter(
    (a) =>
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading authors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPen className="w-5 h-5 sm:w-6 sm:h-6 text-[#009429] shrink-0" />
            <span className="truncate">Author Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage author accounts with granular permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-all shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> New Author
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search authors..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all"
        />
      </div>

      {/* Authors Grid */}
      {filtered.length === 0 ? (
        <div className="text-center px-4 py-12 sm:py-20 bg-white rounded-2xl border border-gray-100">
          <UserPen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {search ? "No authors match your search" : "No authors yet"}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {search ? "Try a different search term" : "Create your first author to get started"}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-all"
            >
              <Plus className="w-4 h-4" /> Create First Author
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((author) => (
            <div
              key={author.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md ${
                author.is_active ? "border-gray-100" : "border-red-100 bg-red-50/30"
              }`}
            >
              {/* Author Header */}
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                    author.is_active
                      ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border border-blue-200"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                    {author.full_name ? author.full_name.charAt(0).toUpperCase() : author.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                      <h3 className="meta text-gray-900 truncate">{author.full_name || author.username}</h3>
                      <p className="eyebrow text-gray-500 truncate">@{author.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(author)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {deleteConfirm === author.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(author.id)}
                        className="p-1.5 text-red-600 bg-red-50 rounded-lg text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(author.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Email */}
              {author.email && (
                <p className="text-xs text-gray-400 mb-3 truncate">{author.email}</p>
              )}

              {/* Permissions */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  author.can_create_news ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"
                }`}>
                  <FileText className="w-3 h-3" />
                  Create News
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  author.can_edit_own_news ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"
                }`}>
                  <Pencil className="w-3 h-3" />
                  Edit Own
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  author.can_publish ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-400"
                }`}>
                  <Send className="w-3 h-3" />
                  Publish
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  author.can_manage_videos ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-400"
                }`}>
                  <Video className="w-3 h-3" />
                  Videos
                </div>
              </div>

              {/* Status toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`text-xs font-medium ${author.is_active ? "text-green-600" : "text-red-500"}`}>
                  {author.is_active ? "Active" : "Deactivated"}
                </span>
                <button
                  onClick={() => toggleActive(author)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={author.is_active ? "Deactivate" : "Activate"}
                >
                  {author.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-2 sticky top-0 bg-white z-10">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {editingId ? "Edit Author" : "Create New Author"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId ? "Update author info and permissions" : "Set up credentials and permissions for the new author"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] disabled:bg-gray-50 disabled:text-gray-400 transition-all"
                  placeholder="e.g. john_author"
                  required
                  disabled={!!editingId}
                />
                {editingId && (
                  <p className="text-[10px] text-gray-400 mt-1">Username cannot be changed after creation</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all"
                  placeholder="john@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  {editingId ? "Reset Password (leave blank to keep)" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all"
                    placeholder={editingId ? "••••••••" : "Min 6 characters"}
                    required={!editingId}
                    minLength={editingId ? 0 : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Permissions
                </label>
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  {[
                    { key: "can_create_news", label: "Create News", desc: "Can create new news articles", icon: FileText, color: "green" },
                    { key: "can_edit_own_news", label: "Edit Own News", desc: "Can edit their own articles", icon: Pencil, color: "green" },
                    { key: "can_publish", label: "Publish", desc: "Can publish articles directly (otherwise draft only)", icon: Send, color: "blue" },
                    { key: "can_manage_videos", label: "Manage Videos", desc: "Can create and manage video content", icon: Video, color: "purple" },
                  ].map((perm) => {
                    const Icon = perm.icon;
                    const checked = form[perm.key as keyof typeof form] as boolean;
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          checked ? "bg-white shadow-sm border border-gray-100" : "hover:bg-white/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          checked ? `bg-${perm.color}-50 text-${perm.color}-600` : "bg-gray-100 text-gray-400"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                          <p className="text-[10px] text-gray-500">{perm.desc}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-colors flex items-center ${
                          checked ? "bg-[#009429] justify-end" : "bg-gray-300 justify-start"
                        }`}>
                          <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#009429] text-white text-sm font-medium hover:bg-[#007a22] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingId ? "Update Author" : "Create Author"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
