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
  ClipboardCheck,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react'

type TutorDetail = {
  tutor: {
    id: string
    fullName: string
    phoneNumber: string | null
    status: string
  }

  summary: {
    totalClasses: number
    activeClasses: number
    totalStudents: number

    attendance: {
      hadir: number
      izin: number
      sakit: number
      alpha: number
      percentage: number
    }

    averageScore: number
    totalGrades: number
    totalModules: number
  }

  classes: Array<{
    id: string
    className: string
    subject: string
    description: string | null
    scheduleDay: string
    scheduleStart: string
    scheduleEnd: string
    status: string
    totalStudents: number

    students: Array<{
      id: string
      studentName: string
      gradeLevel: string | null
      schoolName: string | null
      status: string
    }>
  }>

  recentAttendance: Array<{
    id: string
    date: string
    status:
      | 'HADIR'
      | 'IZIN'
      | 'SAKIT'
      | 'ALPHA'
    studentName: string
    className: string
    subject: string
  }>

  recentGrades: Array<{
    id: string
    studentName: string
    subject: string
    assessmentName: string
    score: number
    feedbackNotes: string | null
    createdAt: string
  }>

  modules: Array<{
    id: string
    title: string
    description: string | null
    fileUrl: string | null
    className: string
    subject: string
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

  return (
    labels[status] ?? status
  )
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

function formatTime(
  value: string
) {
  if (!value) {
    return '-'
  }

  return value.slice(0, 5)
}

export default function FounderTutorDetailPage() {
  const [data, setData] =
    useState<TutorDetail | null>(
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
            'ID tutor tidak valid.'
          )
        }

        const response = await fetch(
  `/api/founder/academic/tutors/${id}`,
  {
    cache: 'no-store',
  }
)

        const result =
          await response.json()

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Gagal mengambil detail tutor.'
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
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-5 w-28 rounded bg-slate-200" />

            <div className="mt-5 h-8 w-64 rounded bg-slate-200" />

            <div className="mt-3 h-4 w-80 rounded bg-slate-200" />

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl bg-white"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ClipboardCheck size={22} />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Gagal membuka monitoring tutor
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error ||
              'Data tutor tidak ditemukan.'}
          </p>

          <Link
            href="/dashboard/founder/academic/tutors"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
            Kembali ke Monitoring Tutor
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/founder/academic/tutors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            Monitoring Tutor
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                {data.tutor.fullName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {data.tutor.fullName}
                  </h1>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      data.tutor
                        .status ===
                      'AKTIF'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {data.tutor.status ===
                    'AKTIF'
                      ? 'Aktif'
                      : 'Tidak Aktif'}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {data.tutor.phoneNumber ||
                    'Nomor HP belum tersedia'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard
            title="Kelas"
            value={
              data.summary.totalClasses
            }
            description={`${data.summary.activeClasses} kelas aktif`}
            icon={BookOpen}
          />

          <DetailCard
            title="Siswa"
            value={
              data.summary.totalStudents
            }
            description="Siswa aktif yang ditangani"
            icon={Users}
          />

          <DetailCard
            title="Kehadiran"
            value={`${data.summary.attendance.percentage}%`}
            description={`${data.summary.attendance.hadir} kali hadir`}
            icon={CalendarCheck}
            danger={
              data.summary.attendance
                .percentage < 80
            }
          />

          <DetailCard
            title="Rata-rata Nilai"
            value={
              data.summary.averageScore
            }
            description={`${data.summary.totalGrades} penilaian tercatat`}
            icon={GraduationCap}
            danger={
              data.summary.averageScore <
              75
            }
          />
        </div>

        {/* ATTENDANCE BREAKDOWN */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Rekap Kehadiran Siswa
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Ringkasan kehadiran siswa
              pada kelas tutor.
            </p>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
            <AttendanceSummary
              label="Hadir"
              value={
                data.summary.attendance
                  .hadir
              }
              className="text-emerald-600"
            />

            <AttendanceSummary
              label="Izin"
              value={
                data.summary.attendance
                  .izin
              }
              className="text-amber-600"
            />

            <AttendanceSummary
              label="Sakit"
              value={
                data.summary.attendance
                  .sakit
              }
              className="text-amber-600"
            />

            <AttendanceSummary
              label="Alpha"
              value={
                data.summary.attendance
                  .alpha
              }
              className="text-red-600"
            />
          </div>
        </section>

        {/* CLASSES */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Kelas yang Diampu
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Daftar kelas yang menjadi
              tanggung jawab tutor.
            </p>
          </div>

          {data.classes.length ===
          0 ? (
            <EmptySection text="Tutor belum memiliki kelas." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.classes.map(
                (classItem) => (
                  <div
                    key={classItem.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {
                              classItem.className
                            }
                          </h3>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {
                              classItem.subject
                            }
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              classItem.status ===
                              'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {classItem.status ===
                            'ACTIVE'
                              ? 'Aktif'
                              : 'Tidak Aktif'}
                          </span>
                        </div>

                        {classItem
                          .description && (
                          <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            {
                              classItem.description
                            }
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                          <span>
                            Jadwal:{' '}
                            {
                              classItem.scheduleDay
                            }
                          </span>

                          <span>
                            {formatTime(
                              classItem.scheduleStart
                            )}{' '}
                            -
                            {' '}
                            {formatTime(
                              classItem.scheduleEnd
                            )}
                          </span>

                          <span>
                            {
                              classItem.totalStudents
                            }{' '}
                            siswa
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                        <p className="text-xs text-slate-400">
                          Siswa aktif
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {
                            classItem.totalStudents
                          }
                        </p>
                      </div>
                    </div>

                    {classItem.students
                      .length >
                      0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {classItem.students.map(
                          (
                            student
                          ) => (
                            <span
                              key={
                                student.id
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                            >
                              {
                                student.studentName
                              }
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* TWO COLUMN */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* RECENT ATTENDANCE */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Aktivitas Kehadiran
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Data kehadiran terbaru.
              </p>
            </div>

            {data.recentAttendance
              .length === 0 ? (
              <EmptySection text="Belum ada data kehadiran." />
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                {data.recentAttendance.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {
                              item.studentName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {
                              item.className
                            }{' '}
                            ·{' '}
                            {
                              item.subject
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              item.date
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${attendanceClass(
                            item.status
                          )}`}
                        >
                          {attendanceLabel(
                            item.status
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* RECENT GRADES */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Aktivitas Penilaian
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Nilai yang baru dicatat
                tutor.
              </p>
            </div>

            {data.recentGrades
              .length === 0 ? (
              <EmptySection text="Belum ada data penilaian." />
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                {data.recentGrades.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {
                              item.studentName
                            }
                          </p>

                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {
                              item.assessmentName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {
                              item.subject
                            }{' '}
                            ·{' '}
                            {formatDate(
                              item.createdAt
                            )}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl px-3 py-2 text-center ${
                            item.score >=
                            75
                              ? 'bg-emerald-50'
                              : 'bg-amber-50'
                          }`}
                        >
                          <p
                            className={`text-lg font-bold ${
                              item.score >=
                              75
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {
                              item.score
                            }
                          </p>

                          <p className="text-[10px] text-slate-400">
                            nilai
                          </p>
                        </div>
                      </div>

                      {item.feedbackNotes && (
                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                          {
                            item.feedbackNotes
                          }
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        {/* MODULES */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Modul Pembelajaran
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Modul yang dibuat tutor.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText size={18} />
              </div>
            </div>
          </div>

          {data.modules.length ===
          0 ? (
            <EmptySection text="Tutor belum membuat modul pembelajaran." />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
              {data.modules.map(
                (module) => (
                  <div
                    key={module.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText
                          size={18}
                        />
                      </div>

                      {module.fileUrl && (
                        <a
                          href={
                            module.fileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Buka
                        </a>
                      )}
                    </div>

                    <h3 className="mt-4 font-semibold text-slate-800">
                      {module.title}
                    </h3>

                    <p className="mt-1 text-xs font-medium text-blue-600">
                      {module.className}{' '}
                      ·{' '}
                      {module.subject}
                    </p>

                    {module.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-500">
                        {
                          module.description
                        }
                      </p>
                    )}

                    <p className="mt-4 text-xs text-slate-400">
                      Dibuat{' '}
                      {formatDate(
                        module.createdAt
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Monitoring Founder
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Halaman ini bersifat
                monitoring. Data
                kehadiran, nilai,
                feedback, dan modul
                dicatat oleh Tutor melalui
                fitur akademik masing-masing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger
                ? 'text-amber-600'
                : 'text-slate-900'
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            danger
              ? 'bg-amber-50 text-amber-600'
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

function AttendanceSummary({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="p-5 text-center">
      <p
        className={`text-2xl font-bold ${className}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-400">
        {label}
      </p>
    </div>
  )
}

function EmptySection({
  text,
}: {
  text: string
}) {
  return (
    <div className="px-5 py-12 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}
