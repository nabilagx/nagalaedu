"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
  UsersRound,
  XCircle,
} from "lucide-react"

type AttendanceClass = {
  id: string
  class_name: string
  subject: string
}

type AttendanceStudent = {
  student_id: string
  student_name: string
  classes?: AttendanceClass[]
  total_attendance: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_percentage: number
}

type AttendanceClassSummary = {
  id: string
  class_name: string
  subject: string
  student_count: number
  total_attendance: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_percentage: number
}

type AttendanceData = {
  summary: {
    total_students: number
    total_attendance: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendance_percentage: number
  }
  classes: AttendanceClassSummary[]
  students: AttendanceStudent[]
}

export default function TutorAttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [selectedClass, setSelectedClass] = useState("ALL")

  async function loadAttendance(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch("/api/tutor/attendance", {
        method: "GET",
        cache: "no-store",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memuat data kehadiran."
        )
      }

      setData(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [])

  const filteredStudents = useMemo(() => {
    if (!data) return []

    const keyword = search.trim().toLowerCase()

    return data.students.filter((student) => {
      const classes = student.classes ?? []

      const matchesSearch =
        !keyword ||
        student.student_name.toLowerCase().includes(keyword) ||
        classes.some(
          (item) =>
            item.class_name.toLowerCase().includes(keyword) ||
            item.subject.toLowerCase().includes(keyword)
        )

      const matchesClass =
        selectedClass === "ALL" ||
        classes.some((item) => item.id === selectedClass)

      return matchesSearch && matchesClass
    })
  }, [data, search, selectedClass])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat data kehadiran...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-800">
                  Gagal memuat kehadiran
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => loadAttendance()}
                  className="mt-4 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#E53935]" />

              <span className="text-sm font-semibold uppercase tracking-wider text-[#E53935]">
                Kehadiran
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Kehadiran Siswa
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Pantau kehadiran siswa dari kelas yang Anda ajar.
            </p>
          </div>

          <button
  type="button"
  onClick={() => loadAttendance(true)}
  disabled={refreshing}
  className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
>
  <RefreshCw
    className={`h-4 w-4 ${
      refreshing ? "animate-spin" : ""
    }`}
  />

  {refreshing ? "Memuat..." : "Refresh"}
</button>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Siswa"
            value={data.summary.total_students}
          />

          <SummaryCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Total Presensi"
            value={data.summary.total_attendance}
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Hadir"
            value={data.summary.hadir}
            iconClass="text-emerald-600"
          />

          <SummaryCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Izin"
            value={data.summary.izin}
            iconClass="text-amber-600"
          />

          <SummaryCard
            icon={<XCircle className="h-5 w-5" />}
            label="Alpha"
            value={data.summary.alpha}
            iconClass="text-red-600"
          />
        </div>

        {/* ATTENDANCE RATE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Persentase Kehadiran
              </p>

              <p className="mt-1 text-2xl font-bold text-[#111827]">
                {data.summary.attendance_percentage}%
              </p>
            </div>

            <div className="w-full sm:w-72">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#E53935] transition-all"
                  style={{
                    width: `${Math.min(
                      data.summary.attendance_percentage,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama murid..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="lg:w-72">
              <select
                value={selectedClass}
                onChange={(event) =>
                  setSelectedClass(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-[#111827] outline-none transition focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
              >
                <option value="ALL">
                  Semua Kelas
                </option>

                {data.classes.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.class_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(search || selectedClass !== "ALL") && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-[#111827]">
                  {filteredStudents.length}
                </span>{" "}
                siswa
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setSelectedClass("ALL")
                }}
                className="text-xs font-semibold text-[#E53935] hover:underline"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>

        {/* STUDENT LIST */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Daftar Siswa
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Pilih siswa untuk melihat detail kehadiran.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredStudents.length} siswa
            </span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Search className="h-6 w-6 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-[#111827]">
                Siswa tidak ditemukan
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Coba gunakan nama siswa yang berbeda atau ubah
                filter kelas.
              </p>

              {(search || selectedClass !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                    setSelectedClass("ALL")
                  }}
                  className="mt-4 text-sm font-semibold text-[#E53935] hover:underline"
                >
                  Reset pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredStudents.map((student, index) => {
                const classes = student.classes ?? []

                return (
                  <Link
                  key={`${student.student_id ?? "student"}-${index}`}
                    href={`/dashboard/tutor/attendance/${student.student_id}`}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                          <UserCheck className="h-6 w-6" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-bold text-[#111827] group-hover:text-[#E53935]">
                            {student.student_name}
                          </h3>

                          {classes.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {classes.map((item) => (
                                <span
                                  key={item.id}
                                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                                >
                                  {item.class_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400">
                              Belum ada kelas
                            </p>
                          )}
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#E53935]" />
                      </div>

                      {/* ATTENDANCE STATS */}
                      <div className="mt-5 grid grid-cols-4 divide-x divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
                        <AttendanceStat
                          label="Hadir"
                          value={student.hadir}
                          className="text-emerald-600"
                        />

                        <AttendanceStat
                          label="Izin"
                          value={student.izin}
                          className="text-amber-600"
                        />

                        <AttendanceStat
                          label="Sakit"
                          value={student.sakit}
                          className="text-blue-600"
                        />

                        <AttendanceStat
                          label="Alpha"
                          value={student.alpha}
                          className="text-red-600"
                        />
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
                      <span className="text-xs font-medium text-slate-500">
                        Tingkat kehadiran
                      </span>

                      <span
                        className={`text-sm font-bold ${
                          student.attendance_percentage >= 80
                            ? "text-emerald-600"
                            : student.attendance_percentage >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {student.attendance_percentage}%
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* CLASS OVERVIEW */}
        {data.classes.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Ringkasan Per Kelas
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Rekap kehadiran berdasarkan kelas yang Anda ajar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.classes.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                        <CalendarCheck className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-[#111827]">
                          {item.class_name}
                        </h3>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {item.subject}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MiniClassStat
                        label="Siswa"
                        value={item.student_count}
                      />

                      <MiniClassStat
                        label="Hadir"
                        value={item.hadir}
                        valueClass="text-emerald-600"
                      />

                      <MiniClassStat
                        label="Izin"
                        value={item.izin}
                        valueClass="text-amber-600"
                      />

                      <MiniClassStat
                        label="Alpha"
                        value={item.alpha}
                        valueClass="text-red-600"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Persentase kehadiran
                      </span>

                      <span className="text-sm font-bold text-[#111827]">
                        {item.attendance_percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NOTE */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Catatan data kehadiran
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Sistem saat ini merekap status kehadiran yang
                tersimpan. Karena tabel attendance belum memiliki
                tanggal atau sesi pertemuan, halaman ini belum
                menampilkan riwayat berdasarkan tanggal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  iconClass = "text-[#111827]",
}: {
  icon: React.ReactNode
  label: string
  value: number
  iconClass?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-0.5 text-xl font-bold text-[#111827]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function AttendanceStat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="min-w-0 px-2 py-3 text-center">
      <p className={`text-base font-bold ${className}`}>
        {value}
      </p>

      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  )
}

function MiniClassStat({
  label,
  value,
  valueClass = "text-[#111827]",
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className={`mt-1 text-lg font-bold ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}