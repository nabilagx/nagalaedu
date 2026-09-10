'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Edit3,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

type Tutor = {
  id: string
  full_name: string
  phone_number: string | null
}

type ClassItem = {
  id: string
  tutor_id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string
  schedule_start: string
  schedule_end: string
  status: 'ACTIVE' | 'INACTIVE'
  tutor:
    | {
        full_name: string
        phone_number: string | null
      }
    | null
}

type FormData = {
  className: string
  subject: string
  description: string
  tutorId: string
  scheduleDay: string
  scheduleStart: string
  scheduleEnd: string
  status: 'ACTIVE' | 'INACTIVE'
}

const EMPTY_FORM: FormData = {
  className: '',
  subject: '',
  description: '',
  tutorId: '',
  scheduleDay: 'SENIN',
  scheduleStart: '13:00',
  scheduleEnd: '14:30',
  status: 'ACTIVE',
}

const DAY_LABELS: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
  MINGGU: 'Minggu',
}

function formatTime(value: string) {
  if (!value) return '-'
  return value.slice(0, 5)
}

function formatDay(value: string) {
  return DAY_LABELS[value] ?? value
}

export default function FounderClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [editingClass, setEditingClass] =
    useState<ClassItem | null>(null)

  const [deletingClass, setDeletingClass] =
    useState<ClassItem | null>(null)

  const [form, setForm] =
    useState<FormData>(EMPTY_FORM)

  const [error, setError] = useState('')

  // ==========================================
  // LOAD DATA
  // ==========================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [classesResponse, tutorsResponse] =
        await Promise.all([
          fetch('/api/founder/classes', {
            cache: 'no-store',
          }),
          fetch('/api/founder/classes?tutors=true', {
            cache: 'no-store',
          }),
        ])

      const classesData =
        await classesResponse.json()

      const tutorsData =
        await tutorsResponse.json()

      if (!classesResponse.ok) {
        throw new Error(
          classesData.error ||
            'Gagal mengambil data kelas.'
        )
      }

      if (!tutorsResponse.ok) {
        throw new Error(
          tutorsData.error ||
            'Gagal mengambil data tutor.'
        )
      }

      setClasses(classesData.classes ?? [])
      setTutors(tutorsData.tutors ?? [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ==========================================
  // FILTER
  // ==========================================
  const filteredClasses = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()

    return classes.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.class_name
          .toLowerCase()
          .includes(keyword) ||
        item.subject
          .toLowerCase()
          .includes(keyword) ||
        item.tutor?.full_name
          ?.toLowerCase()
          .includes(keyword)

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [classes, search, statusFilter])

  const activeCount = classes.filter(
    (item) => item.status === 'ACTIVE'
  ).length

  const inactiveCount = classes.filter(
    (item) => item.status === 'INACTIVE'
  ).length

  // ==========================================
  // MODAL
  // ==========================================
  function openCreateModal() {
    setEditingClass(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(item: ClassItem) {
    setEditingClass(item)

    setForm({
      className: item.class_name,
      subject: item.subject,
      description: item.description ?? '',
      tutorId: item.tutor_id,
      scheduleDay: item.schedule_day,
      scheduleStart: formatTime(
        item.schedule_start
      ),
      scheduleEnd: formatTime(
        item.schedule_end
      ),
      status: item.status,
    })

    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingClass(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  // ==========================================
  // SAVE
  // ==========================================
  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault()

    setSaving(true)
    setError('')

    try {
      const endpoint = editingClass
        ? `/api/founder/classes/${editingClass.id}`
        : '/api/founder/classes'

      const method = editingClass
        ? 'PATCH'
        : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Gagal menyimpan kelas.'
        )
      }

      closeModal()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan kelas.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // DELETE
  // ==========================================
  function openDeleteModal(item: ClassItem) {
    setDeletingClass(item)
    setError('')
    setDeleteOpen(true)
  }

  function closeDeleteModal() {
    if (saving) return

    setDeleteOpen(false)
    setDeletingClass(null)
    setError('')
  }

  async function handleDelete() {
    if (!deletingClass) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        `/api/founder/classes/${deletingClass.id}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Gagal menghapus kelas.'
        )
      }

      closeDeleteModal()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus kelas.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}
      <section className="border-b border-slate-200 bg-white">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <GraduationCap size={17} />
                <span>Operasional</span>
                <span>/</span>
                <span className="text-slate-900">
                  Kelas
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Kelas
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Kelola kelas, tutor, mata pelajaran,
                dan jadwal pembelajaran.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={18} />
              Tambah Kelas
            </button>
          </div>
        </div>
      </section>

      {/* ===================================== */}
      {/* CONTENT */}
      {/* ===================================== */}
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        {/* SUMMARY */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Kelas
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {classes.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <BookOpen size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Kelas Aktif
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <BookOpen size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Kelas Tidak Aktif
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {inactiveCount}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
                <BookOpen size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama kelas, mata pelajaran, atau tutor..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | 'ALL'
                    | 'ACTIVE'
                    | 'INACTIVE'
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="ALL">
                Semua Status
              </option>
              <option value="ACTIVE">
                Aktif
              </option>
              <option value="INACTIVE">
                Tidak Aktif
              </option>
            </select>
          </div>
        </div>

        {/* ERROR */}
        {error && !modalOpen && !deleteOpen && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kelas
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tutor
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Jadwal
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Memuat data kelas...
                    </td>
                  </tr>
                ) : filteredClasses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-400">
                          <BookOpen size={25} />
                        </div>

                        <p className="font-semibold text-slate-800">
                          Belum ada kelas
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Tambahkan kelas baru untuk
                          mulai mengatur pembelajaran.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.class_name}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.subject}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound size={17} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.tutor
                                ?.full_name ??
                                'Belum ditentukan'}
                            </p>

                            {item.tutor
                              ?.phone_number && (
                              <p className="text-xs text-slate-400">
                                {
                                  item.tutor
                                    .phone_number
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <CalendarDays
                            size={16}
                            className="text-slate-400"
                          />
                          <span>
                            {formatDay(
                              item.schedule_day
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <Clock3
                            size={14}
                            className="text-slate-400"
                          />
                          <span>
                            {formatTime(
                              item.schedule_start
                            )}{' '}
                            –{' '}
                            {formatTime(
                              item.schedule_end
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {item.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Tidak Aktif
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(item)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Edit kelas"
                          >
                            <Edit3 size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDeleteModal(item)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Hapus kelas"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ===================================== */}
      {/* CREATE / EDIT MODAL */}
      {/* ===================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingClass
                    ? 'Edit Kelas'
                    : 'Tambah Kelas'}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Isi informasi kelas dan jadwal
                  pembelajaran.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5 sm:p-6"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nama Kelas
                  </label>

                  <input
                    type="text"
                    value={form.className}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        className:
                          event.target.value,
                      }))
                    }
                    placeholder="Contoh: Fisika X"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Mata Pelajaran
                  </label>

                  <input
                    type="text"
                    value={form.subject}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        subject:
                          event.target.value,
                      }))
                    }
                    placeholder="Contoh: Fisika"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tutor
                </label>

                <select
                  value={form.tutorId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      tutorId:
                        event.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">
                    Pilih tutor
                  </option>

                  {tutors.map((tutor) => (
                    <option
                      key={tutor.id}
                      value={tutor.id}
                    >
                      {tutor.full_name}
                    </option>
                  ))}
                </select>

                {tutors.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Belum ada akun Tutor. Tambahkan
                    Tutor melalui menu Pengguna.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Deskripsi
                  <span className="ml-1 font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description:
                        event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Deskripsi singkat kelas..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays
                    size={18}
                    className="text-slate-500"
                  />
                  <h3 className="text-sm font-bold text-slate-800">
                    Jadwal Pembelajaran
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Hari
                    </label>

                    <select
                      value={form.scheduleDay}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleDay:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      {Object.entries(
                        DAY_LABELS
                      ).map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Jam Mulai
                    </label>

                    <input
                      type="time"
                      value={form.scheduleStart}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleStart:
                            event.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Jam Selesai
                    </label>

                    <input
                      type="time"
                      value={form.scheduleEnd}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleEnd:
                            event.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status:
                        event.target.value as
                          | 'ACTIVE'
                          | 'INACTIVE',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="ACTIVE">
                    Aktif
                  </option>
                  <option value="INACTIVE">
                    Tidak Aktif
                  </option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Menyimpan...'
                    : editingClass
                      ? 'Simpan Perubahan'
                      : 'Tambah Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================== */}
      {/* DELETE MODAL */}
      {/* ===================================== */}
      {deleteOpen && deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Hapus Kelas?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Kelas{' '}
              <span className="font-semibold text-slate-800">
                {deletingClass.class_name}
              </span>{' '}
              akan dihapus secara permanen. Data
              terkait yang masih memiliki hubungan
              dengan kelas dapat mencegah proses
              penghapusan.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving
                  ? 'Menghapus...'
                  : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
