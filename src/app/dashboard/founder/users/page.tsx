'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Edit3,
  Eye,
  EyeOff,
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
  Search,
  CheckCircle2,
  AlertCircle,
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

type ToastType = 'success' | 'error'

type Toast = {
  type: ToastType
  message: string
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
      (role) => role.id === roleId,
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

function getUsersByRole(
  users: User[],
  roleId: number,
) {
  return users.filter(
    (user) => user.role_id === roleId,
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

  /*
   * User yang sedang dipilih untuk dihapus.
   *
   * Jika nilainya null → modal konfirmasi tidak tampil.
   * Jika berisi User → modal konfirmasi tampil.
   */
  const [deleteTarget, setDeleteTarget] =
    useState<User | null>(null)

  const [searchQuery, setSearchQuery] =
    useState('')

  const [toast, setToast] =
    useState<Toast | null>(null)

  const [showPassword, setShowPassword] =
    useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    roleId: '3',
  })

  /*
   * ============================================================
   * TOAST
   * ============================================================
   */

  function showToast(
    type: ToastType,
    message: string,
  ) {
    setToast({
      type,
      message,
    })

    window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  /*
   * ============================================================
   * LOAD USERS
   * ============================================================
   */

  async function loadUsers() {
    try {
      setLoading(true)

      const response = await fetch(
        '/api/founder/users',
        {
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data pengguna.',
        )
      }

      setUsers(result.users ?? [])
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data pengguna.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  /*
   * ============================================================
   * SEARCH
   * ============================================================
   */

  function matchesSearch(user: User) {
    const query =
      searchQuery
        .trim()
        .toLowerCase()

    if (!query) {
      return true
    }

    return (
      user.full_name
        .toLowerCase()
        .includes(query) ||
      getRoleName(user.role_id)
        .toLowerCase()
        .includes(query) ||
      user.phone_number
        ?.toLowerCase()
        .includes(query) ||
      user.id
        .toLowerCase()
        .includes(query)
    )
  }

  const filteredUsers = useMemo(
    () =>
      users.filter(matchesSearch),
    [users, searchQuery],
  )

  const founders = useMemo(
    () =>
      getUsersByRole(
        filteredUsers,
        1,
      ),
    [filteredUsers],
  )

  const tutors = useMemo(
    () =>
      getUsersByRole(
        filteredUsers,
        2,
      ),
    [filteredUsers],
  )

  const parents = useMemo(
    () =>
      getUsersByRole(
        filteredUsers,
        3,
      ),
    [filteredUsers],
  )

  /*
   * ============================================================
   * MODAL CREATE / EDIT
   * ============================================================
   */

  function openCreateModal() {
    setEditingUser(null)

    setForm({
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      roleId: '3',
    })

    setShowPassword(false)
    setModalOpen(true)
  }

  function openEditModal(user: User) {
    /*
     * Founder tidak boleh diedit.
     * Guard tambahan di frontend.
     */
    if (user.role_id === 1) {
      showToast(
        'error',
        'Akun Founder dilindungi dan tidak dapat diedit.',
      )
      return
    }

    setEditingUser(user)

    setForm({
      email: '',
      password: '',
      fullName: user.full_name,
      phoneNumber:
        user.phone_number ?? '',
      roleId: String(user.role_id),
    })

    setShowPassword(false)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingUser(null)
    setShowPassword(false)
  }

  /*
   * ============================================================
   * CREATE / EDIT
   * ============================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    try {
      setSaving(true)

      const url = editingUser
        ? `/api/founder/users/${editingUser.id}`
        : '/api/founder/users'

      const method = editingUser
        ? 'PATCH'
        : 'POST'

      const body = editingUser
        ? {
            fullName: form.fullName,
            phoneNumber:
              form.phoneNumber,
            roleId: form.roleId,
            password:
              form.password || undefined,
          }
        : {
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            phoneNumber:
              form.phoneNumber,
            roleId: form.roleId,
          }

      const response = await fetch(
        url,
        {
          method,
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(body),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menyimpan pengguna.',
        )
      }

      setModalOpen(false)
      setEditingUser(null)
      setShowPassword(false)

      showToast(
        'success',
        editingUser
          ? 'Data pengguna berhasil diperbarui.'
          : 'Akun pengguna berhasil dibuat.',
      )

      await loadUsers()
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan pengguna.',
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ============================================================
   * DELETE
   * ============================================================
   */

  function handleDelete(user: User) {
    /*
     * Founder tidak boleh dihapus.
     */
    if (user.role_id === 1) {
      showToast(
        'error',
        'Akun Founder dilindungi dan tidak dapat dihapus.',
      )
      return
    }

    /*
     * Jangan langsung menghapus.
     * Simpan user sebagai target sehingga
     * custom confirmation modal dapat ditampilkan.
     */
    setDeleteTarget(user)
  }

  /*
   * ============================================================
   * CONFIRM DELETE
   * ============================================================
   */

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      setDeletingId(deleteTarget.id)

      const response =
        await fetch(
          `/api/founder/users/${deleteTarget.id}`,
          {
            method: 'DELETE',
          },
        )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menghapus pengguna.',
        )
      }

      /*
       * Tutup confirmation modal
       * setelah delete berhasil.
       */
      setDeleteTarget(null)

      showToast(
        'success',
        'Akun pengguna berhasil dihapus secara permanen.',
      )

      await loadUsers()
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal menghapus pengguna.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  /*
   * ============================================================
   * CANCEL DELETE
   * ============================================================
   */

  function cancelDelete() {
    /*
     * Jika sedang proses delete,
     * jangan tutup modal.
     */
    if (deletingId) return

    setDeleteTarget(null)
  }

  /*
   * ============================================================
   * SUMMARY
   * ============================================================
   */

  const totalFounder =
    users.filter(
      (user) => user.role_id === 1,
    ).length

  const totalTutor =
    users.filter(
      (user) => user.role_id === 2,
    ).length

  const totalParent =
    users.filter(
      (user) => user.role_id === 3,
    ).length

  /*
   * ============================================================
   * USER SECTION
   * ============================================================
   */

  function UserSection({
    title,
    description,
    users: sectionUsers,
    icon,
    iconClass,
  }: {
    title: string
    description: string
    users: User[]
    icon: React.ReactNode
    iconClass: string
  }) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 rounded-xl p-2.5 ${iconClass}`}
            >
              {icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {title}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {description}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {sectionUsers.length}{' '}
                  pengguna
                </span>
              </div>
            </div>
          </div>
        </div>

        {sectionUsers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Users
                size={23}
                className="text-slate-400"
              />
            </div>

            <p className="text-sm font-medium text-slate-700">
              {searchQuery
                ? 'Tidak ada hasil pencarian.'
                : `Belum ada ${title.toLowerCase()}.`}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {searchQuery
                ? 'Coba gunakan kata kunci lain.'
                : 'Data pengguna akan muncul di bagian ini.'}
            </p>
          </div>
        ) : (
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
                {sectionUsers.map(
                  (user) => {
                    const isFounder =
                      user.role_id === 1

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        {/* USER */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                font-semibold
                                ${
                                  isFounder
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-slate-100 text-slate-700'
                                }
                              `}
                            >
                              {getInitial(
                                user.full_name,
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium text-slate-900">
                                  {
                                    user.full_name
                                  }
                                </p>

                                {isFounder && (
                                  <ShieldCheck
                                    size={15}
                                    className="shrink-0 text-red-500"
                                  />
                                )}
                              </div>

                              <p className="mt-0.5 text-xs text-slate-400">
                                ID:{' '}
                                {user.id.slice(
                                  0,
                                  8,
                                )}
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
                                  {
                                    user.phone_number
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* ROLE */}
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
                                user.role_id,
                              )}
                            `}
                          >
                            {getRoleName(
                              user.role_id,
                            )}
                          </span>
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-4">
                          {isFounder ? (
                            <div className="flex justify-end">
                              <span className="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                                <LockKeyhole
                                  size={14}
                                />
                                Terlindungi
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    user,
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <Edit3
                                  size={16}
                                />
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
                                    user,
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                          )}
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ========================================================
          TOAST
      ======================================================== */}

      {toast && (
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6">
          <div
            className={`
              flex
              items-start
              gap-3
              rounded-2xl
              border
              bg-white
              px-4
              py-4
              shadow-xl
              ${
                toast.type ===
                'success'
                  ? 'border-emerald-200'
                  : 'border-red-200'
              }
            `}
          >
            <div
              className={`
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                ${
                  toast.type ===
                  'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }
              `}
            >
              {toast.type ===
              'success' ? (
                <CheckCircle2
                  size={19}
                />
              ) : (
                <AlertCircle
                  size={19}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {toast.type ===
                'success'
                  ? 'Berhasil'
                  : 'Gagal'}
              </p>

              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          HEADER
      ======================================================== */}

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
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
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

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* INFO */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-red-50 p-3 text-red-600">
                <LockKeyhole
                  size={22}
                />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  Kontrol Pengguna Terpusat
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Founder memiliki kendali
                  pengelolaan akun Tutor dan
                  Orang Tua. Akun Founder
                  dilindungi dan tidak dapat
                  diedit atau dihapus melalui
                  sistem.
                </p>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
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
                  <ShieldCheck
                    size={18}
                  />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalFounder}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Akun terlindungi
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

            {/* PARENT */}
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

          {/* SEARCH */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="Cari nama, peran, nomor telepon, atau ID pengguna..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery('')
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  aria-label="Hapus pencarian"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {searchQuery && (
              <p className="mt-2 px-1 text-xs text-slate-400">
                Menampilkan{' '}
                <span className="font-semibold text-slate-600">
                  {filteredUsers.length}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-slate-600">
                  {users.length}
                </span>{' '}
                pengguna
              </p>
            )}
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          ) : (
            <div className="space-y-6">
              {/* FOUNDER */}
              <UserSection
                title="Founder"
                description="Akun dengan akses pengelolaan sistem."
                users={founders}
                icon={
                  <ShieldCheck
                    size={20}
                  />
                }
                iconClass="bg-red-50 text-red-600"
              />

              {/* TUTOR */}
              <UserSection
                title="Tutor"
                description="Akun pengajar yang mengelola kegiatan akademik."
                users={tutors}
                icon={
                  <UserPlus
                    size={20}
                  />
                }
                iconClass="bg-blue-50 text-blue-600"
              />

              {/* PARENT */}
              <UserSection
                title="Orang Tua"
                description="Akun orang tua untuk memantau perkembangan anak."
                users={parents}
                icon={
                  <Users size={20} />
                }
                iconClass="bg-emerald-50 text-emerald-600"
              />
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          CREATE / EDIT MODAL
      ======================================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="my-8 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  {editingUser
                    ? 'Edit Pengguna'
                    : 'Tambah Pengguna'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Data akun dikelola oleh
                  Founder.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
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
                    pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="contoh@nagala.edu"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
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
                  minLength={2}
                  maxLength={100}
                  value={form.fullName}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        fullName:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Nama lengkap pengguna"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {/* TELEPON */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nomor Telepon
                </label>

                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10,13}"
                  minLength={10}
                  maxLength={13}
                  value={form.phoneNumber}
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(
                        /\D/g,
                        '',
                      )

                    if (
                      value.length <= 13
                    ) {
                      setForm(
                        (current) => ({
                          ...current,
                          phoneNumber:
                            value,
                        }),
                      )
                    }
                  }}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {/* ROLE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Peran Pengguna
                </label>

                <select
                  value={form.roleId}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        roleId:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  {roles
                    .filter(
                      (role) =>
                        role.id !== 1,
                    )
                    .map(
                      (role) => (
                        <option
                          key={
                            role.id
                          }
                          value={
                            role.id
                          }
                        >
                          {
                            role.role_name
                          }
                        </option>
                      ),
                    )}
                </select>

                <p className="mt-1.5 text-xs text-slate-400">
                  Akun Founder tidak dapat
                  dibuat melalui formulir ini.
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {editingUser
                    ? 'Password Baru'
                    : 'Password'}
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    required={
                      !editingUser
                    }
                    minLength={6}
                    value={
                      form.password
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          password:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder={
                      editingUser
                        ? 'Kosongkan jika tidak diubah'
                        : 'Minimal 6 karakter'
                    }
                    className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-12 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showPassword
                        ? 'Sembunyikan password'
                        : 'Tampilkan password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={19}
                      />
                    ) : (
                      <Eye
                        size={19}
                      />
                    )}
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  {editingUser
                    ? 'Isi hanya jika ingin mengganti password.'
                    : 'Gunakan minimal 6 karakter.'}
                </p>
              </div>

              {/* ACTION */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* ========================================================
          DELETE CONFIRMATION MODAL
      ======================================================== */}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* ICON */}
            <div className="flex justify-center px-6 pt-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={25} />
              </div>
            </div>

            {/* CONTENT */}
            <div className="px-6 pb-6 pt-4 text-center">
              <h2
                id="delete-user-title"
                className="text-lg font-bold text-slate-900"
              >
                Hapus Pengguna?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Yakin ingin menghapus akun{' '}
                <span className="font-semibold text-slate-700">
                  {deleteTarget.full_name}
                </span>{' '}
                secara permanen?
              </p>

              {/* WARNING */}
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-500"
                  />

                  <p className="text-xs leading-5 text-red-700">
                    Tindakan ini tidak dapat
                    dibatalkan. Seluruh akses
                    akun pengguna akan dihapus
                    secara permanen.
                  </p>
                </div>
              </div>
            </div>

            {/* ACTION */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  deletingId ===
                  deleteTarget.id
                }
                onClick={cancelDelete}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={
                  deletingId ===
                  deleteTarget.id
                }
                onClick={confirmDelete}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ===
                deleteTarget.id ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Hapus Pengguna
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
