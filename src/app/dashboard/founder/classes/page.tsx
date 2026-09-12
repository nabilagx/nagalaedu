'use client'

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type ClassStatus = 'ACTIVE' | 'INACTIVE'

type Tutor = {
  id: string
  full_name: string
  phone_number: string | null
}

type ClassItem = {
  id: string
  class_name: string
  subject: string
  description: string | null
  tutor_id: string
  schedule_day: string
  schedule_start: string
  schedule_end: string
  status: ClassStatus
  tutors?: {
    full_name: string
  } | null
}

type ToastType = 'success' | 'error'

type Toast = {
  type: ToastType
  message: string
}

type FormData = {
  className: string
  subject: string
  description: string
  tutorId: string
  scheduleDay: string
  scheduleStart: string
  scheduleEnd: string
  status: ClassStatus
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

const DAYS = Object.keys(DAY_LABELS)

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

function hasControlChars(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value)
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null)

  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL')

  const [toast, setToast] = useState<Toast | null>(null)

  function showToast(type: ToastType, message: string) {
    setToast({ type, message })

    window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  async function loadData() {
    try {
      setLoading(true)

      const [classesResponse, tutorsResponse] = await Promise.all([
        fetch('/api/founder/classes', {
          method: 'GET',
          cache: 'no-store',
        }),
        fetch('/api/founder/classes?tutors=true', {
          method: 'GET',
          cache: 'no-store',
        }),
      ])

      const classesData = await classesResponse.json()
      const tutorsData = await tutorsResponse.json()

      if (!classesResponse.ok) {
        throw new Error(
          classesData?.error || 'Gagal mengambil data kelas.'
        )
      }

      if (!tutorsResponse.ok) {
        throw new Error(
          tutorsData?.error || 'Gagal mengambil data tutor.'
        )
      }

      const classRows = Array.isArray(classesData)
        ? classesData
        : Array.isArray(classesData?.classes)
          ? classesData.classes
          : []

      const tutorRows = Array.isArray(tutorsData)
        ? tutorsData
        : Array.isArray(tutorsData?.tutors)
          ? tutorsData.tutors
          : []

      setClasses(classRows)
      setTutors(tutorRows)
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Gagal memuat data kelas.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function getTutorName(item: ClassItem) {
    return (
      item.tutors?.full_name ??
      tutors.find((tutor) => tutor.id === item.tutor_id)?.full_name ??
      'Tutor tidak ditemukan'
    )
  }

  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return classes.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter

      if (!matchesStatus) return false

      if (!query) return true

      const tutorName = getTutorName(item).toLowerCase()

      return [
        item.class_name,
        item.subject,
        item.schedule_day,
        item.schedule_start,
        item.schedule_end,
        item.status,
        item.id,
        tutorName,
      ].some((value) =>
        String(value).toLowerCase().includes(query)
      )
    })
  }, [classes, searchQuery, statusFilter, tutors])

  const totalClasses = classes.length

  const activeClasses = classes.filter(
    (item) => item.status === 'ACTIVE'
  ).length

  const inactiveClasses = classes.filter(
    (item) => item.status === 'INACTIVE'
  ).length

  const involvedTutorIds = new Set(
    classes.map((item) => item.tutor_id)
  )

  const involvedTutors = involvedTutorIds.size

  function openCreateModal() {
    setEditingClass(null)
    setForm(EMPTY_FORM)
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
      scheduleStart: item.schedule_start,
      scheduleEnd: item.schedule_end,
      status: item.status,
    })

    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingClass(null)
    setForm(EMPTY_FORM)
  }

  function validateForm() {
    const className = form.className.trim()
    const subject = form.subject.trim()
    const description = form.description.trim()

    if (!className) {
      showToast('error', 'Nama kelas wajib diisi.')
      return false
    }

    if (className.length < 2 || className.length > 100) {
      showToast(
        'error',
        'Nama kelas harus terdiri dari 2–100 karakter.'
      )
      return false
    }

    if (hasControlChars(className)) {
      showToast('error', 'Nama kelas mengandung karakter yang tidak valid.')
      return false
    }

    if (!subject) {
      showToast('error', 'Mata pelajaran wajib diisi.')
      return false
    }

    if (subject.length < 2 || subject.length > 100) {
      showToast(
        'error',
        'Mata pelajaran harus terdiri dari 2–100 karakter.'
      )
      return false
    }

    if (hasControlChars(subject)) {
      showToast(
        'error',
        'Mata pelajaran mengandung karakter yang tidak valid.'
      )
      return false
    }

    if (description.length > 500) {
      showToast(
        'error',
        'Deskripsi maksimal 500 karakter.'
      )
      return false
    }

    if (hasControlChars(description)) {
      showToast(
        'error',
        'Deskripsi mengandung karakter yang tidak valid.'
      )
      return false
    }

    if (!form.tutorId) {
      showToast('error', 'Tutor wajib dipilih.')
      return false
    }

    const tutorExists = tutors.some(
      (tutor) => tutor.id === form.tutorId
    )

    if (!tutorExists) {
      showToast(
        'error',
        'Tutor yang dipilih tidak valid.'
      )
      return false
    }

    if (!DAYS.includes(form.scheduleDay)) {
      showToast(
        'error',
        'Hari jadwal tidak valid.'
      )
      return false
    }

    if (!isValidTime(form.scheduleStart)) {
      showToast(
        'error',
        'Jam mulai tidak valid.'
      )
      return false
    }

    if (!isValidTime(form.scheduleEnd)) {
      showToast(
        'error',
        'Jam selesai tidak valid.'
      )
      return false
    }

    if (
      timeToMinutes(form.scheduleEnd) <=
      timeToMinutes(form.scheduleStart)
    ) {
      showToast(
        'error',
        'Jam selesai harus lebih dari jam mulai.'
      )
      return false
    }

    if (
      form.status !== 'ACTIVE' &&
      form.status !== 'INACTIVE'
    ) {
      showToast(
        'error',
        'Status kelas tidak valid.'
      )
      return false
    }

    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saving) return

    if (!validateForm()) return

    try {
      setSaving(true)

      const payload = {
        className: form.className.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        tutorId: form.tutorId,
        scheduleDay: form.scheduleDay,
        scheduleStart: form.scheduleStart,
        scheduleEnd: form.scheduleEnd,
        status: form.status,
      }

      const isEditing = Boolean(editingClass)

      const response = await fetch(
        isEditing
          ? `/api/founder/classes/${editingClass?.id}`
          : '/api/founder/classes',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEditing
              ? 'Gagal memperbarui kelas.'
              : 'Gagal menambahkan kelas.')
        )
      }

      showToast(
        'success',
        isEditing
          ? 'Kelas berhasil diperbarui.'
          : 'Kelas berhasil ditambahkan.'
      )

      setModalOpen(false)
      setEditingClass(null)
      setForm(EMPTY_FORM)

      await loadData()
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan kelas.'
      )
    } finally {
      setSaving(false)
    }
  }

  function openDeleteModal(item: ClassItem) {
    setDeleteTarget(item)
    setDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    if (deletingId) return

    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  async function handleDelete() {
    if (!deleteTarget || deletingId) return

    try {
      setDeletingId(deleteTarget.id)

      const response = await fetch(
        `/api/founder/classes/${deleteTarget.id}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || 'Gagal menghapus kelas.'
        )
      }

      showToast(
        'success',
        'Kelas berhasil dihapus.'
      )

      setDeleteModalOpen(false)
      setDeleteTarget(null)

      await loadData()
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menghapus kelas.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* TOAST */}
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
                toast.type === 'success'
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
                  toast.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }
              `}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={19} />
              ) : (
                <AlertCircle size={19} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {toast.type === 'success'
                  ? 'Berhasil'
                  : 'Gagal'}
              </p>

              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Pengelolaan Sistem
            </p>

            <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">
              Kelas
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">
              Tambah Kelas
            </span>
            <span className="sm:hidden">
              Tambah
            </span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* INFO */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <GraduationCap size={22} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Manajemen Kelas
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Kelola kelas, mata pelajaran, tutor, jadwal,
                  dan status pembelajaran Nagala Education dalam
                  satu tempat.
                </p>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Total Kelas
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {totalClasses}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <BookOpen size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Kelas Aktif
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {activeClasses}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Tidak Aktif
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {inactiveClasses}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <BookOpen size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Tutor Terlibat
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {involvedTutors}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users size={21} />
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH + FILTER */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Cari kelas, mata pelajaran, tutor..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Hapus pencarian"
                  >
                    <X size={16} />
                  </button>
                )}
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 lg:w-52"
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

            <p className="mt-3 text-xs text-slate-400">
              Menampilkan {filteredClasses.length} dari{' '}
              {totalClasses} kelas
            </p>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  size={28}
                  className="animate-spin text-red-500"
                />

                <p className="text-sm text-slate-500">
                  Memuat data kelas...
                </p>
              </div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BookOpen size={25} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                {classes.length === 0
                  ? 'Belum ada kelas'
                  : 'Kelas tidak ditemukan'}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {classes.length === 0
                  ? 'Tambahkan kelas pertama untuk mulai mengatur jadwal dan tutor.'
                  : 'Coba gunakan kata kunci pencarian atau filter status yang berbeda.'}
              </p>

              {classes.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                >
                  <Plus size={17} />
                  Tambah Kelas
                </button>
              )}
            </div>
          ) : (
            /* CARD GRID */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredClasses.map((item) => {
                const tutorName = getTutorName(item)

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* CARD HEADER */}
                    <div className="border-b border-slate-100 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <BookOpen size={20} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-900">
                              {item.class_name}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.subject}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`
                            shrink-0
                            rounded-full
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }
                          `}
                        >
                          {item.status === 'ACTIVE'
                            ? 'Aktif'
                            : 'Tidak Aktif'}
                        </span>
                      </div>
                    </div>

                    {/* CARD BODY */}
                    <div className="space-y-4 p-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-slate-400">
                          <UserRound size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-400">
                            Tutor
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-700">
                            {tutorName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-slate-400">
                          <CalendarDays size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-400">
                            Jadwal
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {DAY_LABELS[item.schedule_day] ??
                              item.schedule_day}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-slate-400">
                          <Clock3 size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-400">
                            Waktu
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {item.schedule_start} –{' '}
                            {item.schedule_end}
                          </p>
                        </div>
                      </div>

                      {item.description && (
                        <div className="rounded-xl bg-slate-50 p-3.5">
                          <p className="text-xs font-medium text-slate-400">
                            Deskripsi
                          </p>

                          <p className="mt-1.5 text-sm leading-5 text-slate-600">
                            {item.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* CARD ACTIONS */}
                    <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 p-4">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                        Hapus
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 p-3 sm:p-5">
          <div className="flex min-h-full items-center justify-center py-4 sm:py-8">
            <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-4rem)]">
              {/* MODAL HEADER */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingClass
                      ? 'Edit Kelas'
                      : 'Tambah Kelas'}
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {editingClass
                      ? 'Perbarui informasi kelas.'
                      : 'Tambahkan kelas baru ke Nagala Education.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="ml-4 shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Tutup modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* SCROLLABLE FORM AREA */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <form
  id="class-form"
  onSubmit={handleSubmit}
  noValidate
  className="space-y-5 p-5 sm:p-6"
>
                  {/* NAMA + SUBJECT */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="className"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Nama Kelas
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <input
                        id="className"
                        type="text"
                        value={form.className}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            className: event.target.value,
                          }))
                        }
                        maxLength={100}
                        placeholder="Contoh: Matematika Kelas 6"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        {form.className.length}/100 karakter
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Mata Pelajaran
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <input
                        id="subject"
                        type="text"
                        value={form.subject}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            subject: event.target.value,
                          }))
                        }
                        maxLength={100}
                        placeholder="Contoh: Matematika"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        {form.subject.length}/100 karakter
                      </p>
                    </div>
                  </div>

                  {/* TUTOR */}
                  <div>
                    <label
                      htmlFor="tutorId"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Tutor
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      id="tutorId"
                      value={form.tutorId}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          tutorId: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
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
                      <p className="mt-2 text-xs text-amber-600">
                        Belum ada tutor yang tersedia.
                      </p>
                    )}
                  </div>

                  {/* JADWAL */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                        <CalendarDays size={18} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Jadwal Kelas
                        </h3>

                        <p className="text-xs text-slate-400">
                          Tentukan hari dan waktu pembelajaran.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor="scheduleDay"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Hari
                          <span className="ml-1 text-red-500">
                            *
                          </span>
                        </label>

                        <select
                          id="scheduleDay"
                          value={form.scheduleDay}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              scheduleDay: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        >
                          {DAYS.map((day) => (
                            <option
                              key={day}
                              value={day}
                            >
                              {DAY_LABELS[day]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="scheduleStart"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Jam Mulai
                          <span className="ml-1 text-red-500">
                            *
                          </span>
                        </label>

                        <input
                          id="scheduleStart"
                          type="time"
                          value={form.scheduleStart}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              scheduleStart:
                                event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="scheduleEnd"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Jam Selesai
                          <span className="ml-1 text-red-500">
                            *
                          </span>
                        </label>

                        <input
                          id="scheduleEnd"
                          type="time"
                          value={form.scheduleEnd}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              scheduleEnd:
                                event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div>
                    <label
                      htmlFor="status"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Status
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      id="status"
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as ClassStatus,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="ACTIVE">
                        Aktif
                      </option>

                      <option value="INACTIVE">
                        Tidak Aktif
                      </option>
                    </select>
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="description"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Deskripsi
                      </label>

                      <span className="text-xs text-slate-400">
                        {form.description.length}/500
                      </span>
                    </div>

                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      maxLength={500}
                      rows={4}
                      placeholder="Tambahkan deskripsi singkat mengenai kelas..."
                      className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  {/* MOBILE EXTRA SPACE */}
                  <div className="h-1 sm:h-0" />
                </form>
              </div>

              {/* MODAL FOOTER */}
              <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const formElement =
                        document.querySelector(
                          '#class-form'
                        ) as HTMLFormElement | null

                      formElement?.requestSubmit()
                    }}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        {editingClass
                          ? 'Simpan Perubahan'
                          : 'Simpan Kelas'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 size={20} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    Hapus Kelas?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Kelas ini akan dihapus secara permanen
                    dari sistem.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">
                  {deleteTarget.class_name}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {deleteTarget.subject}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {DAY_LABELS[deleteTarget.schedule_day] ??
                    deleteTarget.schedule_day}{' '}
                  • {deleteTarget.schedule_start} –{' '}
                  {deleteTarget.schedule_end}
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={Boolean(deletingId)}
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={Boolean(deletingId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {deletingId ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 size={17} />
                      Ya, Hapus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}