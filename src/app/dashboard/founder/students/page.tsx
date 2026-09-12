'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Loader2,
  Phone,
  Plus,
  Search,
  School,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'

type Parent = {
  id: string
  full_name: string
  phone_number: string | null
}

type Student = {
  id: string
  student_name: string
  grade_level: string
  school_name: string | null
  phone_number: string | null
  status: 'ACTIVE' | 'INACTIVE'
  parent_id: string | null
  parent:
    | {
        full_name: string
        phone_number: string | null
      }
    | {
        full_name: string
        phone_number: string | null
      }[]
    | null
}

type StudentForm = {
  studentName: string
  gradeLevel: string
  schoolName: string
  phoneNumber: string
  parentId: string
  status: 'ACTIVE' | 'INACTIVE'
}

type ToastType = 'success' | 'error'

type Toast = {
  type: ToastType
  message: string
}

const gradeOptions = [
  {
    value: 'TK',
    label: 'TK',
  },
  {
    value: 'SD 1',
    label: 'SD Kelas 1',
  },
  {
    value: 'SD 2',
    label: 'SD Kelas 2',
  },
  {
    value: 'SD 3',
    label: 'SD Kelas 3',
  },
  {
    value: 'SD 4',
    label: 'SD Kelas 4',
  },
  {
    value: 'SD 5',
    label: 'SD Kelas 5',
  },
  {
    value: 'SD 6',
    label: 'SD Kelas 6',
  },
  {
    value: 'SMP 7',
    label: 'SMP Kelas 7',
  },
  {
    value: 'SMP 8',
    label: 'SMP Kelas 8',
  },
  {
    value: 'SMP 9',
    label: 'SMP Kelas 9',
  },
  {
    value: 'SMA 10',
    label: 'SMA Kelas 10',
  },
  {
    value: 'SMA 11',
    label: 'SMA Kelas 11',
  },
  {
    value: 'SMA 12',
    label: 'SMA Kelas 12',
  },
]

function getEmptyForm(): StudentForm {
  return {
    studentName: '',
    gradeLevel: '',
    schoolName: '',
    phoneNumber: '',
    parentId: '',
    status: 'ACTIVE',
  }
}

function getInitial(name: string) {
  return (
    name?.charAt(0)?.toUpperCase() || '?'
  )
}

function getGradeLabel(value: string) {
  return (
    gradeOptions.find(
      (grade) => grade.value === value,
    )?.label ?? value
  )
}

function getStatusStyle(
  status: Student['status'],
) {
  if (status === 'ACTIVE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  return 'border-slate-200 bg-slate-100 text-slate-500'
}

function getParentName(student: Student) {
  if (!student.parent) {
    return '-'
  }

  if (Array.isArray(student.parent)) {
    return (
      student.parent[0]?.full_name ?? '-'
    )
  }

  return student.parent.full_name ?? '-'
}

function getParentPhone(student: Student) {
  if (!student.parent) {
    return null
  }

  if (Array.isArray(student.parent)) {
    return (
      student.parent[0]?.phone_number ?? null
    )
  }

  return student.parent.phone_number ?? null
}

export default function FounderStudentsPage() {
  const [students, setStudents] = useState<
    Student[]
  >([])

  const [parents, setParents] = useState<
    Parent[]
  >([])

  const [loading, setLoading] =
    useState(true)

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null)

  const [saving, setSaving] =
    useState(false)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] =
    useState<Student | null>(null)

  const [searchQuery, setSearchQuery] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE'>(
      'ALL',
    )

  const [toast, setToast] =
    useState<Toast | null>(null)

  const [form, setForm] =
    useState<StudentForm>(
      getEmptyForm(),
    )

  // ============================================================
  // TOAST
  // ============================================================

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

  // ============================================================
  // LOAD STUDENTS
  // ============================================================

  async function loadStudents() {
    try {
      setLoading(true)

      const response = await fetch(
        '/api/founder/students',
        {
          cache: 'no-store',
          credentials: 'include',
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data siswa.',
        )
      }

      setStudents(result.students ?? [])
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data siswa.',
      )
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // LOAD PARENTS
  // ============================================================

  async function loadParents() {
    try {
      const response = await fetch(
        '/api/founder/students?parents=true',
        {
          cache: 'no-store',
          credentials: 'include',
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data orang tua.',
        )
      }

      setParents(result.parents ?? [])
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data orang tua.',
      )
    }
  }

  useEffect(() => {
    loadStudents()
    loadParents()
  }, [])

  // ============================================================
  // SCHOOL OPTIONS
  // ============================================================

  const schoolOptions = useMemo(() => {
    const schools = students
      .map(
        (student) =>
          student.school_name?.trim(),
      )
      .filter(
        (
          school,
        ): school is string =>
          Boolean(school),
      )

    return Array.from(
      new Set(schools),
    ).sort((a, b) =>
      a.localeCompare(b, 'id'),
    )
  }, [students])

  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  const filteredStudents = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase()

    return students.filter(
      (student) => {
        const matchesStatus =
          statusFilter === 'ALL' ||
          student.status === statusFilter

        if (!matchesStatus) {
          return false
        }

        if (!query) {
          return true
        }

        const parentName =
          getParentName(student)
            .toLowerCase()

        const parentPhone =
          (
            getParentPhone(student) ?? ''
          ).toLowerCase()

        return (
          student.student_name
            .toLowerCase()
            .includes(query) ||
          getGradeLabel(
            student.grade_level,
          )
            .toLowerCase()
            .includes(query) ||
          (
            student.school_name ?? ''
          )
            .toLowerCase()
            .includes(query) ||
          (
            student.phone_number ?? ''
          )
            .toLowerCase()
            .includes(query) ||
          parentName.includes(query) ||
          parentPhone.includes(query) ||
          student.id
            .toLowerCase()
            .includes(query)
        )
      },
    )
  }, [
    students,
    searchQuery,
    statusFilter,
  ])

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalStudents =
    students.length

  const totalActive =
    students.filter(
      (student) =>
        student.status === 'ACTIVE',
    ).length

  const totalInactive =
    students.filter(
      (student) =>
        student.status === 'INACTIVE',
    ).length

  // ============================================================
  // MODAL
  // ============================================================

  function openCreateModal() {
    setEditingStudent(null)
    setForm(getEmptyForm())
    setModalOpen(true)
  }

  function openEditModal(
    student: Student,
  ) {
    setEditingStudent(student)

    setForm({
      studentName:
        student.student_name ?? '',
      gradeLevel:
        student.grade_level ?? '',
      schoolName:
        student.school_name ?? '',
      phoneNumber:
        student.phone_number ?? '',
      parentId:
        student.parent_id ?? '',
      status:
        student.status ?? 'ACTIVE',
    })

    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingStudent(null)
  }

  // ============================================================
  // CREATE / EDIT
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    // ----------------------------------------------------------
    // CUSTOM VALIDATION
    // Semua error masuk TOAST.
    // Tidak ada banner dan tidak ada browser popup.
    // ----------------------------------------------------------

    const studentName =
      form.studentName.trim()

    const schoolName =
      form.schoolName.trim()

    const phoneNumber =
      form.phoneNumber.trim()

    if (
      studentName.length < 2 ||
      studentName.length > 100
    ) {
      showToast(
        'error',
        'Nama siswa harus terdiri dari 2–100 karakter.',
      )
      return
    }

    if (
      /[\u0000-\u001F\u007F]/.test(
        studentName,
      )
    ) {
      showToast(
        'error',
        'Nama siswa mengandung karakter yang tidak valid.',
      )
      return
    }

    if (!form.gradeLevel) {
      showToast(
        'error',
        'Silakan pilih jenjang/kelas siswa terlebih dahulu.',
      )
      return
    }

    if (
      !gradeOptions.some(
        (grade) =>
          grade.value ===
          form.gradeLevel,
      )
    ) {
      showToast(
        'error',
        'Jenjang/kelas siswa tidak valid.',
      )
      return
    }

    if (schoolName.length > 150) {
      showToast(
        'error',
        'Nama sekolah maksimal 150 karakter.',
      )
      return
    }

    if (
      schoolName &&
      /[\u0000-\u001F\u007F]/.test(
        schoolName,
      )
    ) {
      showToast(
        'error',
        'Nama sekolah mengandung karakter yang tidak valid.',
      )
      return
    }

    if (!phoneNumber) {
      showToast(
        'error',
        'Nomor telepon siswa wajib diisi.',
      )
      return
    }

    if (
      !/^\d{10,13}$/.test(
        phoneNumber,
      )
    ) {
      showToast(
        'error',
        'Nomor telepon harus terdiri dari 10–13 digit angka.',
      )
      return
    }

    if (
      form.parentId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        form.parentId,
      )
    ) {
      showToast(
        'error',
        'Data orang tua tidak valid.',
      )
      return
    }

    if (
      form.status !== 'ACTIVE' &&
      form.status !== 'INACTIVE'
    ) {
      showToast(
        'error',
        'Status siswa tidak valid.',
      )
      return
    }

    try {
      setSaving(true)

      const url = editingStudent
        ? `/api/founder/students/${editingStudent.id}`
        : '/api/founder/students'

      const method = editingStudent
        ? 'PATCH'
        : 'POST'

      const body = {
        studentName,
        gradeLevel:
          form.gradeLevel,
        schoolName:
          schoolName || null,
        phoneNumber,
        parentId:
          form.parentId || null,
        status: form.status,
      }

      const response = await fetch(
        url,
        {
          method,
          headers: {
            'Content-Type':
              'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(body),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menyimpan data siswa.',
        )
      }

      setModalOpen(false)
      setEditingStudent(null)
      setForm(getEmptyForm())

      showToast(
        'success',
        editingStudent
          ? 'Data siswa berhasil diperbarui.'
          : 'Data siswa berhasil ditambahkan.',
      )

      await loadStudents()
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan data siswa.',
      )
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // DELETE CONFIRMATION
  // ============================================================

  function openDeleteConfirm(
    student: Student,
  ) {
    if (deletingId) return

    setDeleteTarget(student)
  }

  function closeDeleteConfirm() {
    if (deletingId) return

    setDeleteTarget(null)
  }

  // ============================================================
  // DELETE
  // ============================================================

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    const student = deleteTarget

    try {
      setDeletingId(student.id)

      const response = await fetch(
        `/api/founder/students/${student.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menghapus data siswa.',
        )
      }

      setDeleteTarget(null)

      showToast(
        'success',
        'Data siswa berhasil dihapus secara permanen.',
      )

      await loadStudents()
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal menghapus data siswa.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

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
              Siswa
            </h1>
          </div>

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Tambah Siswa
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

          {/* ====================================================
              SUMMARY
          ==================================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {/* TOTAL */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Total Siswa
                </span>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                  <Users size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalStudents}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Seluruh siswa terdaftar
              </p>
            </div>

            {/* ACTIVE */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Siswa Aktif
                </span>

                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-500">
                  <CheckCircle2
                    size={18}
                  />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalActive}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Sedang mengikuti program
              </p>
            </div>

            {/* INACTIVE */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Siswa Tidak Aktif
                </span>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                  <UserRound size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalInactive}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tidak aktif saat ini
              </p>
            </div>
          </div>

          {/* ====================================================
              SEARCH
          ==================================================== */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">

              <div className="relative flex-1">
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
                  placeholder="Cari nama siswa, kelas, sekolah, nomor telepon, atau ID..."
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

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as
                      | 'ALL'
                      | 'ACTIVE'
                      | 'INACTIVE',
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 lg:w-48"
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

            {(searchQuery ||
              statusFilter !==
                'ALL') && (
              <p className="mt-2 px-1 text-xs text-slate-400">
                Menampilkan{' '}
                <span className="font-semibold text-slate-600">
                  {
                    filteredStudents.length
                  }
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-slate-600">
                  {students.length}
                </span>{' '}
                siswa
              </p>
            )}
          </div>

          {/* ====================================================
              TABLE
          ==================================================== */}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  size={28}
                  className="animate-spin text-slate-400"
                />

                <p className="text-sm text-slate-500">
                  Memuat data siswa...
                </p>
              </div>
            </div>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* SECTION HEADER */}

              <div className="border-b border-slate-200 px-5 py-5">
                <div className="flex items-start gap-3">

                  <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <GraduationCap
                      size={20}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">

                      <div>
                        <h2 className="font-semibold text-slate-900">
                          Data Siswa
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Pengelolaan data siswa yang terdaftar di NAGALA Education.
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        {
                          filteredStudents.length
                        }{' '}
                        siswa
                      </span>

                    </div>
                  </div>

                </div>
              </div>

              {/* EMPTY */}

              {filteredStudents.length ===
              0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Users
                      size={23}
                      className="text-slate-400"
                    />
                  </div>

                  <p className="text-sm font-medium text-slate-700">
                    {searchQuery ||
                    statusFilter !==
                      'ALL'
                      ? 'Tidak ada hasil pencarian.'
                      : 'Belum ada data siswa.'}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {searchQuery ||
                    statusFilter !==
                      'ALL'
                      ? 'Coba gunakan kata kunci atau filter lain.'
                      : 'Data siswa akan muncul di bagian ini.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">

                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Siswa
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Jenjang / Kelas
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sekolah
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Kontak
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Orang Tua
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Aksi
                        </th>

                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map(
                        (student) => {
                          const parentName =
                            getParentName(
                              student,
                            )

                          const parentPhone =
                            getParentPhone(
                              student,
                            )

                          return (
                            <tr
                              key={
                                student.id
                              }
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                            >

                              {/* SISWA */}

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">

                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700">
                                    {getInitial(
                                      student.student_name,
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-900">
                                      {
                                        student.student_name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                      ID:{' '}
                                      {student.id.slice(
                                        0,
                                        8,
                                      )}
                                      ...
                                    </p>
                                  </div>

                                </div>
                              </td>

                              {/* GRADE */}

                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  {getGradeLabel(
                                    student.grade_level,
                                  )}
                                </span>
                              </td>

                              {/* SCHOOL */}

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <School
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span>
                                    {student.school_name ||
                                      '-'}
                                  </span>
                                </div>
                              </td>

                              {/* CONTACT */}

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span>
                                    {student.phone_number ||
                                      '-'}
                                  </span>
                                </div>
                              </td>

                              {/* PARENT */}

                              <td className="px-5 py-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <UserRound
                                      size={15}
                                      className="shrink-0 text-slate-400"
                                    />

                                    <span>
                                      {
                                        parentName
                                      }
                                    </span>
                                  </div>

                                  {parentPhone && (
                                    <p className="pl-6 text-xs text-slate-400">
                                      {
                                        parentPhone
                                      }
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* STATUS */}

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
                                    ${getStatusStyle(
                                      student.status,
                                    )}
                                  `}
                                >
                                  {student.status ===
                                  'ACTIVE'
                                    ? 'Aktif'
                                    : 'Tidak Aktif'}
                                </span>
                              </td>

                              {/* ACTION */}

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(
                                        student,
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
                                      student.id
                                    }
                                    onClick={() =>
                                      openDeleteConfirm(
                                        student,
                                      )
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deletingId ===
                                    student.id ? (
                                      <Loader2
                                        size={
                                          16
                                        }
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2
                                        size={
                                          16
                                        }
                                      />
                                    )}

                                    Hapus
                                  </button>

                                </div>
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
                  {editingStudent
                    ? 'Edit Siswa'
                    : 'Tambah Siswa'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Data siswa dikelola oleh Founder.
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
              noValidate
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >

              {/* NAMA */}

              <div>
                <label
                  htmlFor="studentName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Nama Lengkap Siswa
                </label>

                <input
                  id="studentName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={
                    form.studentName
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        studentName:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Nama lengkap siswa"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Nama harus terdiri dari 2–100 karakter.
                </p>
              </div>

              {/* GRADE */}

              <div>
                <label
                  htmlFor="gradeLevel"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Jenjang / Kelas
                </label>

                <select
                  id="gradeLevel"
                  required
                  value={
                    form.gradeLevel
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        gradeLevel:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option
                    value=""
                    disabled
                  >
                    Pilih jenjang / kelas
                  </option>

                  {gradeOptions.map(
                    (grade) => (
                      <option
                        key={
                          grade.value
                        }
                        value={
                          grade.value
                        }
                      >
                        {grade.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* SCHOOL */}

              <div>
                <label
                  htmlFor="schoolName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Sekolah
                </label>

                <input
                  id="schoolName"
                  type="text"
                  maxLength={150}
                  list="school-options"
                  value={
                    form.schoolName
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        schoolName:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Pilih sekolah atau ketik sekolah baru"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />

                <datalist id="school-options">
                  {schoolOptions.map(
                    (school) => (
                      <option
                        key={school}
                        value={school}
                      />
                    ),
                  )}
                </datalist>

                <p className="mt-1.5 text-xs text-slate-400">
                  Maksimal 150 karakter. Sekolah baru dapat langsung diketik.
                </p>
              </div>

              {/* PHONE */}

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Nomor Telepon
                </label>

                <input
                  id="phoneNumber"
                  type="tel"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10,13}"
                  minLength={10}
                  maxLength={13}
                  value={
                    form.phoneNumber
                  }
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(
                        /\D/g,
                        '',
                      )

                    if (
                      value.length <=
                      13
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

                <p className="mt-1.5 text-xs text-slate-400">
                  Wajib diisi, 10–13 digit angka.
                </p>
              </div>

              {/* PARENT */}

              <div>
                <label
                  htmlFor="parentId"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Orang Tua
                </label>

                <select
                  id="parentId"
                  value={
                    form.parentId
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        parentId:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">
                    Pilih orang tua
                  </option>

                  {parents.map(
                    (parent) => (
                      <option
                        key={
                          parent.id
                        }
                        value={
                          parent.id
                        }
                      >
                        {
                          parent.full_name
                        }
                        {parent.phone_number
                          ? ` — ${parent.phone_number}`
                          : ''}
                      </option>
                    ),
                  )}
                </select>

                <p className="mt-1.5 text-xs text-slate-400">
                  Hubungkan siswa dengan akun Orang Tua yang terdaftar.
                </p>
              </div>

              {/* STATUS */}

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Status Siswa
                </label>

                <select
                  id="status"
                  value={
                    form.status
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        status:
                          event.target
                            .value as
                            | 'ACTIVE'
                            | 'INACTIVE',
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option value="ACTIVE">
                    Aktif
                  </option>

                  <option value="INACTIVE">
                    Tidak Aktif
                  </option>
                </select>
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

                  {editingStudent
                    ? 'Simpan Perubahan'
                    : 'Tambah Siswa'}
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">

          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">
                  Hapus Data Siswa?
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Data siswa akan dihapus secara permanen dan tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDeleteConfirm
                }
                disabled={
                  Boolean(
                    deletingId,
                  )
                }
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Tutup konfirmasi"
              >
                <X size={19} />
              </button>

            </div>

            {/* STUDENT */}

            <div className="px-5 py-5">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-slate-700 shadow-sm">
                    {getInitial(
                      deleteTarget.student_name,
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {
                        deleteTarget.student_name
                      }
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {getGradeLabel(
                        deleteTarget.grade_level,
                      )}
                    </p>
                  </div>

                </div>

              </div>

              {/* ACTION */}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeDeleteConfirm
                  }
                  disabled={
                    Boolean(
                      deletingId,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  disabled={
                    Boolean(
                      deletingId,
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  Hapus Siswa
                </button>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}