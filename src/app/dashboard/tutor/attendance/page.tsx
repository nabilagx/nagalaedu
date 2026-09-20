"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type AttendanceStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA"

type ClassItem = {
  id: string
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  student_count: number
}

type AttendanceRow = {
  enrollment_id: string
  student_id: string
  student_name: string
  grade_level: string
  status: AttendanceStatus | null
  notes: string | null
}

type RecapSummary = {
  total_students: number
  total_attendance: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_percentage: number
}

type AttendanceMeta = {
  is_saved: boolean
  saved_count: number
  last_updated_at: string | null
}

type HistoryItem = {
  attendance_date: string
  weekday: string
  total_students: number
  total_attendance: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_percentage: number
  last_updated_at: string | null
}

type ToastType = "success" | "error" | "info"

type ToastState = {
  id: number
  type: ToastType
  message: string
} | null

type DeleteTarget = {
  attendance_date: string
  weekday: string
  total_attendance: number
} | null

type ViewMode = "history" | "editor"

const NAVY = "#111827"
const CRIMSON = "#E53935"

const EMPTY_SUMMARY: RecapSummary = {
  total_students: 0,
  total_attendance: 0,
  hadir: 0,
  izin: 0,
  sakit: 0,
  alpha: 0,
  attendance_percentage: 0,
}

const EMPTY_META: AttendanceMeta = {
  is_saved: false,
  saved_count: 0,
  last_updated_at: null,
}

const STATUS_OPTIONS: {
  value: AttendanceStatus
  label: string
  short: string
}[] = [
  { value: "HADIR", label: "Hadir", short: "H" },
  { value: "IZIN", label: "Izin", short: "I" },
  { value: "SAKIT", label: "Sakit", short: "S" },
  { value: "ALPHA", label: "Alpha", short: "A" },
]

function getTodayJakarta() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${map.year}-${map.month}-${map.day}`
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function formatDate(value: string) {
  if (!isValidDate(value)) return value

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T12:00:00+07:00`))
}

function formatShortDate(value: string) {
  if (!isValidDate(value)) return value

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T12:00:00+07:00`))
}

function formatTime(value: string | null) {
  if (!value) return null

  return value.slice(0, 5)
}

function formatDateTime(value: string | null) {
  if (!value) return "Belum ada"

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))
}

function normalizeStatus(value: unknown): AttendanceStatus | null {
  if (
    value === "HADIR" ||
    value === "IZIN" ||
    value === "SAKIT" ||
    value === "ALPHA"
  ) {
    return value
  }

  return null
}

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message
  }

  return fallback
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
        <History size={22} className="text-gray-500" />
      </div>

      <h3 className="text-base font-bold text-gray-900">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {description}
      </p>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string
  value: number | string
  description?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>

      {description ? (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      ) : null}
    </div>
  )
}

function StatusButton({
  status,
  selected,
  onClick,
}: {
  status: (typeof STATUS_OPTIONS)[number]
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition ${
        selected
          ? "border-gray-900 bg-gray-900 text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
      }`}
      title={status.label}
    >
      <span className="hidden sm:inline">{status.label}</span>
      <span className="sm:hidden">{status.short}</span>
    </button>
  )
}

function TutorAttendanceContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [summary, setSummary] = useState<RecapSummary>(EMPTY_SUMMARY)
  const [meta, setMeta] = useState<AttendanceMeta>(EMPTY_META)

  const [selectedDate, setSelectedDate] = useState("")
  const [draftDate, setDraftDate] = useState("")
  const [editingOriginalDate, setEditingOriginalDate] = useState<string | null>(
    null,
  )

  const [viewMode, setViewMode] = useState<ViewMode>("history")

  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<ToastState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [showNewDateModal, setShowNewDateModal] = useState(false)
  const [newDate, setNewDate] = useState(getTodayJakarta())

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now()

      setToast({
        id,
        type,
        message,
      })

      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
      }, 3500)
    },
    [],
  )

  const updateUrl = useCallback(
    (classId: string | null, date?: string | null) => {
      const params = new URLSearchParams()

      if (classId) {
        params.set("classId", classId)
      }

      if (date) {
        params.set("date", date)
      }

      const query = params.toString()

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [pathname, router],
  )

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true)

    try {
      const response = await fetch("/api/tutor/attendance", {
        method: "GET",
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Gagal memuat kelas."))
      }

      const nextClasses = Array.isArray(data.classes)
        ? (data.classes as ClassItem[])
        : []

      setClasses(nextClasses)

      const urlClassId = searchParams.get("classId")

      if (
        urlClassId &&
        nextClasses.some((classItem) => classItem.id === urlClassId)
      ) {
        setSelectedClassId(urlClassId)
      } else {
        setSelectedClassId(null)
        setSelectedClass(null)
      }
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Gagal memuat kelas.",
      )
    } finally {
      setLoadingClasses(false)
    }
  }, [searchParams, showToast])

  const fetchHistory = useCallback(
    async (classId: string) => {
      setLoadingHistory(true)

      try {
        const response = await fetch(
          `/api/tutor/attendance?classId=${encodeURIComponent(
            classId,
          )}&view=history`,
          {
            method: "GET",
            cache: "no-store",
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Gagal memuat riwayat."))
        }

        const classData = data.class as ClassItem | undefined

        if (classData) {
          setSelectedClass(classData)
        }

        setHistory(Array.isArray(data.history) ? data.history : [])
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal memuat riwayat absensi.",
        )
      } finally {
        setLoadingHistory(false)
      }
    },
    [showToast],
  )

  const fetchAttendance = useCallback(
    async (classId: string, date: string, openEditor = true) => {
      if (!classId || !date) return

      setLoadingEditor(true)

      try {
        const response = await fetch(
          `/api/tutor/attendance?classId=${encodeURIComponent(
            classId,
          )}&date=${encodeURIComponent(date)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Gagal memuat data absensi."),
          )
        }

        const classData = data.class as ClassItem | undefined

        if (classData) {
          setSelectedClass(classData)
        }

        const rows: AttendanceRow[] = Array.isArray(data.attendance)
          ? data.attendance.map((row: AttendanceRow) => ({
              enrollment_id: row.enrollment_id,
              student_id: row.student_id,
              student_name: row.student_name,
              grade_level: row.grade_level,
              status: normalizeStatus(row.status),
              notes: row.notes ?? "",
            }))
          : []

        setAttendance(rows)

        setSummary({
          ...EMPTY_SUMMARY,
          ...(data.summary ?? {}),
        })

        setMeta({
          ...EMPTY_META,
          ...(data.attendance_meta ?? {}),
        })

        setSelectedDate(date)
        setDraftDate(date)

        if (openEditor) {
          setViewMode("editor")
        }
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal memuat data absensi.",
        )
      } finally {
        setLoadingEditor(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    void fetchClasses()
  }, [fetchClasses])

  useEffect(() => {
    if (!selectedClassId) return

    const foundClass = classes.find(
      (classItem) => classItem.id === selectedClassId,
    )

    if (foundClass) {
      setSelectedClass(foundClass)
    }

    const urlDate = searchParams.get("date")

    if (urlDate && isValidDate(urlDate)) {
      void fetchAttendance(selectedClassId, urlDate, true)
    } else {
      setViewMode("history")
      setSelectedDate("")
      setDraftDate("")
      setEditingOriginalDate(null)
      void fetchHistory(selectedClassId)
    }
  }, [
    selectedClassId,
    classes,
    searchParams,
    fetchAttendance,
    fetchHistory,
  ])

  const filteredAttendance = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return attendance

    return attendance.filter((row) => {
      return (
        row.student_name.toLowerCase().includes(query) ||
        row.grade_level.toLowerCase().includes(query)
      )
    })
  }, [attendance, search])

  const historyTotal = history.length

  const handleSelectClass = async (classId: string) => {
    const today = getTodayJakarta()

    setSelectedClassId(classId)

    setSelectedClass(
      classes.find((classItem) => classItem.id === classId) ?? null,
    )

    setHistory([])
    setAttendance([])
    setSummary(EMPTY_SUMMARY)
    setMeta(EMPTY_META)
    setSelectedDate("")
    setDraftDate("")
    setEditingOriginalDate(null)
    setViewMode("history")

    updateUrl(classId, null)

    await fetchHistory(classId)

    showToast("info", "Kelas berhasil dipilih.")
    setNewDate(today)
  }

  const handleBackToClasses = () => {
    setSelectedClassId(null)
    setSelectedClass(null)
    setHistory([])
    setAttendance([])
    setSummary(EMPTY_SUMMARY)
    setMeta(EMPTY_META)
    setSelectedDate("")
    setDraftDate("")
    setEditingOriginalDate(null)
    setViewMode("history")
    setSearch("")
    updateUrl(null, null)
  }

  const handleOpenHistory = async (item: HistoryItem) => {
    if (!selectedClassId) return

    setEditingOriginalDate(item.attendance_date)
    updateUrl(selectedClassId, item.attendance_date)

    await fetchAttendance(selectedClassId, item.attendance_date, true)
  }

  const handleOpenNewAttendance = () => {
    const today = getTodayJakarta()

    setNewDate(today)
    setShowNewDateModal(true)
  }

  const handleStartNewAttendance = async () => {
    if (!selectedClassId) return

    if (!isValidDate(newDate)) {
      showToast("error", "Tanggal absensi tidak valid.")
      return
    }

    if (newDate > getTodayJakarta()) {
      showToast("error", "Tanggal absensi tidak boleh melebihi hari ini.")
      return
    }

    setShowNewDateModal(false)
    setEditingOriginalDate(null)
    setSelectedDate(newDate)
    setDraftDate(newDate)
    setAttendance([])

    setSummary({
      ...EMPTY_SUMMARY,
      total_students: selectedClass?.student_count ?? 0,
    })

    setMeta(EMPTY_META)
    setSearch("")
    setViewMode("editor")

    updateUrl(selectedClassId, newDate)

    await fetchAttendance(selectedClassId, newDate, true)
  }

  const handleBackToHistory = async () => {
    if (!selectedClassId) return

    setViewMode("history")
    setEditingOriginalDate(null)
    setSelectedDate("")
    setDraftDate("")
    setAttendance([])
    setSummary(EMPTY_SUMMARY)
    setMeta(EMPTY_META)
    setSearch("")

    updateUrl(selectedClassId, null)

    await fetchHistory(selectedClassId)
  }

  const handleStatusChange = (
    enrollmentId: string,
    status: AttendanceStatus,
  ) => {
    setAttendance((current) =>
      current.map((row) =>
        row.enrollment_id === enrollmentId
          ? {
              ...row,
              status,
            }
          : row,
      ),
    )
  }

  const handleNotesChange = (enrollmentId: string, notes: string) => {
    setAttendance((current) =>
      current.map((row) =>
        row.enrollment_id === enrollmentId
          ? {
              ...row,
              notes,
            }
          : row,
      ),
    )
  }

  const handleDateChange = (value: string) => {
    setDraftDate(value)
  }

  const handleSave = async () => {
    if (!selectedClassId) {
      showToast("error", "Pilih kelas terlebih dahulu.")
      return
    }

    if (!draftDate || !isValidDate(draftDate)) {
      showToast("error", "Tanggal absensi tidak valid.")
      return
    }

    if (draftDate > getTodayJakarta()) {
      showToast("error", "Tanggal absensi tidak boleh melebihi hari ini.")
      return
    }

    if (attendance.length === 0) {
      showToast("error", "Tidak ada siswa yang dapat disimpan.")
      return
    }

    const incomplete = attendance.filter((row) => !row.status)

    if (incomplete.length > 0) {
      showToast(
        "error",
        `Masih ada ${incomplete.length} siswa yang belum diberi status.`,
      )
      return
    }

    const duplicateIds = new Set<string>()
    let hasDuplicate = false

    for (const row of attendance) {
      if (duplicateIds.has(row.enrollment_id)) {
        hasDuplicate = true
        break
      }

      duplicateIds.add(row.enrollment_id)
    }

    if (hasDuplicate) {
      showToast("error", "Terdapat data siswa yang duplikat.")
      return
    }

    const movingDate =
      editingOriginalDate !== null &&
      editingOriginalDate !== draftDate

    setSaving(true)

    try {
      const response = await fetch("/api/tutor/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: selectedClassId,
          attendanceDate: draftDate,
          originalAttendanceDate: editingOriginalDate,
          records: attendance.map((row) => ({
            enrollmentId: row.enrollment_id,
            status: row.status,
            notes: row.notes?.trim() || null,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Gagal menyimpan absensi."),
        )
      }

      setSelectedDate(draftDate)
      setEditingOriginalDate(draftDate)

      setMeta({
        is_saved: true,
        saved_count: data.savedCount ?? attendance.length,
        last_updated_at:
          data.lastUpdatedAt ?? new Date().toISOString(),
      })

      updateUrl(selectedClassId, draftDate)

      await fetchAttendance(selectedClassId, draftDate, true)
      await fetchHistory(selectedClassId)

      showToast(
        "success",
        movingDate
          ? "Absensi berhasil dipindahkan ke tanggal baru."
          : "Absensi berhasil disimpan.",
      )
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Gagal menyimpan absensi.",
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!selectedClassId || !deleteTarget) return

    setDeleting(true)

    try {
      const response = await fetch(
        `/api/tutor/attendance?classId=${encodeURIComponent(
          selectedClassId,
        )}&date=${encodeURIComponent(deleteTarget.attendance_date)}`,
        {
          method: "DELETE",
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Gagal menghapus absensi."),
        )
      }

      const deletedCount =
        typeof data.deletedCount === "number" ? data.deletedCount : 0

      setDeleteTarget(null)

      if (deletedCount === 0) {
        showToast(
          "info",
          "Tidak ada data absensi yang terhapus. Periksa izin DELETE/RLS.",
        )
      } else {
        showToast(
          "success",
          `${deletedCount} data absensi berhasil dihapus.`,
        )
      }

      if (
        viewMode === "editor" &&
        selectedDate === deleteTarget.attendance_date
      ) {
        setViewMode("history")
        setSelectedDate("")
        setDraftDate("")
        setEditingOriginalDate(null)
        setAttendance([])
        setSummary(EMPTY_SUMMARY)
        setMeta(EMPTY_META)
        updateUrl(selectedClassId, null)
      }

      await fetchHistory(selectedClassId)
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Gagal menghapus absensi.",
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleRefresh = async () => {
    if (!selectedClassId) {
      await fetchClasses()
      return
    }

    if (viewMode === "editor" && selectedDate) {
      await Promise.all([
        fetchAttendance(selectedClassId, selectedDate, true),
        fetchHistory(selectedClassId),
      ])
    } else {
      await fetchHistory(selectedClassId)
    }

    showToast("success", "Data berhasil diperbarui.")
  }

  const editorSummary = useMemo(() => {
    const total = attendance.length
    const hadir = attendance.filter((row) => row.status === "HADIR").length
    const izin = attendance.filter((row) => row.status === "IZIN").length
    const sakit = attendance.filter((row) => row.status === "SAKIT").length
    const alpha = attendance.filter((row) => row.status === "ALPHA").length

    return {
      total,
      hadir,
      izin,
      sakit,
      alpha,
      percentage: total > 0 ? Math.round((hadir / total) * 100) : 0,
    }
  }, [attendance])

  if (loadingClasses) {
    return (
      <main className="min-h-screen bg-gray-50 pb-12">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
            <Loader2 className="animate-spin" size={20} />
            Memuat kelas...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {toast ? (
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${
              toast.type === "success"
                ? "border-emerald-200"
                : toast.type === "error"
                  ? "border-red-200"
                  : "border-blue-200"
            }`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                toast.type === "success"
                  ? "bg-emerald-100 text-emerald-600"
                  : toast.type === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-600"
              }`}
            >
              {toast.type === "success" ? (
                <Check size={15} />
              ) : toast.type === "error" ? (
                <X size={15} />
              ) : (
                <ClipboardCheck size={15} />
              )}
            </div>

            <p className="flex-1 text-sm font-medium leading-6 text-gray-700">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-gray-400 transition hover:text-gray-700"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      ) : null}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.16em]"
              style={{ color: CRIMSON }}
            >
              Tutor
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Absensi Kehadiran Siswa
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola kehadiran siswa dan riwayat pertemuan.
            </p>
          </div>

          {selectedClassId ? (
            <button
              type="button"
              onClick={handleBackToClasses}
              className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:flex"
            >
              <ArrowLeft size={17} />
              Ganti Kelas
            </button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {!selectedClassId ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Pilih kelas
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Pilih kelas yang ingin kamu kelola absensinya.
              </p>
            </div>

            {classes.length === 0 ? (
              <EmptyState
                title="Belum ada kelas aktif"
                description="Kelas aktif yang kamu ajar akan muncul di halaman ini."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {classes.map((classItem) => {
                  const start = formatTime(classItem.schedule_start)
                  const end = formatTime(classItem.schedule_end)

                  return (
                    <button
                      key={classItem.id}
                      type="button"
                      onClick={() => void handleSelectClass(classItem.id)}
                      className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white">
                          <ClipboardCheck size={21} />
                        </div>

                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                          AKTIF
                        </span>
                      </div>

                      <h3 className="mt-5 line-clamp-1 text-lg font-bold text-gray-900">
                        {classItem.class_name}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {classItem.subject}
                      </p>

                      <div className="mt-5 space-y-2.5 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          <span>{classItem.student_count} siswa aktif</span>
                        </div>

                        {classItem.schedule_day ? (
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={16}
                              className="text-gray-400"
                            />

                            <span>
                              {classItem.schedule_day}
                              {start ? ` • ${start}` : ""}
                              {end ? `–${end}` : ""}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div
                        className="mt-6 flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-white transition group-hover:opacity-90"
                        style={{ backgroundColor: NAVY }}
                      >
                        <span>Mulai absensi</span>

                        <ChevronDown
                          size={17}
                          className="-rotate-90 transition group-hover:translate-x-0.5"
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 sm:hidden">
              <button
                type="button"
                onClick={handleBackToClasses}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700"
              >
                <ArrowLeft size={17} />
                Ganti kelas
              </button>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600"
                title="Refresh"
              >
                <RefreshCw size={17} />
              </button>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedClass?.class_name ?? "Kelas"}
                    </h2>

                    {selectedClass?.subject ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {selectedClass.subject}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users size={15} />
                      {selectedClass?.student_count ?? 0} siswa
                    </span>

                    {selectedClass?.schedule_day ? (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={15} />
                        {selectedClass.schedule_day}
                      </span>
                    ) : null}

                    {selectedClass?.schedule_start ? (
                      <span className="flex items-center gap-1.5">
                        <Clock3 size={15} />
                        {formatTime(selectedClass.schedule_start)}
                        {selectedClass.schedule_end
                          ? `–${formatTime(selectedClass.schedule_end)}`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    className="hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 sm:flex"
                    title="Refresh"
                  >
                    <RefreshCw
                      size={17}
                      className={
                        loadingHistory || loadingEditor
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenNewAttendance}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: CRIMSON }}
                  >
                    <Plus size={17} />
                    Absensi Baru
                  </button>
                </div>
              </div>
            </section>

            {viewMode === "history" ? (
              <section className="mt-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <History size={20} className="text-gray-700" />

                      <h2 className="text-lg font-bold text-gray-900">
                        Riwayat Pertemuan
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {historyTotal > 0
                        ? `${historyTotal} sesi absensi tersimpan.`
                        : "Belum ada sesi absensi tersimpan."}
                    </p>
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="rounded-2xl border border-gray-200 bg-white py-16">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium text-gray-500">
                      <Loader2 className="animate-spin" size={20} />
                      Memuat riwayat...
                    </div>
                  </div>
                ) : history.length === 0 ? (
                  <EmptyState
                    title="Belum ada riwayat absensi"
                    description="Buat sesi absensi pertama untuk kelas ini. Setelah disimpan, seluruh riwayat pertemuan akan muncul di sini."
                    action={
                      <button
                        type="button"
                        onClick={handleOpenNewAttendance}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                        style={{ backgroundColor: CRIMSON }}
                      >
                        <Plus size={17} />
                        Buat Absensi Pertama
                      </button>
                    }
                  />
                ) : (
                  <>
                    <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
                      <div className="grid grid-cols-[1.6fr_0.8fr_1.5fr_1.1fr_1.1fr] border-b border-gray-200 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        <span>Pertemuan</span>
                        <span>Siswa</span>
                        <span>Rekap</span>
                        <span>Kehadiran</span>
                        <span className="text-right">Aksi</span>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {history.map((item) => (
                          <div
                            key={item.attendance_date}
                            className="grid grid-cols-[1.6fr_0.8fr_1.5fr_1.1fr_1.1fr] items-center px-5 py-4"
                          >
                            <div>
                              <p className="font-bold text-gray-900">
                                {formatDate(item.attendance_date)}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                {item.weekday}
                                {item.last_updated_at
                                  ? ` • Update ${formatDateTime(
                                      item.last_updated_at,
                                    )}`
                                  : ""}
                              </p>
                            </div>

                            <div>
                              <p className="font-bold text-gray-900">
                                {item.total_attendance}/{item.total_students}
                              </p>

                              <p className="text-xs text-gray-500">
                                tercatat
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                                H {item.hadir}
                              </span>

                              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                                I {item.izin}
                              </span>

                              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                                S {item.sakit}
                              </span>

                              <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                                A {item.alpha}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-gray-900">
                                {item.attendance_percentage}%
                              </p>

                              <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        item.attendance_percentage,
                                      ),
                                    )}%`,
                                    backgroundColor: CRIMSON,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleOpenHistory(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    attendance_date: item.attendance_date,
                                    weekday: item.weekday,
                                    total_attendance:
                                      item.total_attendance,
                                  })
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50"
                                title="Hapus sesi"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 md:hidden">
                      {history.map((item) => (
                        <div
                          key={item.attendance_date}
                          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900">
                                {formatShortDate(item.attendance_date)}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                {item.weekday}
                              </p>
                            </div>

                            <div className="rounded-xl bg-gray-100 px-3 py-2 text-center">
                              <p className="text-lg font-bold text-gray-900">
                                {item.attendance_percentage}%
                              </p>

                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                hadir
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <StatCard
                              label="Tercatat"
                              value={`${item.total_attendance}/${item.total_students}`}
                            />

                            <StatCard
                              label="Hadir"
                              value={item.hadir}
                            />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                              Hadir {item.hadir}
                            </span>

                            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                              Izin {item.izin}
                            </span>

                            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                              Sakit {item.sakit}
                            </span>

                            <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                              Alpha {item.alpha}
                            </span>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleOpenHistory(item)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white"
                            >
                              <Pencil size={15} />
                              Edit Absensi
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  attendance_date: item.attendance_date,
                                  weekday: item.weekday,
                                  total_attendance:
                                    item.total_attendance,
                                })
                              }
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 text-red-500"
                              title="Hapus sesi"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : (
              <section className="mt-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void handleBackToHistory()}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
                  >
                    <ArrowLeft size={17} />
                    Kembali ke riwayat
                  </button>

                  {meta.is_saved ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Tersimpan
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      Draft baru
                    </span>
                  )}
                </div>

                {loadingEditor ? (
                  <div className="rounded-2xl border border-gray-200 bg-white py-16">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium text-gray-500">
                      <Loader2 className="animate-spin" size={20} />
                      Memuat data siswa...
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-[0.14em]"
                            style={{ color: CRIMSON }}
                          >
                            {meta.is_saved
                              ? "Edit Sesi Absensi"
                              : "Absensi Baru"}
                          </p>

                          <h2 className="mt-1 text-xl font-bold text-gray-900">
                            {meta.is_saved && selectedDate
                              ? formatDate(selectedDate)
                              : "Atur tanggal pertemuan"}
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            {meta.is_saved
                              ? "Ubah tanggal, status kehadiran, atau catatan lalu simpan perubahan."
                              : "Tentukan tanggal pertemuan sebelum mengisi kehadiran siswa."}
                          </p>
                        </div>

                        <div className="w-full lg:max-w-xs">
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Tanggal Pertemuan
                          </label>

                          <div className="relative">
                            <CalendarDays
                              size={17}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                              type="date"
                              value={draftDate}
                              max={getTodayJakarta()}
                              onChange={(event) =>
                                handleDateChange(event.target.value)
                              }
                              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          {editingOriginalDate &&
                          draftDate &&
                          editingOriginalDate !== draftDate ? (
                            <p className="mt-2 text-xs leading-5 text-amber-600">
                              Data sesi{" "}
                              <strong>
                                {formatShortDate(editingOriginalDate)}
                              </strong>{" "}
                              akan dipindahkan ke{" "}
                              <strong>{formatShortDate(draftDate)}</strong>.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <StatCard
                          label="Siswa"
                          value={editorSummary.total}
                        />

                        <StatCard
                          label="Hadir"
                          value={editorSummary.hadir}
                        />

                        <StatCard
                          label="Izin"
                          value={editorSummary.izin}
                        />

                        <StatCard
                          label="Sakit"
                          value={editorSummary.sakit}
                        />

                        <StatCard
                          label="Alpha"
                          value={editorSummary.alpha}
                        />
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-gray-700">
                            Persentase hadir
                          </span>

                          <span className="font-bold text-gray-900">
                            {editorSummary.percentage}%
                          </span>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:max-w-xs">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${editorSummary.percentage}%`,
                              backgroundColor: CRIMSON,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            Daftar Siswa
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            Isi status setiap siswa sebelum menyimpan.
                          </p>
                        </div>

                        <div className="relative w-full sm:w-64">
                          <Search
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                              setSearch(event.target.value)
                            }
                            placeholder="Cari siswa..."
                            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-gray-900 focus:bg-white"
                          />
                        </div>
                      </div>

                      {attendance.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-gray-500">
                          Tidak ada siswa aktif di kelas ini.
                        </div>
                      ) : (
                        <>
                          <div className="hidden md:block">
                            <div className="grid grid-cols-[minmax(220px,1.4fr)_auto_minmax(180px,0.8fr)] items-center gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              <span>Siswa</span>
                              <span>Status</span>
                              <span>Catatan</span>
                            </div>

                            <div className="divide-y divide-gray-100">
                              {filteredAttendance.map((row) => (
                                <div
                                  key={row.enrollment_id}
                                  className="grid grid-cols-[minmax(220px,1.4fr)_auto_minmax(180px,0.8fr)] items-center gap-4 px-5 py-4"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                      {row.student_name}
                                    </p>

                                    <p className="mt-0.5 text-xs text-gray-500">
                                      {row.grade_level}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5">
                                    {STATUS_OPTIONS.map((status) => (
                                      <StatusButton
                                        key={status.value}
                                        status={status}
                                        selected={
                                          row.status === status.value
                                        }
                                        onClick={() =>
                                          handleStatusChange(
                                            row.enrollment_id,
                                            status.value,
                                          )
                                        }
                                      />
                                    ))}
                                  </div>

                                  <input
                                    type="text"
                                    value={row.notes ?? ""}
                                    onChange={(event) =>
                                      handleNotesChange(
                                        row.enrollment_id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Opsional..."
                                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs text-gray-700 outline-none transition focus:border-gray-900"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="divide-y divide-gray-100 md:hidden">
                            {filteredAttendance.map((row) => (
                              <div
                                key={row.enrollment_id}
                                className="p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                      {row.student_name}
                                    </p>

                                    <p className="mt-0.5 text-xs text-gray-500">
                                      {row.grade_level}
                                    </p>
                                  </div>

                                  {row.status ? (
                                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                                      {row.status}
                                    </span>
                                  ) : (
                                    <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
                                      Belum diisi
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-4 gap-1.5">
                                  {STATUS_OPTIONS.map((status) => (
                                    <StatusButton
                                      key={status.value}
                                      status={status}
                                      selected={
                                        row.status === status.value
                                      }
                                      onClick={() =>
                                        handleStatusChange(
                                          row.enrollment_id,
                                          status.value,
                                        )
                                      }
                                    />
                                  ))}
                                </div>

                                <input
                                  type="text"
                                  value={row.notes ?? ""}
                                  onChange={(event) =>
                                    handleNotesChange(
                                      row.enrollment_id,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Catatan opsional..."
                                  className="mt-2 h-10 w-full rounded-lg border border-gray-200 px-3 text-xs text-gray-700 outline-none transition focus:border-gray-900"
                                />
                              </div>
                            ))}
                          </div>

                          {filteredAttendance.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-gray-500">
                              Siswa yang dicari tidak ditemukan.
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div className="sticky bottom-3 z-20 mt-4 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="hidden text-xs text-gray-500 sm:block">
                          {meta.last_updated_at
                            ? `Terakhir disimpan ${formatDateTime(
                                meta.last_updated_at,
                              )}`
                            : "Belum disimpan"}
                        </div>

                        <div className="flex w-full gap-2 sm:w-auto">
                          <button
                            type="button"
                            onClick={() => void handleBackToHistory()}
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:flex-none"
                          >
                            Batal
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={saving || attendance.length === 0}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                            style={{ backgroundColor: NAVY }}
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
                                <Check size={17} />
                                Simpan Perubahan
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {showNewDateModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: CRIMSON }}
                >
                  Absensi Baru
                </p>

                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  Pilih tanggal pertemuan
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Pilih tanggal terlebih dahulu. Data siswa akan dimuat setelah
                  kamu melanjutkan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewDateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tanggal
              </label>

              <input
                type="date"
                value={newDate}
                max={getTodayJakarta()}
                onChange={(event) => setNewDate(event.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />

              <p className="mt-2 text-xs text-gray-400">
                Tanggal masa depan tidak dapat digunakan untuk absensi.
              </p>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewDateModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => void handleStartNewAttendance()}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: CRIMSON }}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Hapus sesi absensi?
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Semua data absensi untuk{" "}
              <strong className="text-gray-700">
                {deleteTarget.weekday},{" "}
                {formatDate(deleteTarget.attendance_date)}
              </strong>{" "}
              akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              <strong>{deleteTarget.total_attendance}</strong> data absensi
              akan dihapus.
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteConfirmed()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default function TutorAttendancePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
              <Loader2 className="animate-spin" size={20} />
              Memuat halaman absensi...
            </div>
          </div>
        </main>
      }
    >
      <TutorAttendanceContent />
    </Suspense>
  )
}