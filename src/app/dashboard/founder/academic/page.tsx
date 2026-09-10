'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Search,
  Users,
  XCircle,
} from 'lucide-react'

type AcademicStudent = {
  id: string
  studentName: string
  gradeLevel: string | null
  schoolName: string | null
  status: string
  attendancePercentage: number
  averageScore: number
  totalGrades: number
  totalClasses: number
  attendanceAlpha: number
}

type AcademicResponse = {
  summary: {
    totalStudents: number
    attendancePercentage: number
    averageScore: number
    studentsNeedAttention: number
  }
  filters: {
    classes: Array<{
      id: string
      className: string
    }>
    subjects: string[]
  }
  students: AcademicStudent[]
}

export default function FounderAcademicPage() {
  const [data, setData] = useState<AcademicResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('ALL')
  const [subject, setSubject] = useState('ALL')
  const [status, setStatus] = useState('ALL')

  async function loadAcademic() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (search.trim()) {
        params.set('search', search.trim())
      }

      if (classId !== 'ALL') {
        params.set('classId', classId)
      }

      if (subject !== 'ALL') {
        params.set('subject', subject)
      }

      if (status !== 'ALL') {
        params.set('status', status)
      }

      const query = params.toString()

      const response = await fetch(
        `/api/founder/academic${query ? `?${query}` : ''}`,
        {
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Gagal mengambil data akademik.',
        )
      }

      setData(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengambil data.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAcademic()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, classId, subject, status])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap
                  size={24}
                  className="text-blue-600"
                />

                <h1 className="text-2xl font-bold text-slate-900">
                  Akademik
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Monitoring perkembangan akademik siswa.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle
                size={21}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <h2 className="font-semibold text-red-800">
                  Gagal memuat data akademik
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadAcademic}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Siswa"
            value={
              loading
                ? '-'
                : data?.summary.totalStudents ?? 0
            }
            description="Siswa dalam sistem akademik"
            icon={Users}
          />

          <SummaryCard
            title="Kehadiran"
            value={
              loading
                ? '-'
                : `${(
                    data?.summary.attendancePercentage ??
                    0
                  ).toFixed(1)}%`
            }
            description="Persentase kehadiran keseluruhan"
            icon={CalendarCheck}
            danger={
              !loading &&
              (data?.summary.attendancePercentage ?? 0) < 80
            }
          />

          <SummaryCard
            title="Nilai Rata-rata"
            value={
              loading
                ? '-'
                : (
                    data?.summary.averageScore ?? 0
                  ).toFixed(1)
            }
            description="Rata-rata nilai siswa"
            icon={BookOpen}
            danger={
              !loading &&
              (data?.summary.averageScore ?? 0) < 70
            }
          />

          <SummaryCard
            title="Perlu Perhatian"
            value={
              loading
                ? '-'
                : data?.summary.studentsNeedAttention ?? 0
            }
            description="Siswa dengan indikator akademik"
            icon={AlertTriangle}
            danger={
              !loading &&
              (data?.summary.studentsNeedAttention ?? 0) > 0
            }
          />
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">
              Filter Akademik
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Gunakan filter untuk melihat perkembangan siswa berdasarkan kelas dan mata pelajaran.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            {/* Search */}
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama siswa..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Class */}
            <select
              value={classId}
              onChange={(event) =>
                setClassId(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                Semua Kelas
              </option>

              {data?.filters.classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.className}
                </option>
              ))}
            </select>

            {/* Subject */}
            <select
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                Semua Mata Pelajaran
              </option>

              {data?.filters.subjects.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

        {/* Student List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Perkembangan Siswa
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Ringkasan kehadiran dan nilai siswa.
                </p>
              </div>

              {!loading && data && (
                <span className="text-xs font-medium text-slate-400">
                  {data.students.length} siswa ditampilkan
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingTable />
          ) : !data || data.students.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">
                      Siswa
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                    <th className="px-5 py-3 text-center">
                      Kelas
                    </th>

                    <th className="px-5 py-3 text-center">
                      Kehadiran
                    </th>

                    <th className="px-5 py-3 text-center">
                      Nilai
                    </th>

                    <th className="px-5 py-3 text-center">
                      Penilaian
                    </th>

                    <th className="px-5 py-3 text-center">
                      Alpha
                    </th>

                    <th className="px-5 py-3 text-right">
                      Detail
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.students.map((student) => {
                    const needsAttention =
                      student.attendancePercentage < 80 ||
                      student.averageScore < 70 ||
                      student.attendanceAlpha > 0

                    return (
                      <tr
                        key={student.id}
                        className="transition hover:bg-slate-50"
                      >
                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <GraduationCap
                                size={19}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {student.studentName}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {student.gradeLevel ||
                                  'Jenjang tidak tersedia'}

                                {student.schoolName
                                  ? ` • ${student.schoolName}`
                                  : ''}
                              </p>
                            </div>

                            {needsAttention && (
                              <AlertTriangle
                                size={16}
                                className="shrink-0 text-amber-500"
                              />
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              student.status ===
                              'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {student.status ===
                            'ACTIVE'
                              ? 'Aktif'
                              : 'Tidak Aktif'}
                          </span>
                        </td>

                        {/* Classes */}
                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {student.totalClasses}
                          </span>
                        </td>

                        {/* Attendance */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`font-bold ${
                              student.attendancePercentage >=
                              85
                                ? 'text-emerald-600'
                                : student.attendancePercentage >=
                                    80
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {student.attendancePercentage.toFixed(
                              1,
                            )}
                            %
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`font-bold ${
                              student.averageScore >=
                              85
                                ? 'text-emerald-600'
                                : student.averageScore >=
                                    70
                                  ? 'text-blue-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {student.averageScore.toFixed(
                              1,
                            )}
                          </span>
                        </td>

                        {/* Grades */}
                        <td className="px-5 py-4 text-center text-sm text-slate-600">
                          {student.totalGrades}
                        </td>

                        {/* Alpha */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`font-semibold ${
                              student.attendanceAlpha >
                              0
                                ? 'text-red-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {student.attendanceAlpha}
                          </span>
                        </td>

                        {/* Detail */}
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/founder/academic/${student.id}`}
                            className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                          >
                            Lihat Detail
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monitoring note */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">
              Catatan:
            </span>{' '}
            Halaman ini bersifat monitoring. Data kehadiran,
            nilai, feedback, dan modul pembelajaran diinput
            oleh Tutor.
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  danger = false,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger
                ? 'text-red-600'
                : 'text-slate-900'
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? 'bg-red-50 text-red-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

function LoadingTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="flex items-center gap-4 px-5 py-5"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />

          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="hidden h-4 w-16 animate-pulse rounded bg-slate-100 sm:block" />
          <div className="hidden h-4 w-16 animate-pulse rounded bg-slate-100 sm:block" />
          <div className="hidden h-4 w-16 animate-pulse rounded bg-slate-100 sm:block" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Users size={22} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-800">
        Tidak ada siswa
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Belum ada data siswa yang sesuai dengan filter.
      </p>
    </div>
  )
}