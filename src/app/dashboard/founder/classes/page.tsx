"use client"

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react"

type ClassStatus = "ACTIVE" | "INACTIVE"

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
  created_at?: string
  updated_at?: string
  tutor?: Tutor | null
  tutors?: {
    full_name: string
  } | null
  student_count?: number
  module_count?: number
}

type ClassStudent = {
  enrollment_id: string
  student_id: string
  student_name: string
  grade_level: string
  school_name: string | null
  phone_number: string | null
  status: "ACTIVE" | "INACTIVE"
  enrolled_at: string
  ended_at: string | null
  parent: {
    id: string
    full_name: string
    phone_number: string | null
  } | null
}

type LearningModule = {
  id: string
  class_id: string
  tutor_id: string
  title: string
  description: string | null
  file_url: string | null
  created_at: string
  updated_at: string
  tutor: {
    id: string
    full_name: string
  } | null
}

type AvailableStudent = {
  id: string
  parent_id: string
  student_name: string
  grade_level: string
  school_name: string | null
  phone_number: string | null
  status: "ACTIVE" | "INACTIVE"
}

type ToastType = "success" | "error"

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

type ManageTab = "overview" | "students" | "modules"

const DAY_LABELS: Record<string, string> = {
  SENIN: "Senin",
  SELASA: "Selasa",
  RABU: "Rabu",
  KAMIS: "Kamis",
  JUMAT: "Jumat",
  SABTU: "Sabtu",
  MINGGU: "Minggu",
}

const DAYS = Object.keys(DAY_LABELS)

const EMPTY_FORM: FormData = {
  className: "",
  subject: "",
  description: "",
  tutorId: "",
  scheduleDay: "SENIN",
  scheduleStart: "13:00",
  scheduleEnd: "14:30",
  status: "ACTIVE",
}

function hasControlChars(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value)
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value
    .split(":")
    .map(Number)

  return hours * 60 + minutes
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(new Date(value))
  } catch {
    return value
  }
}

function getApiError(
  payload: unknown,
  fallback: string
) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload
  ) {
    const error = (payload as {
      error?: unknown
    }).error

    if (typeof error === "string") {
      return error
    }
  }

  return fallback
}

function getConflictMessage(payload: any) {
  if (
    payload?.conflict &&
    typeof payload.conflict === "object"
  ) {
    const conflict = payload.conflict

    if (
      conflict.class_name &&
      conflict.day &&
      conflict.start &&
      conflict.end
    ) {
      return `${payload.error ?? "Jadwal bentrok."} ${conflict.class_name} — ${DAY_LABELS[conflict.day] ?? conflict.day}, ${conflict.start}–${conflict.end}.`
    }
  }

  return payload?.error ?? "Jadwal bentrok."
}

export default function FounderClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [modalOpen, setModalOpen] =
    useState(false)

  const [deleteModalOpen, setDeleteModalOpen] =
    useState(false)

  const [editingClass, setEditingClass] =
    useState<ClassItem | null>(null)

  const [deleteTarget, setDeleteTarget] =
    useState<ClassItem | null>(null)

  const [form, setForm] =
    useState<FormData>(EMPTY_FORM)

  const [searchQuery, setSearchQuery] =
    useState("")

  const [statusFilter, setStatusFilter] =
    useState<
      "ALL" | "ACTIVE" | "INACTIVE"
    >("ALL")

  const [toast, setToast] =
    useState<Toast | null>(null)

  const [manageClass, setManageClass] =
    useState<ClassItem | null>(null)

  const [manageTab, setManageTab] =
    useState<ManageTab>("overview")

  const [students, setStudents] =
    useState<ClassStudent[]>([])

  const [modules, setModules] =
    useState<LearningModule[]>([])

  const [availableStudents, setAvailableStudents] =
    useState<AvailableStudent[]>([])

  const [loadingStudents, setLoadingStudents] =
    useState(false)

  const [loadingModules, setLoadingModules] =
    useState(false)

  const [addingStudent, setAddingStudent] =
    useState<string | null>(null)

  const [removingStudent, setRemovingStudent] =
    useState<string | null>(null)

  const [deletingModule, setDeletingModule] =
    useState<string | null>(null)

  const [studentSearch, setStudentSearch] =
    useState("")

  const [studentPickerOpen, setStudentPickerOpen] =
    useState(false)

  const [confirmRemoveStudent, setConfirmRemoveStudent] =
    useState<ClassStudent | null>(null)

  const [confirmDeleteModule, setConfirmDeleteModule] =
    useState<LearningModule | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast(null)
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [toast])

  async function loadData() {
    try {
      setLoading(true)

      const [
        classesResponse,
        tutorsResponse,
      ] = await Promise.all([
        fetch(
          "/api/founder/classes",
          {
            method: "GET",
            cache: "no-store",
          }
        ),
        fetch(
          "/api/founder/classes?tutors=true",
          {
            method: "GET",
            cache: "no-store",
          }
        ),
      ])

      const classesPayload =
        await classesResponse.json()

      const tutorsPayload =
        await tutorsResponse.json()

      if (!classesResponse.ok) {
        throw new Error(
          getApiError(
            classesPayload,
            "Gagal mengambil data kelas."
          )
        )
      }

      if (!tutorsResponse.ok) {
        throw new Error(
          getApiError(
            tutorsPayload,
            "Gagal mengambil data tutor."
          )
        )
      }

      setClasses(
        Array.isArray(classesPayload?.classes)
          ? classesPayload.classes
          : []
      )

      setTutors(
        Array.isArray(tutorsPayload?.tutors)
          ? tutorsPayload.tutors
          : []
      )
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal memuat data.",
      })
    } finally {
      setLoading(false)
    }
  }

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
      description:
        item.description ?? "",
      tutorId: item.tutor_id,
      scheduleDay: item.schedule_day,
      scheduleStart:
        item.schedule_start?.slice(0, 5) ??
        "13:00",
      scheduleEnd:
        item.schedule_end?.slice(0, 5) ??
        "14:30",
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

  function openDeleteModal(item: ClassItem) {
    setDeleteTarget(item)
    setDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    if (deletingId) return

    setDeleteTarget(null)
    setDeleteModalOpen(false)
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const className =
      form.className.trim()

    const subject =
      form.subject.trim()

    const description =
      form.description.trim()

    if (
      className.length < 2 ||
      className.length > 100
    ) {
      setToast({
        type: "error",
        message:
          "Nama kelas harus 2–100 karakter.",
      })
      return
    }

    if (hasControlChars(className)) {
      setToast({
        type: "error",
        message:
          "Nama kelas mengandung karakter yang tidak valid.",
      })
      return
    }

    if (
      subject.length < 2 ||
      subject.length > 100
    ) {
      setToast({
        type: "error",
        message:
          "Mata pelajaran harus 2–100 karakter.",
      })
      return
    }

    if (hasControlChars(subject)) {
      setToast({
        type: "error",
        message:
          "Mata pelajaran mengandung karakter yang tidak valid.",
      })
      return
    }

    if (
      description.length > 500
    ) {
      setToast({
        type: "error",
        message:
          "Deskripsi maksimal 500 karakter.",
      })
      return
    }

    if (hasControlChars(description)) {
      setToast({
        type: "error",
        message:
          "Deskripsi mengandung karakter yang tidak valid.",
      })
      return
    }

    if (!form.tutorId) {
      setToast({
        type: "error",
        message: "Tutor wajib dipilih.",
      })
      return
    }

    if (!DAYS.includes(form.scheduleDay)) {
      setToast({
        type: "error",
        message: "Hari jadwal tidak valid.",
      })
      return
    }

    if (
      !isValidTime(form.scheduleStart) ||
      !isValidTime(form.scheduleEnd)
    ) {
      setToast({
        type: "error",
        message:
          "Format waktu harus HH:mm.",
      })
      return
    }

    if (
      timeToMinutes(form.scheduleEnd) <=
      timeToMinutes(form.scheduleStart)
    ) {
      setToast({
        type: "error",
        message:
          "Waktu selesai harus lebih besar dari waktu mulai.",
      })
      return
    }

    try {
      setSaving(true)

      const url = editingClass
        ? `/api/founder/classes/${editingClass.id}`
        : "/api/founder/classes"

      const method = editingClass
        ? "PATCH"
        : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className,
          subject,
          description:
            description || null,
          tutorId: form.tutorId,
          scheduleDay:
            form.scheduleDay,
          scheduleStart:
            form.scheduleStart,
          scheduleEnd:
            form.scheduleEnd,
          status: form.status,
        }),
      })

      const payload =
        await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            getConflictMessage(payload)
          )
        }

        throw new Error(
          getApiError(
            payload,
            editingClass
              ? "Gagal memperbarui kelas."
              : "Gagal membuat kelas."
          )
        )
      }

      setToast({
        type: "success",
        message:
          payload?.message ??
          (editingClass
            ? "Kelas berhasil diperbarui."
            : "Kelas berhasil dibuat."),
      })

      closeModal()

      await loadData()
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    try {
      setDeletingId(
        deleteTarget.id
      )

      const response = await fetch(
        `/api/founder/classes/${deleteTarget.id}`,
        {
          method: "DELETE",
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Gagal menghapus kelas."
          )
        )
      }

      setToast({
        type: "success",
        message:
          payload?.message ??
          "Kelas berhasil dihapus.",
      })

      closeDeleteModal()

      if (
        manageClass?.id ===
        deleteTarget.id
      ) {
        setManageClass(null)
      }

      await loadData()
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menghapus kelas.",
      })
    } finally {
      setDeletingId(null)
    }
  }

  async function openManage(
    item: ClassItem,
    tab: ManageTab = "overview"
  ) {
    setManageClass(item)
    setManageTab(tab)
    setStudentPickerOpen(false)

    if (tab === "students") {
      await loadStudents(item.id)
    }

    if (tab === "modules") {
      await loadModules(item.id)
    }
  }

  async function changeManageTab(
    tab: ManageTab
  ) {
    if (!manageClass) return

    setManageTab(tab)

    if (tab === "students") {
      await loadStudents(
        manageClass.id
      )
    }

    if (tab === "modules") {
      await loadModules(
        manageClass.id
      )
    }
  }

  async function loadStudents(
    classId: string
  ) {
    try {
      setLoadingStudents(true)

      const response = await fetch(
        `/api/founder/classes/${classId}/students`,
        {
          cache: "no-store",
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Gagal mengambil data murid."
          )
        )
      }

      setStudents(
        Array.isArray(payload?.students)
          ? payload.students
          : []
      )
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data murid.",
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  async function loadAvailableStudents() {
    try {
      const response = await fetch(
        "/api/founder/students",
        {
          cache: "no-store",
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Gagal mengambil daftar murid."
          )
        )
      }

      const list = Array.isArray(
        payload?.students
      )
        ? payload.students
        : Array.isArray(payload)
          ? payload
          : []

      setAvailableStudents(list)
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil daftar murid.",
      })
    }
  }

  async function openStudentPicker() {
    setStudentPickerOpen(true)
    setStudentSearch("")

    await loadAvailableStudents()
  }

  async function addStudent(
    studentId: string
  ) {
    if (!manageClass) return

    try {
      setAddingStudent(studentId)

      const response = await fetch(
        `/api/founder/classes/${manageClass.id}/students`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            student_id: studentId,
          }),
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            getConflictMessage(payload)
          )
        }

        throw new Error(
          getApiError(
            payload,
            "Gagal menambahkan murid."
          )
        )
      }

      setToast({
        type: "success",
        message:
          payload?.message ??
          "Murid berhasil ditambahkan.",
      })

      await loadStudents(
        manageClass.id
      )

      setClasses((current) =>
        current.map((item) =>
          item.id === manageClass.id
            ? {
                ...item,
                student_count:
                  (item.student_count ??
                    0) + 1,
              }
            : item
        )
      )
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan murid.",
      })
    } finally {
      setAddingStudent(null)
    }
  }

  async function removeStudent() {
    if (
      !manageClass ||
      !confirmRemoveStudent
    ) {
      return
    }

    try {
      setRemovingStudent(
        confirmRemoveStudent.student_id
      )

      const response = await fetch(
        `/api/founder/classes/${manageClass.id}/students?enrollment_id=${confirmRemoveStudent.enrollment_id}`,
        {
          method: "DELETE",
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Gagal mengeluarkan murid."
          )
        )
      }

      setToast({
        type: "success",
        message:
          payload?.message ??
          "Murid berhasil dikeluarkan dari kelas.",
      })

      setConfirmRemoveStudent(null)

      await loadStudents(
        manageClass.id
      )

      setClasses((current) =>
        current.map((item) =>
          item.id === manageClass.id
            ? {
                ...item,
                student_count: Math.max(
                  0,
                  (item.student_count ??
                    0) - 1
                ),
              }
            : item
        )
      )
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengeluarkan murid.",
      })
    } finally {
      setRemovingStudent(null)
    }
  }

  async function loadModules(
    classId: string
  ) {
    try {
      setLoadingModules(true)

      const response = await fetch(
        `/api/founder/classes/${classId}/modules`,
        {
          cache: "no-store",
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Gagal mengambil data modul."
          )
        )
      }

      setModules(
        Array.isArray(payload?.modules)
          ? payload.modules
          : []
      )
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data modul.",
      })
    } finally {
      setLoadingModules(false)
    }
  }

  async function deleteModule() {
    if (
      !manageClass ||
      !confirmDeleteModule
    ) {
      return
    }

    try {
      setDeletingModule(
        confirmDeleteModule.id
      )

      const response = await fetch(
        `/api/founder/classes/${manageClass.id}/modules/${confirmDeleteModule.id}`,
        {
          method: "DELETE",
        }
      )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Gagal menghapus modul."
          )
        )
      }

      setToast({
        type: "success",
        message:
          payload?.message ??
          "Modul berhasil dihapus.",
      })

      setConfirmDeleteModule(null)

      await loadModules(
        manageClass.id
      )

      setClasses((current) =>
        current.map((item) =>
          item.id === manageClass.id
            ? {
                ...item,
                module_count: Math.max(
                  0,
                  (item.module_count ??
                    0) - 1
                ),
              }
            : item
        )
      )
    } catch (error) {
      console.error(error)

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menghapus modul.",
      })
    } finally {
      setDeletingModule(null)
    }
  }

  const filteredClasses = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase()

    return classes.filter((item) => {
      const matchesSearch =
        !query ||
        item.class_name
          .toLowerCase()
          .includes(query) ||
        item.subject
          .toLowerCase()
          .includes(query) ||
        (
          item.tutor?.full_name ??
          item.tutors?.full_name ??
          ""
        )
          .toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter

      return (
        matchesSearch &&
        matchesStatus
      )
    })
  }, [
    classes,
    searchQuery,
    statusFilter,
  ])

  const totalClasses =
    classes.length

  const activeClasses =
    classes.filter(
      (item) =>
        item.status === "ACTIVE"
    ).length

  const inactiveClasses =
    classes.filter(
      (item) =>
        item.status === "INACTIVE"
    ).length

  const tutorCount =
    new Set(
      classes.map(
        (item) => item.tutor_id
      )
    ).size

  const filteredAvailableStudents =
    availableStudents.filter(
      (student) => {
        const alreadyEnrolled =
          students.some(
            (item) =>
              item.student_id ===
              student.id
          )

        if (alreadyEnrolled) {
          return false
        }

        if (
          student.status !==
          "ACTIVE"
        ) {
          return false
        }

        const query =
          studentSearch
            .trim()
            .toLowerCase()

        if (!query) return true

        return (
          student.student_name
            .toLowerCase()
            .includes(query) ||
          student.grade_level
            .toLowerCase()
            .includes(query) ||
          (
            student.school_name ??
            ""
          )
            .toLowerCase()
            .includes(query)
        )
      }
    )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Kelas
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Manajemen Kelas
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Kelola kelas, jadwal, tutor,
                murid, dan modul pembelajaran
                dalam satu tempat.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <BookOpen className="h-5 w-5" />
            }
            label="Total Kelas"
            value={totalClasses}
          />

          <SummaryCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Kelas Aktif"
            value={activeClasses}
          />

          <SummaryCard
            icon={
              <Clock3 className="h-5 w-5" />
            }
            label="Tidak Aktif"
            value={inactiveClasses}
          />

          <SummaryCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Tutor Terlibat"
            value={tutorCount}
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Cari kelas, mata pelajaran, atau tutor..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "ALL"
                    | "ACTIVE"
                    | "INACTIVE"
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
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
        </section>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat data kelas...
            </div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BookOpen className="h-7 w-7" />
            </div>

            <h3 className="font-semibold text-slate-900">
              Tidak ada kelas
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Belum ada kelas yang sesuai
              dengan pencarian atau filter
              yang dipilih.
            </p>

            {!searchQuery &&
              statusFilter === "ALL" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Kelas
                </button>
              )}
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClasses.map(
              (item) => {
                const tutorName =
                  item.tutor?.full_name ??
                  item.tutors?.full_name ??
                  "Tutor belum tersedia"

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="border-b border-slate-100 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {item.class_name}
                          </h3>

                          <p className="mt-1 text-sm font-medium text-red-600">
                            {item.subject}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            item.status
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      <InfoRow
                        icon={
                          <UserRound className="h-4 w-4" />
                        }
                        label="Tutor"
                        value={
                          tutorName
                        }
                      />

                      <InfoRow
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Jadwal"
                        value={`${DAY_LABELS[item.schedule_day] ?? item.schedule_day} · ${item.schedule_start ?? "--:--"}–${item.schedule_end ?? "--:--"}`}
                      />

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <StatMini
                          icon={
                            <Users className="h-4 w-4" />
                          }
                          label="Murid"
                          value={
                            item.student_count ??
                            0
                          }
                        />

                        <StatMini
                          icon={
                            <BookOpen className="h-4 w-4" />
                          }
                          label="Modul"
                          value={
                            item.module_count ??
                            0
                          }
                        />
                      </div>

                      {item.description && (
                        <p className="line-clamp-3 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-4">
                      <button
                        type="button"
                        onClick={() =>
                          openManage(
                            item
                          )
                        }
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <SettingsIcon />
                        Kelola
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            item
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openDeleteModal(
                            item
                          )
                        }
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2.5 text-red-600 hover:bg-red-50"
                        aria-label="Hapus kelas"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                )
              }
            )}
          </section>
        )}
      </main>

      {toast && (
        <ToastView
          toast={toast}
          onClose={() =>
            setToast(null)
          }
        />
      )}

      {modalOpen && (
        <ModalShell
          title={
            editingClass
              ? "Edit Kelas"
              : "Tambah Kelas"
          }
          onClose={closeModal}
          disabled={saving}
        >
          <form
            onSubmit={handleSave}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nama Kelas"
                required
              >
                <input
                  value={
                    form.className
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      className:
                        event.target
                          .value,
                    }))
                  }
                  maxLength={100}
                  placeholder="Contoh: Matematika SD 5"
                  className={inputClass}
                  disabled={saving}
                />
              </Field>

              <Field
                label="Mata Pelajaran"
                required
              >
                <input
                  value={
                    form.subject
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subject:
                        event.target
                          .value,
                    }))
                  }
                  maxLength={100}
                  placeholder="Contoh: Matematika"
                  className={inputClass}
                  disabled={saving}
                />
              </Field>
            </div>

            <Field
              label="Tutor"
              required
            >
              <select
                value={
                  form.tutorId
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tutorId:
                      event.target
                        .value,
                  }))
                }
                className={inputClass}
                disabled={saving}
              >
                <option value="">
                  Pilih tutor
                </option>

                {tutors.map(
                  (tutor) => (
                    <option
                      key={
                        tutor.id
                      }
                      value={
                        tutor.id
                      }
                    >
                      {
                        tutor.full_name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Hari"
                required
              >
                <select
                  value={
                    form.scheduleDay
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        scheduleDay:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className={
                    inputClass
                  }
                  disabled={
                    saving
                  }
                >
                  {DAYS.map(
                    (day) => (
                      <option
                        key={
                          day
                        }
                        value={
                          day
                        }
                      >
                        {
                          DAY_LABELS[
                            day
                          ]
                        }
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Mulai"
                required
              >
                <input
                  type="time"
                  value={
                    form.scheduleStart
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        scheduleStart:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className={
                    inputClass
                  }
                  disabled={
                    saving
                  }
                />
              </Field>

              <Field
                label="Selesai"
                required
              >
                <input
                  type="time"
                  value={
                    form.scheduleEnd
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        scheduleEnd:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className={
                    inputClass
                  }
                  disabled={
                    saving
                  }
                />
              </Field>
            </div>

            <Field
              label="Status"
              required
            >
              <select
                value={
                  form.status
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status:
                      event.target
                        .value as ClassStatus,
                  }))
                }
                className={inputClass}
                disabled={saving}
              >
                <option value="ACTIVE">
                  Aktif
                </option>

                <option value="INACTIVE">
                  Tidak Aktif
                </option>
              </select>
            </Field>

            <Field label="Deskripsi">
              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target
                        .value,
                  }))
                }
                maxLength={500}
                rows={4}
                placeholder="Deskripsi singkat kelas..."
                className={`${inputClass} resize-none`}
                disabled={saving}
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  form.description
                    .length
                }
                /500
              </p>
            </Field>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {editingClass
                  ? "Simpan Perubahan"
                  : "Tambah Kelas"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {deleteModalOpen &&
        deleteTarget && (
          <ConfirmModal
            title="Hapus Kelas?"
            description={
              <>
                Kelas{" "}
                <strong>
                  {
                    deleteTarget.class_name
                  }
                </strong>{" "}
                akan dihapus. Jika masih
                memiliki data terkait,
                database akan menolak
                penghapusan.
              </>
            }
            confirmText="Ya, Hapus"
            loading={
              deletingId ===
              deleteTarget.id
            }
            danger
            onCancel={
              closeDeleteModal
            }
            onConfirm={
              handleDelete
            }
          />
        )}

      {manageClass && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-4 max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                    Kelola Kelas
                  </p>

                  <h2 className="mt-1 truncate text-xl font-bold text-slate-900">
                    {
                      manageClass.class_name
                    }
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      manageClass.subject
                    }{" "}
                    ·{" "}
                    {
                      DAY_LABELS[
                        manageClass
                          .schedule_day
                      ] ??
                        manageClass.schedule_day
                    }{" "}
                    ·{" "}
                    {
                      manageClass
                        .schedule_start
                    }
                    –
                    {
                      manageClass
                        .schedule_end
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setManageClass(
                      null
                    )
                  }
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex overflow-x-auto px-5">
                <TabButton
                  active={
                    manageTab ===
                    "overview"
                  }
                  onClick={() =>
                    changeManageTab(
                      "overview"
                    )
                  }
                >
                  Overview
                </TabButton>

                <TabButton
                  active={
                    manageTab ===
                    "students"
                  }
                  onClick={() =>
                    changeManageTab(
                      "students"
                    )
                  }
                >
                  <Users className="h-4 w-4" />
                  Murid
                </TabButton>

                <TabButton
                  active={
                    manageTab ===
                    "modules"
                  }
                  onClick={() =>
                    changeManageTab(
                      "modules"
                    )
                  }
                >
                  <BookOpen className="h-4 w-4" />
                  Modul
                </TabButton>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {manageTab ===
                "overview" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailCard
                      icon={
                        <UserRound className="h-5 w-5" />
                      }
                      label="Tutor"
                      value={
                        manageClass
                          .tutor
                          ?.full_name ??
                        manageClass
                          .tutors
                          ?.full_name ??
                        "—"
                      }
                    />

                    <DetailCard
                      icon={
                        <CalendarDays className="h-5 w-5" />
                      }
                      label="Hari"
                      value={
                        DAY_LABELS[
                          manageClass
                            .schedule_day
                        ] ??
                        manageClass.schedule_day
                      }
                    />

                    <DetailCard
                      icon={
                        <Clock3 className="h-5 w-5" />
                      }
                      label="Waktu"
                      value={`${manageClass.schedule_start}–${manageClass.schedule_end}`}
                    />

                    <DetailCard
                      icon={
                        <CheckCircle2 className="h-5 w-5" />
                      }
                      label="Status"
                      value={
                        manageClass.status ===
                        "ACTIVE"
                          ? "Aktif"
                          : "Tidak Aktif"
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        changeManageTab(
                          "students"
                        )
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-red-200 hover:bg-red-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-white p-2.5 text-red-600 shadow-sm">
                          <Users className="h-5 w-5" />
                        </div>

                        <span className="text-2xl font-bold text-slate-900">
                          {
                            manageClass.student_count ??
                            0
                          }
                        </span>
                      </div>

                      <h3 className="mt-4 font-bold text-slate-900">
                        Murid
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Kelola murid yang
                        mengikuti kelas ini.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeManageTab(
                          "modules"
                        )
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-red-200 hover:bg-red-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-white p-2.5 text-red-600 shadow-sm">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <span className="text-2xl font-bold text-slate-900">
                          {
                            manageClass.module_count ??
                            0
                          }
                        </span>
                      </div>

                      <h3 className="mt-4 font-bold text-slate-900">
                        Modul Pembelajaran
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Lihat dan kelola modul
                        yang dibuat tutor.
                      </p>
                    </button>
                  </div>

                  {manageClass.description && (
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <h3 className="font-bold text-slate-900">
                        Deskripsi
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {
                          manageClass.description
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {manageTab ===
                "students" && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Murid Kelas
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {
                          students.length
                        }{" "}
                        murid aktif terdaftar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        openStudentPicker
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah Murid
                    </button>
                  </div>

                  {studentPickerOpen && (
                    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-slate-900">
                            Pilih Murid
                          </h4>

                          <p className="text-xs text-slate-500">
                            Sistem otomatis
                            memeriksa konflik
                            jadwal.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setStudentPickerOpen(
                              false
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={
                            studentSearch
                          }
                          onChange={(
                            event
                          ) =>
                            setStudentSearch(
                              event.target
                                .value
                            )
                          }
                          placeholder="Cari nama, kelas, atau sekolah..."
                          className={inputClass}
                        />
                      </div>

                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                        {filteredAvailableStudents.length ===
                        0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                            Tidak ada murid
                            yang tersedia.
                          </div>
                        ) : (
                          filteredAvailableStudents.map(
                            (
                              student
                            ) => (
                              <div
                                key={
                                  student.id
                                }
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {
                                      student.student_name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {
                                      student.grade_level
                                    }
                                    {" · "}
                                    {
                                      student.school_name ??
                                      "Sekolah belum diisi"
                                    }
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    addingStudent ===
                                    student.id
                                  }
                                  onClick={() =>
                                    addStudent(
                                      student.id
                                    )
                                  }
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  {addingStudent ===
                                  student.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                  )}

                                  Tambah
                                </button>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {loadingStudents ? (
                    <LoadingBox text="Memuat murid..." />
                  ) : students.length ===
                    0 ? (
                    <EmptyBox
                      icon={
                        <Users className="h-7 w-7" />
                      }
                      title="Belum ada murid"
                      description="Tambahkan murid ke kelas ini untuk mulai mengelola peserta."
                    />
                  ) : (
                    <div className="grid gap-3">
                      {students.map(
                        (student) => (
                          <div
                            key={
                              student.enrollment_id
                            }
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                  <GraduationCap className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <h4 className="truncate font-bold text-slate-900">
                                    {
                                      student.student_name
                                    }
                                  </h4>

                                  <p className="mt-0.5 text-sm text-slate-500">
                                    {
                                      student.grade_level
                                    }

                                    {student.school_name &&
                                      ` · ${student.school_name}`}
                                  </p>

                                  {student.parent && (
                                    <p className="mt-1 text-xs text-slate-400">
                                      Orang tua:{" "}
                                      {
                                        student
                                          .parent
                                          .full_name
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                                  Aktif
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmRemoveStudent(
                                      student
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Keluarkan
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {manageTab ===
                "modules" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Modul Pembelajaran
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Modul dibuat oleh tutor
                      kelas dan dapat dilihat
                      oleh Founder.
                    </p>
                  </div>

                  {loadingModules ? (
                    <LoadingBox text="Memuat modul..." />
                  ) : modules.length ===
                    0 ? (
                    <EmptyBox
                      icon={
                        <BookOpen className="h-7 w-7" />
                      }
                      title="Belum ada modul"
                      description="Tutor belum membuat modul pembelajaran untuk kelas ini."
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {modules.map(
                        (module) => (
                          <article
                            key={
                              module.id
                            }
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 gap-3">
                                <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
                                  <BookOpen className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-900">
                                    {
                                      module.title
                                    }
                                  </h4>

                                  {module.description && (
                                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-500">
                                      {
                                        module.description
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteModule(
                                    module
                                  )
                                }
                                className="shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50"
                                aria-label="Hapus modul"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <div>
                                <p className="text-xs text-slate-400">
                                  Tutor
                                </p>

                                <p className="text-sm font-medium text-slate-700">
                                  {
                                    module
                                      .tutor
                                      ?.full_name ??
                                    "—"
                                  }
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-slate-400">
                                  Dibuat
                                </p>

                                <p className="text-sm font-medium text-slate-700">
                                  {formatDate(
                                    module.created_at
                                  )}
                                </p>
                              </div>
                            </div>

                            {module.file_url && (
                              <a
                                href={
                                  module.file_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Buka Modul
                              </a>
                            )}
                          </article>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmRemoveStudent && (
        <ConfirmModal
          title="Keluarkan Murid?"
          description={
            <>
              <strong>
                {
                  confirmRemoveStudent.student_name
                }
              </strong>{" "}
              akan dikeluarkan dari kelas.
              Riwayat attendance dan nilai
              tetap aman karena enrollment
              akan menjadi{" "}
              <strong>INACTIVE</strong>.
            </>
          }
          confirmText="Ya, Keluarkan"
          loading={
            removingStudent ===
            confirmRemoveStudent.student_id
          }
          danger
          onCancel={() =>
            setConfirmRemoveStudent(
              null
            )
          }
          onConfirm={
            removeStudent
          }
        />
      )}

      {confirmDeleteModule && (
        <ConfirmModal
          title="Hapus Modul?"
          description={
            <>
              Modul{" "}
              <strong>
                {
                  confirmDeleteModule.title
                }
              </strong>{" "}
              akan dihapus secara permanen.
            </>
          }
          confirmText="Ya, Hapus"
          loading={
            deletingModule ===
            confirmDeleteModule.id
          }
          danger
          onCancel={() =>
            setConfirmDeleteModule(
              null
            )
          }
          onConfirm={
            deleteModule
          }
        />
      )}
    </div>
  )
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="truncate text-sm font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  )
}

function StatMini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-xs">
          {label}
        </span>
      </div>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: ClassStatus
}) {
  const active =
    status === "ACTIVE"

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {active
        ? "Aktif"
        : "Tidak Aktif"}
    </span>
  )
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.49a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7v-2h.84A1.7 1.7 0 0 0 9.4 10.4a1.7 1.7 0 0 0-.34-1.88L9 8.46l1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.38 5.9V5h2v.9a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 11H21v2h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  )
}

function ModalShell({
  title,
  onClose,
  disabled,
  children,
}: {
  title: string
  onClose: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  description,
  confirmText,
  loading,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  description: React.ReactNode
  confirmText: string
  loading?: boolean
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="p-6">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
              danger
                ? "bg-red-50 text-red-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertCircle className="h-6 w-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-red-600 text-red-600"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  )
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-xs font-medium">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function LoadingBox({
  text,
}: {
  text: string
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        {text}
      </div>
    </div>
  )
}

function EmptyBox({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        {icon}
      </div>

      <h4 className="font-bold text-slate-900">
        {title}
      </h4>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

function ToastView({
  toast,
  onClose,
}: {
  toast: Toast
  onClose: () => void
}) {
  const success =
    toast.type === "success"

  return (
    <div className="fixed right-4 top-20 z-[120] w-[calc(100%-2rem)] max-w-md">
      <div
        className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${
          success
            ? "border-emerald-200"
            : "border-red-200"
        }`}
      >
        {success ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        )}

        <p className="flex-1 text-sm leading-6 text-slate-700">
          {toast.message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}