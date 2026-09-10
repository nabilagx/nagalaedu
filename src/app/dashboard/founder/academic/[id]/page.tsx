'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  XCircle,
} from 'lucide-react'



type AcademicDetail = {
  student: {
    id: string
    studentName: string
    gradeLevel: string | null
    schoolName: string | null
    phoneNumber: string | null
    status: string
  }

  summary: {
    attendance: {
      hadir: number
      izin: number
      sakit: number
      alpha: number
      percentage: number
    }
    averageScore: number
    totalGrades: number
    totalClasses: number
  }

  enrollments: Array<{
    id: string
    status: string
    enrolledAt: string
    endedAt: string | null
    class: {
      id: string
      className: string
      subject: string
      description: string | null
      scheduleDay: string
      scheduleStart: string
      scheduleEnd: string
      status: string
    } | null
  }>

  attendance: Array<{
    id: string
    date: string
    status:
      | 'HADIR'
      | 'IZIN'
      | 'SAKIT'
      | 'ALPHA'
    notes: string | null
    className: string
    subject: string
  }>

  grades: Array<{
    id: string
    subject: string
    assessmentName: string
    score: number
    feedbackNotes: string | null
    createdAt: string
  }>
}

function attendanceLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    HADIR: 'Hadir',
    IZIN: 'Izin',
    SAKIT: 'Sakit',
    ALPHA: 'Alpha',
  }

  return labels[status] ?? status
}

function attendanceClass(
  status: string
) {
  if (status === 'HADIR') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'ALPHA') {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-amber-50 text-amber-700'
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date(value))
}

export default function FounderAcademicDetailPage() {
  const [data, setData] =
    useState<AcademicDetail | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function loadDetail() {
      try {
        const pathParts =
          window.location.pathname.split(
            '/'
          )

        const id =
          pathParts[
            pathParts.length - 1
          ]

        if (!id) {
          throw new Error(
            'ID siswa tidak valid.'
          )
        }

        const response =
          await fetch(
            `/api/founder/academic/${id}`,
            {
              cache: 'no-store',
            }
          )

        const result =
          await response.json()

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Gagal mengambil detail akademik.'
          )
        }

        setData(result)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [])

  if (loading) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded-lg bg-slate-200" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-white"
              />
            ))}
          </div>

          <div className="h-80 rounded-2xl bg-white" />
        </div>
      </div>
    </div>
  )
}

  if (error || !data) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/founder/academic"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={17} />
          Kembali ke Akademik
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <XCircle
              size={22}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <h1 className="font-semibold text-red-800">
                Gagal memuat detail siswa
              </h1>

              <p className="mt-1 text-sm text-red-700">
                {error || 'Data siswa tidak ditemukan.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
return (
  <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/dashboard/founder/academic"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft size={17} />
        Kembali ke Akademik
      </Link>

      {/* Student Header */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <GraduationCap size={28} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {data.student.studentName}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  data.student.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {data.student.status === 'ACTIVE'
                  ? 'Aktif'
                  : 'Tidak Aktif'}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {data.student.gradeLevel ||
                'Jenjang tidak tersedia'}

              {data.student.schoolName
                ? ` • ${data.student.schoolName}`
                : ''}
            </p>

            {data.student.phoneNumber && (
              <p className="mt-1 text-xs text-slate-400">
                {data.student.phoneNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard
          title="Kehadiran"
          value={`${data.summary.attendance.percentage.toFixed(
            1
          )}%`}
          description={`${data.summary.attendance.hadir} hadir, ${data.summary.attendance.alpha} alpha`}
          icon={CalendarCheck}
          danger={
            data.summary.attendance.percentage < 80
          }
        />

        <DetailCard
          title="Nilai Rata-rata"
          value={data.summary.averageScore.toFixed(1)}
          description={`${data.summary.totalGrades} penilaian tercatat`}
          icon={BookOpen}
          danger={
            data.summary.averageScore < 70
          }
        />

        <DetailCard
          title="Total Kelas"
          value={data.summary.totalClasses}
          description="Kelas yang diikuti siswa"
          icon={GraduationCap}
        />

        <DetailCard
          title="Alpha"
          value={data.summary.attendance.alpha}
          description="Jumlah ketidakhadiran tanpa keterangan"
          icon={XCircle}
          danger={
            data.summary.attendance.alpha > 0
          }
        />
      </div>

      {/* Attendance Summary */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarCheck
                size={19}
                className="text-blue-600"
              />

              <h2 className="font-semibold text-slate-900">
                Rekap Kehadiran
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-600">
                Hadir
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                {data.summary.attendance.hadir}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs text-amber-600">
                Izin
              </p>
              <p className="mt-1 text-xl font-bold text-amber-700">
                {data.summary.attendance.izin}
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs text-orange-600">
                Sakit
              </p>
              <p className="mt-1 text-xl font-bold text-orange-700">
                {data.summary.attendance.sakit}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-xs text-red-600">
                Alpha
              </p>
              <p className="mt-1 text-xl font-bold text-red-700">
                {data.summary.attendance.alpha}
              </p>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <GraduationCap
                size={19}
                className="text-blue-600"
              />

              <h2 className="font-semibold text-slate-900">
                Kelas yang Diikuti
              </h2>
            </div>
          </div>

          {data.enrollments.length === 0 ? (
            <EmptyState text="Belum ada kelas yang diikuti." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.enrollments.map(
                (enrollment) => (
                  <div
                    key={enrollment.id}
                    className="px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {enrollment.class
                            ?.className ||
                            'Kelas tidak tersedia'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {enrollment.class
                            ?.subject ||
                            '-'}
                        </p>

                        {enrollment.class && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Clock3 size={13} />
                            {
                              enrollment.class
                                .scheduleDay
                            }{' '}
                            •{' '}
                            {
                              enrollment.class
                                .scheduleStart
                            }{' '}
                            -{' '}
                            {
                              enrollment.class
                                .scheduleEnd
                            }
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          enrollment.status ===
                          'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {enrollment.status ===
                        'ACTIVE'
                          ? 'Aktif'
                          : 'Tidak Aktif'}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarCheck
              size={19}
              className="text-blue-600"
            />

            <div>
              <h2 className="font-semibold text-slate-900">
                Riwayat Kehadiran
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Rekap absensi yang diinput tutor
              </p>
            </div>
          </div>
        </div>

        {data.attendance.length === 0 ? (
          <EmptyState text="Belum ada data kehadiran." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">
                    Tanggal
                  </th>
                  <th className="px-5 py-3">
                    Kelas
                  </th>
                  <th className="px-5 py-3">
                    Mata Pelajaran
                  </th>
                  <th className="px-5 py-3">
                    Status
                  </th>
                  <th className="px-5 py-3">
                    Catatan
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.attendance.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDate(item.date)}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-800">
                        {item.className}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.subject}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceClass(
                            item.status
                          )}`}
                        >
                          {attendanceLabel(
                            item.status
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grades */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen
              size={19}
              className="text-blue-600"
            />

            <div>
              <h2 className="font-semibold text-slate-900">
                Riwayat Nilai
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Nilai yang diberikan tutor
              </p>
            </div>
          </div>
        </div>

        {data.grades.length === 0 ? (
          <EmptyState text="Belum ada nilai yang tercatat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">
                    Mata Pelajaran
                  </th>

                  <th className="px-5 py-3">
                    Penilaian
                  </th>

                  <th className="px-5 py-3 text-center">
                    Nilai
                  </th>

                  <th className="px-5 py-3">
                    Feedback
                  </th>

                  <th className="px-5 py-3">
                    Tanggal
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.grades.map(
                  (grade) => (
                    <tr
                      key={grade.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">
                        {grade.subject}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {grade.assessmentName}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`font-bold ${
                            grade.score >= 85
                              ? 'text-emerald-600'
                              : grade.score >= 70
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {grade.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                        {grade.feedbackNotes ||
                          '-'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(
                          grade.createdAt
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
)
}

function DetailCard({
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
      <div className="flex items-start justify-between">
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
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
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

function EmptyState({
  text,
}: {
  text: string
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}
