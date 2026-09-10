'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Edit3,
  GraduationCap,
  Loader2,
  Phone,
  Plus,
  Search,
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

const gradeOptions = [
  'TK',
  'SD Kelas 1',
  'SD Kelas 2',
  'SD Kelas 3',
  'SD Kelas 4',
  'SD Kelas 5',
  'SD Kelas 6',
  'SMP Kelas 7',
  'SMP Kelas 8',
  'SMP Kelas 9',
  'SMA Kelas 10',
  'SMA Kelas 11',
  'SMA Kelas 12',
]

function getParentName(student: Student) {
  if (!student.parent) {
    return 'Belum terhubung'
  }

  if (Array.isArray(student.parent)) {
    return (
      student.parent[0]?.full_name ??
      'Belum terhubung'
    )
  }

  return student.parent.full_name
}

function getParentPhone(student: Student) {
  if (!student.parent) {
    return null
  }

  if (Array.isArray(student.parent)) {
    return (
      student.parent[0]?.phone_number ??
      null
    )
  }

  return student.parent.phone_number
}

function getInitial(name: string) {
  return (
    name?.charAt(0)?.toUpperCase() || '?'
  )
}

function getStatusStyle(
  status: Student['status']
) {
  if (status === 'ACTIVE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  return 'border-slate-200 bg-slate-100 text-slate-600'
}

function getEmptyForm(): StudentForm {
  return {
    studentName: '',
    gradeLevel: 'SMA Kelas 10',
    schoolName: '',
    phoneNumber: '',
    parentId: '',
    status: 'ACTIVE',
  }
}

export default function FounderStudentsPage() {
  const [students, setStudents] = useState<Student[]>(
    []
  )

  const [parents, setParents] = useState<Parent[]>(
    []
  )

  const [loading, setLoading] = useState(true)
  const [loadingParents, setLoadingParents] =
    useState(true)

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null)

  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE'>(
      'ALL'
    )

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] =
    useState<StudentForm>(getEmptyForm())

  async function loadStudents() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        '/api/founder/students'
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data siswa.'
        )
      }

      setStudents(result.students ?? [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data siswa.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadParents() {
    try {
      setLoadingParents(true)

      const response = await fetch(
        '/api/founder/students?parents=true'
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data orang tua.'
        )
      }

      setParents(result.parents ?? [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data orang tua.'
      )
    } finally {
      setLoadingParents(false)
    }
  }

  useEffect(() => {
    loadStudents()
    loadParents()
  }, [])

  function openCreateModal() {
    setEditingStudent(null)
    setForm(getEmptyForm())
    setMessage('')
    setError('')
    setModalOpen(true)
  }

  function openEditModal(
    student: Student
  ) {
    setEditingStudent(student)

    setForm({
      studentName: student.student_name,
      gradeLevel:
        student.grade_level || 'SMA Kelas 10',
      schoolName:
        student.school_name ?? '',
      phoneNumber:
        student.phone_number ?? '',
      parentId:
        student.parent_id ?? '',
      status: student.status,
    })

    setMessage('')
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingStudent(null)
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

      const url = editingStudent
        ? `/api/founder/students/${editingStudent.id}`
        : '/api/founder/students'

      const method = editingStudent
        ? 'PATCH'
        : 'POST'

      const body = {
        studentName: form.studentName,
        gradeLevel: form.gradeLevel,
        schoolName:
          form.schoolName || null,
        phoneNumber:
          form.phoneNumber || null,
        parentId:
          form.parentId || null,
        status: form.status,
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
            'Gagal menyimpan data siswa.'
        )
      }

      setMessage(
        editingStudent
          ? 'Data siswa berhasil diperbarui.'
          : 'Data siswa berhasil ditambahkan.'
      )

      setModalOpen(false)
      setEditingStudent(null)

      await Promise.all([
        loadStudents(),
        loadParents(),
      ])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan data siswa.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(
    student: Student
  ) {
    const confirmed = window.confirm(
      `Hapus data siswa ${student.student_name} secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`
    )

    if (!confirmed) return

    try {
      setDeletingId(student.id)
      setError('')
      setMessage('')

      const response = await fetch(
        `/api/founder/students/${student.id}`,
        {
          method: 'DELETE',
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal menghapus data siswa.'
        )
      }

      setMessage(
        'Data siswa berhasil dihapus secara permanen.'
      )

      await loadStudents()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus data siswa.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const filteredStudents = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()

    return students.filter((student) => {
      const parentName =
        getParentName(student).toLowerCase()

      const matchesSearch =
        !keyword ||
        student.student_name
          .toLowerCase()
          .includes(keyword) ||
        student.grade_level
          .toLowerCase()
          .includes(keyword) ||
        (student.school_name ?? '')
          .toLowerCase()
          .includes(keyword) ||
        parentName.includes(keyword)

      const matchesStatus =
        statusFilter === 'ALL' ||
        student.status === statusFilter

      return (
        matchesSearch &&
        matchesStatus
      )
    })
  }, [
    students,
    search,
    statusFilter,
  ])

  const totalStudents = students.length

  const activeStudents = students.filter(
    (student) =>
      student.status === 'ACTIVE'
  ).length

  const inactiveStudents =
    students.filter(
      (student) =>
        student.status === 'INACTIVE'
    ).length

  const studentsWithoutParent =
    students.filter(
      (student) => !student.parent_id
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
              Siswa
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
              Tambah Siswa
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
                <GraduationCap size={22} />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  Pengelolaan Data Siswa
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Founder dapat mengelola data
                  siswa, menghubungkan siswa dengan
                  akun Orang Tua, serta mengatur status
                  keaktifan siswa.
                </p>
              </div>
            </div>
          </div>

          {/* PESAN BERHASIL */}
          {message && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <span className="mt-0.5">
                Data berhasil diproses.
              </span>

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
                  Total Siswa
                </span>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                  <GraduationCap size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {totalStudents}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Seluruh data siswa
              </p>
            </div>

            {/* AKTIF */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Siswa Aktif
                </span>

                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-500">
                  <Users size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {activeStudents}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Sedang mengikuti program
              </p>
            </div>

            {/* TIDAK AKTIF */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Tidak Aktif
                </span>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                  <UserRound size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {inactiveStudents}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tidak sedang aktif
              </p>
            </div>

            {/* BELUM TERHUBUNG */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Belum Terhubung
                </span>

                <div className="rounded-xl bg-amber-50 p-2 text-amber-500">
                  <UserRound size={18} />
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {studentsWithoutParent}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Belum memiliki Orang Tua
              </p>
            </div>
          </div>

          {/* DAFTAR SISWA */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* JUDUL */}
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Daftar Siswa
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Kelola seluruh data siswa NAGALA
                    Education.
                  </p>
                </div>

                <span className="text-xs font-medium text-slate-400">
                  Menampilkan{' '}
                  {filteredStudents.length}{' '}
                  dari {students.length} siswa
                </span>
              </div>

              {/* SEARCH + FILTER */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="
                      pointer-events-none
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Cari nama siswa, sekolah, kelas, atau Orang Tua..."
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      py-3
                      pl-10
                      pr-4
                      text-sm
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-red-400
                      focus:ring-2
                      focus:ring-red-100
                    "
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
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-700
                    outline-none
                    transition
                    focus:border-red-400
                    focus:ring-2
                    focus:ring-red-100
                    sm:w-48
                  "
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

            {/* LOADING */}
            {loading ? (
              <div className="flex min-h-64 items-center justify-center">
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
            ) : filteredStudents.length ===
              0 ? (
              /* KOSONG */
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-2xl bg-slate-100 p-4">
                  <GraduationCap
                    size={36}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="font-semibold text-slate-800">
                  {students.length === 0
                    ? 'Belum ada siswa'
                    : 'Siswa tidak ditemukan'}
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {students.length === 0
                    ? 'Tambahkan data siswa untuk mulai mengelola peserta didik.'
                    : 'Coba gunakan kata kunci atau filter status yang berbeda.'}
                </p>

                {students.length ===
                  0 && (
                  <button
                    type="button"
                    onClick={
                      openCreateModal
                    }
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
                    Tambah Siswa
                  </button>
                )}
              </div>
            ) : (
              /* TABEL */
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Siswa
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pendidikan
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Orang Tua
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kontak
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
                            student
                          )

                        const parentPhone =
                          getParentPhone(
                            student
                          )

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="
                              border-b
                              border-slate-100
                              last:border-0
                              hover:bg-slate-50/70
                            "
                          >
                            {/* SISWA */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="
                                    flex
                                    h-11
                                    w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-red-50
                                    font-bold
                                    text-red-600
                                  "
                                >
                                  {getInitial(
                                    student.student_name
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {
                                      student.student_name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    ID:{' '}
                                    {student.id.slice(
                                      0,
                                      8
                                    )}
                                    ...
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* PENDIDIKAN */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-medium text-slate-700">
                                  {
                                    student.grade_level
                                  }
                                </p>

                                <p className="mt-1 max-w-[220px] truncate text-sm text-slate-500">
                                  {student.school_name ||
                                    'Sekolah belum diisi'}
                                </p>
                              </div>
                            </td>

                            {/* ORANG TUA */}
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <UserRound
                                  size={16}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />

                                <div className="min-w-0">
                                  <p
                                    className={`
                                      truncate
                                      text-sm
                                      font-medium
                                      ${
                                        student.parent_id
                                          ? 'text-slate-700'
                                          : 'text-amber-600'
                                      }
                                    `}
                                  >
                                    {
                                      parentName
                                    }
                                  </p>

                                  {parentPhone && (
                                    <p className="mt-1 text-xs text-slate-400">
                                      {
                                        parentPhone
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* KONTAK */}
                            <td className="px-5 py-4">
                              {student.phone_number ? (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span>
                                    {
                                      student.phone_number
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  Belum diisi
                                </span>
                              )}
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
                                    student.status
                                  )}
                                `}
                              >
                                {student.status ===
                                'ACTIVE'
                                  ? 'Aktif'
                                  : 'Tidak Aktif'}
                              </span>
                            </td>

                            {/* AKSI */}
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(
                                      student
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
                                    handleDelete(
                                      student
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
                                  student.id ? (
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
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            overflow-y-auto
            bg-slate-900/60
            p-4
          "
        >
          <div className="my-8 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER MODAL */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  {editingStudent
                    ? 'Edit Data Siswa'
                    : 'Tambah Siswa'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Data siswa dikelola oleh
                  Founder.
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
              {/* NAMA SISWA */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Lengkap Siswa
                </label>

                <input
                  type="text"
                  required
                  value={
                    form.studentName
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      studentName:
                        event.target.value,
                    }))
                  }
                  placeholder="Nama lengkap siswa"
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

              {/* TINGKAT KELAS */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tingkat Kelas
                </label>

                <select
                  required
                  value={
                    form.gradeLevel
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gradeLevel:
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
                  {gradeOptions.map(
                    (grade) => (
                      <option
                        key={grade}
                        value={grade}
                      >
                        {grade}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SEKOLAH */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Sekolah
                </label>

                <input
                  type="text"
                  value={
                    form.schoolName
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      schoolName:
                        event.target.value,
                    }))
                  }
                  placeholder="Contoh: SMAN 1 Jember"
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

              {/* ORANG TUA */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Orang Tua
                </label>

                <select
                  value={form.parentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      parentId:
                        event.target.value,
                    }))
                  }
                  disabled={
                    loadingParents
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
                    disabled:bg-slate-50
                  "
                >
                  <option value="">
                    Belum dihubungkan
                  </option>

                  {parents.map(
                    (parent) => (
                      <option
                        key={parent.id}
                        value={parent.id}
                      >
                        {parent.full_name}
                        {parent.phone_number
                          ? ` — ${parent.phone_number}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                <p className="mt-1.5 text-xs text-slate-400">
                  Hubungkan siswa dengan akun
                  Orang Tua yang sudah terdaftar.
                </p>
              </div>

              {/* NOMOR TELEPON */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nomor Telepon Siswa
                </label>

                <input
                  type="tel"
                  value={
                    form.phoneNumber
                  }
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

              {/* STATUS */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status Siswa
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status:
                        event.target.value as
                          | 'ACTIVE'
                          | 'INACTIVE',
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
                  <option value="ACTIVE">
                    Aktif
                  </option>

                  <option value="INACTIVE">
                    Tidak Aktif
                  </option>
                </select>
              </div>

              {/* ERROR */}
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

                  {editingStudent
                    ? 'Simpan Perubahan'
                    : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
