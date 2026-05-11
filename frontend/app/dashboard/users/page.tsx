"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

type User = {
  id: string;
  email: string;
  is_active: boolean;
  is_superadmin: boolean;
  created_at: string;
};

const EMPTY_FORM = { email: "", password: "", is_superadmin: false };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form tambah user
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Edit user
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", password: "", is_active: true, is_superadmin: false });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Hapus
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function fetchUsers() {
    setLoading(true);
    api.get("/users").then(({ data }) => {
      setUsers(data.items);
      setTotal(data.total);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      await api.post("/users", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Gagal membuat user");
    } finally {
      setFormLoading(false);
    }
  }

  function startEdit(user: User) {
    setEditId(user.id);
    setEditForm({ email: user.email, password: "", is_active: user.is_active, is_superadmin: user.is_superadmin });
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditLoading(true);
    setEditError("");
    const payload: any = { email: editForm.email, is_active: editForm.is_active, is_superadmin: editForm.is_superadmin };
    if (editForm.password) payload.password = editForm.password;
    try {
      await api.patch(`/users/${editId}`, payload);
      setEditId(null);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.response?.data?.detail || "Gagal update user");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${id}`);
      setConfirmDeleteId(null);
      fetchUsers();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen User</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} user terdaftar</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(""); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
          </svg>
          Tambah User
        </button>
      </div>

      {/* Form tambah user */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="font-semibold text-foreground">User Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@email.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
              <input
                type="password" required minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox" checked={form.is_superadmin}
              onChange={(e) => setForm({ ...form, is_superadmin: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Superadmin</span>
          </label>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={formLoading} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {formLoading ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-medium rounded-lg text-muted-foreground hover:bg-accent transition-colors">
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dibuat</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">Memuat...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">Belum ada user</td></tr>
            )}
            {!loading && users.map((user) => (
              <>
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-4 font-medium text-foreground">{user.email}</td>
                  <td className="px-5 py-4">
                    {user.is_superadmin ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-500/15 text-violet-400">Superadmin</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.is_active ? "bg-green-400" : "bg-red-400"}`} />
                      <span className={`text-xs font-semibold ${user.is_active ? "text-green-400" : "text-red-400"}`}>
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{new Date(user.created_at).toLocaleString("id-ID")}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => startEdit(user)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === user.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(user.id)} disabled={deleteLoading} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-white hover:bg-destructive/80 disabled:opacity-50 transition-colors">
                            {deleteLoading ? "..." : "Hapus"}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors">
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(user.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Inline edit row */}
                {editId === user.id && (
                  <tr key={`edit-${user.id}`} className="bg-accent/20 border-b border-border">
                    <td colSpan={5} className="px-5 py-4">
                      <form onSubmit={handleUpdate} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                            <input
                              type="email" required value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password baru (kosongkan jika tidak diubah)</label>
                            <input
                              type="password" value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              placeholder="Biarkan kosong"
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="w-4 h-4 accent-primary" />
                            <span className="text-sm text-foreground">Aktif</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.is_superadmin} onChange={(e) => setEditForm({ ...editForm, is_superadmin: e.target.checked })} className="w-4 h-4 accent-primary" />
                            <span className="text-sm text-foreground">Superadmin</span>
                          </label>
                        </div>
                        {editError && <p className="text-sm text-destructive">{editError}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={editLoading} className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                            {editLoading ? "Menyimpan..." : "Simpan"}
                          </button>
                          <button type="button" onClick={() => setEditId(null)} className="px-4 py-1.5 border border-border text-xs font-medium rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                            Batal
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
