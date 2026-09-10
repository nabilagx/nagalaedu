'use client'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import {
  Edit3,
  Loader2,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  Phone,
} from 'lucide-react'

type UserRole = {
  id: number
  role_name: string
}

type User = {
  id: string
  full_name: string
  phone_number: string | null
  role_id: number
  roles:
    | {
        role_name: string
      }
    | {
        role_name: string
      }[]
    | null
}

const roles: UserRole[] = [
  {
    id: 1,
    role_name: 'Founder',
  },
  {
    id: 2,
    role_name: 'Tutor',
  },
  {
    id: 3,
    role_name: 'Orang Tua',
  },
]

function getRoleName(roleId: number) {
  return (
    roles.find(
      (role) => role.id === roleId
    )?.role_name ?? 'Tidak diketahui'
  )
}

function getRoleStyle(roleId: number) {
  if (roleId === 1) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (roleId === 2) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function getInitial(name: string) {
  return (
    name?.charAt(0)?.toUpperCase() || '?'
  )
}

export default function FounderUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingUser, setEditingUser] =
    useState<User | null>(null)

  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    roleId: '3',
  })

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        '/api/founder/users'
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data pengguna.'
        )
      }

      setUsers(result.users ?? [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data pengguna.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function openCreateModal() {
    setEditingUser(null)

    setForm({
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      roleId: '3',
    })

    setMessage('')
    setError('')
    setModalOpen(true)
  }

  function openEditModal(user: User) {
    setEditingUser(user)

    setForm({
      email: '',
      password: '',
      fullName: user.full_name,
      phoneNumber: user.phone_number ?? '',
      roleId: String(user.role_id),
    })

    setMessage('')
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingUser(null)
    setError('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')
      setMessage('')

      const url = editingUser
        ? `/api/founder/users/${editingUser.id}`
        : '/api/founder/users'

      const method = editingUser
        ? 'PATCH'
        : 'POST'

      const body = editingUser
        ? {
            fullName: form.fullName,
            phoneNumber: form.phoneNumber,
            roleId: form.roleId,
            password:
              form.password || undefined,
          }
        : {
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            phoneNumber: form.phoneNumber,
            roleId: form.roleId,
          }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menyimpan pengguna.'
        )
      }

      setMessage(
        editingUser
          ? 'Data pengguna berhasil diperbarui.'
          : 'Akun pengguna berhasil dibuat.'
      )

      setModalOpen(false)
      setEditingUser(null)

      await loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan pengguna.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      `Hapus akun ${user.full_name} secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`
    )

    if (!confirmed) return

    try {
      setDeletingId(user.id)
      setError('')
      setMessage('')

      const response = await fetch(
        `/api/founder/users/${user.id}`,
        {
          method: 'DELETE',
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menghapus pengguna.'
        )
      }

      setMessage(
        'Akun pengguna berhasil dihapus secara permanen.'
      )

      await loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus pengguna.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const totalFounder = users.filter(
    (user) => user.role_id === 1
  ).length

  const totalTutor = users.filter(
    (user) => user.role_id === 2
  ).length

  const totalParent = users.filter(
    (user) => user.role_id === 3
  ).length

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Pengelolaan Sistem
            </p>

            <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">
              Pengguna
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-gradient-to-r
              from-[#E53935]
              to-[#FF5722]
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:shadow-md
            "
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Tambah Pengguna
            </span>

            <span className="sm:hidden">
              Tambah
            </span>
          </button>
        </div>
      </header>

      {/* KONTEN */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* INFORMASI */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-red-50 p-3 text-red-600">
                <LockKeyhole size={22} />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  Kontrol Pengguna Terpusat
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Hanya Founder yang dapat membuat,
                  mengubah, dan menghapus akun
                  pengguna. Tutor dan Orang Tua tidak
                  memiliki akses untuk mengelola akun
                  pengguna melalui sistem.
                </p>
              </div>
            </div>
          </div>

          {/* PESAN BERHASIL */}
          {message && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{message}</span>
            </div>
          )}

          {/* PESAN ERROR */}
          {error && !modalOpen && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* RINGKASAN */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* TOTAL */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Total Pengguna
                </span>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                  <Users size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {users.length}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Seluruh akun terdaftar
              </p>
            </div>

            {/* FOUNDER */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Founder
                </span>

                <div className="rounded-xl bg-red-50 p-2 text-red-500">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalFounder}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Pengelola sistem
              </p>
            </div>

            {/* TUTOR */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Tutor
                </span>

                <div className="rounded-xl bg-blue-50 p-2 text-blue-500">
                  <UserPlus size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalTutor}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Pengajar aktif
              </p>
            </div>

            {/* ORANG TUA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Orang Tua
                </span>

                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-500">
                  <Users size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalParent}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Pengguna orang tua
              </p>
            </div>
          </div>

          {/* DAFTAR PENGGUNA */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Daftar Pengguna
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Kelola seluruh akun yang terdaftar
                    di NAGALA Education.
                  </p>
                </div>

                <span className="text-xs font-medium text-slate-400">
                  {users.length} pengguna
                </span>
              </div>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="flex min-h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2
                    size={28}
                    className="animate-spin text-slate-400"
                  />

                  <p className="text-sm text-slate-500">
                    Memuat data pengguna...
                  </p>
                </div>
              </div>
            ) : users.length === 0 ? (
              /* KOSONG */
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-2xl bg-slate-100 p-4">
                  <Users
                    size={36}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="font-semibold text-slate-800">
                  Belum ada pengguna
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Tambahkan akun pengguna untuk mulai
                  mengelola akses NAGALA Education.
                </p>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-slate-800
                  "
                >
                  <Plus size={17} />
                  Tambah Pengguna
                </button>
              </div>
            ) : (
              /* TABEL */
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pengguna
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kontak
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Peran
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="
                          border-b
                          border-slate-100
                          last:border-0
                          hover:bg-slate-50/70
                        "
                      >
                        {/* PENGGUNA */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-slate-100
                              font-semibold
                              text-slate-700
                            ">
                              {getInitial(
                                user.full_name
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {user.full_name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                ID:{' '}
                                {user.id.slice(0, 8)}
                                ...
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* KONTAK */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail
                                size={15}
                                className="shrink-0 text-slate-400"
                              />

                              <span>
                                Akun terdaftar
                              </span>
                            </div>

                            {user.phone_number && (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Phone
                                  size={15}
                                  className="shrink-0 text-slate-400"
                                />

                                <span>
                                  {user.phone_number}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* PERAN */}
                        <td className="px-5 py-4">
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              border
                              px-3
                              py-1
                              text-xs
                              font-semibold
                              ${getRoleStyle(
                                user.role_id
                              )}
                            `}
                          >
                            {getRoleName(
                              user.role_id
                            )}
                          </span>
                        </td>

                        {/* AKSI */}
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  user
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-slate-200
                                px-3
                                py-2
                                text-sm
                                font-medium
                                text-slate-700
                                transition
                                hover:bg-slate-100
                              "
                            >
                              <Edit3 size={16} />
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={
                                deletingId ===
                                user.id
                              }
                              onClick={() =>
                                handleDelete(
                                  user
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-red-200
                                px-3
                                py-2
                                text-sm
                                font-medium
                                text-red-600
                                transition
                                hover:bg-red-50
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              {deletingId ===
                              user.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}

                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="
          fixed
          inset-0
          z-[60]
          flex
          items-center
          justify-center
          overflow-y-auto
          bg-slate-900/60
          p-4
        ">
          <div className="my-8 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER MODAL */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  {editingUser
                    ? 'Edit Pengguna'
                    : 'Tambah Pengguna'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Data akun dikelola oleh Founder.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  shrink-0
                  rounded-lg
                  p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:opacity-50
                "
                aria-label="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >
              {/* EMAIL */}
              {!editingUser && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email:
                          event.target.value,
                      }))
                    }
                    placeholder="contoh@nagala.edu"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      focus:border-red-400
                      focus:ring-2
                      focus:ring-red-100
                    "
                  />
                </div>
              )}

              {/* NAMA */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Lengkap
                </label>

                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName:
                        event.target.value,
                    }))
                  }
                  placeholder="Nama lengkap pengguna"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-400
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              {/* NOMOR TELEPON */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nomor Telepon
                </label>

                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phoneNumber:
                        event.target.value,
                    }))
                  }
                  placeholder="08xxxxxxxxxx"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-400
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              {/* PERAN */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Peran Pengguna
                </label>

                <select
                  value={form.roleId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roleId:
                        event.target.value,
                    }))
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-400
                    focus:ring-2
                    focus:ring-red-100
                  "
                >
                  {roles.map((role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {editingUser
                    ? 'Password Baru'
                    : 'Password'}
                </label>

                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password:
                        event.target.value,
                    }))
                  }
                  placeholder={
                    editingUser
                      ? 'Kosongkan jika tidak diubah'
                      : 'Minimal 6 karakter'
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-400
                    focus:ring-2
                    focus:ring-red-100
                  "
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  {editingUser
                    ? 'Isi hanya jika ingin mengganti password.'
                    : 'Gunakan minimal 6 karakter.'}
                </p>
              </div>

              {/* ERROR MODAL */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                  {error}
                </div>
              )}

              {/* TOMBOL */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    px-5
                    py-3
                    text-sm
                    font-medium
                    text-slate-700
                    transition
                    hover:bg-slate-50
                    disabled:opacity-50
                  "
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-gradient-to-r
                    from-[#E53935]
                    to-[#FF5722]
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition
                    hover:shadow-md
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {saving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingUser
                    ? 'Simpan Perubahan'
                    : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

