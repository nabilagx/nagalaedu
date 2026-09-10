"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  School,
  Search,
  UsersRound,
  X,
} from "lucide-react"

type TutorStudent = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  phone_number: string | null
  status: string | null
  class_count: number
  classes: {
    id: string
    class_name: string
    subject: string
    schedule_day: string | null
    schedule_start: string | null
    schedule_end: string | null
    status: string
  }[]
  attendance_rate: number
  average_score: number | null
  total_grades: number
}

type DashboardData = {
  tutor: {
    id: string
    full_name: string
  }
  summary: {
    total_students: number
    total_classes: number
    active_students: number
  }
  students: TutorStudent[]
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string | null
}) {
  const isActive = status === "ACTIVE"

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {isActive ? "Aktif" : status ?? "Tidak diketahui"}
    </span>
  )
}

function getScoreClass(score: number | null) {
  if (score === null) {
    return "text-slate-400"
  }

  if (score >= 80) {
    return "text-emerald-600"
  }

  if (score >= 70) {
    return "text-amber-600"
  }

  return "text-[#E53935]"
}

function StudentCard({
  student,
}: {
  student: TutorStudent
}) {
  const initial = student.student_name
    .charAt(0)
    .toUpperCase()

  return (
    <Link
      href={`/dashboard/tutor/students/${student.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-sm font-bold text-white">
              {initial}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#111827]">
                {student.student_name}
              </h3>

              <p className="mt-0.5 text-sm text-slate-500">
                {student.grade_level ??
                  "Jenjang belum tersedia"}
              </p>
            </div>
          </div>

          <StatusBadge status={student.status} />
        </div>

        {student.school_name && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <School className="h-4 w-4 shrink-0" />

            <span className="truncate">
              {student.school_name}
            </span>
          </div>
        )}

        {/* CLASS TAGS */}
        {student.classes?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {student.classes.map((item) => (
              <span
                key={item.id}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
              >
                {item.class_name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Kelas
            </p>

            <p className="mt-1 text-lg font-bold text-[#111827]">
              {student.class_count}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Hadir
            </p>

            <p className="mt-1 text-lg font-bold text-[#111827]">
              {student.attendance_rate}%
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Nilai
            </p>

            <p
              className={[
                "mt-1 text-lg font-bold",
                getScoreClass(
                  student.average_score
                ),
              ].join(" ")}
            >
              {student.average_score ?? "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
        <span className="text-sm font-semibold text-[#111827]">
          Lihat detail siswa
        </span>

        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
      </div>
    </Link>
  )
}

export default function TutorStudentsPage() {
  const [data, setData] =
    useState<DashboardData | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  const [search, setSearch] =
    useState("")

  async function fetchStudents(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch(
        "/api/tutor/students",
        {
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengambil data siswa"
        )
      }

      setData(result)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan"
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const summary = data?.summary ?? {
    total_students: 0,
    total_classes: 0,
    active_students: 0,
  }

  const students = data?.students ?? []

  /*
   * SEARCH
   *
   * Bisa mencari berdasarkan:
   * - Nama siswa
   * - Nama kelas
   * - Mata pelajaran
   * - Sekolah
   */
  const filteredStudents = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()

    if (!keyword) {
      return students
    }

    return students.filter((student) => {
      const matchesStudentName =
        student.student_name
          .toLowerCase()
          .includes(keyword)

      const matchesGrade =
        student.grade_level
          ?.toLowerCase()
          .includes(keyword) ?? false

      const matchesSchool =
        student.school_name
          ?.toLowerCase()
          .includes(keyword) ?? false

      const matchesClass =
        student.classes?.some(
          (item) =>
            item.class_name
              .toLowerCase()
              .includes(keyword) ||
            item.subject
              .toLowerCase()
              .includes(keyword)
        ) ?? false

      return (
        matchesStudentName ||
        matchesGrade ||
        matchesSchool ||
        matchesClass
      )
    })
  }, [students, search])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-semibold">
              Gagal memuat siswa
            </p>

            <p className="mt-1">
              {error}
            </p>

            <button
              onClick={() =>
                fetchStudents(true)
              }
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d9322f]"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#E53935]">
              Pembelajaran
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Siswa
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Lihat siswa yang terdaftar di kelas
              Anda dan pantau perkembangan mereka.
            </p>
          </div>

          <button
            onClick={() =>
              fetchStudents(true)
            }
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={[
                "h-4 w-4",
                refreshing
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />

            Refresh
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={
              <UsersRound className="h-5 w-5" />
            }
            label="Total Siswa"
            value={summary.total_students}
            description="Siswa yang terdaftar"
          />

          <SummaryCard
            icon={
              <GraduationCap className="h-5 w-5" />
            }
            label="Siswa Aktif"
            value={summary.active_students}
            description="Siswa dengan status aktif"
          />

          <SummaryCard
            icon={
              <BookOpen className="h-5 w-5" />
            }
            label="Kelas"
            value={summary.total_classes}
            description="Kelas yang Anda ampu"
          />
        </div>

        {/* SEARCH */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari nama siswa, kelas, mata pelajaran, atau sekolah..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-500">
              {search ? (
                <>
                  Menampilkan{" "}
                  <span className="font-semibold text-[#111827]">
                    {filteredStudents.length}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-[#111827]">
                    {students.length}
                  </span>{" "}
                  siswa
                </>
              ) : (
                <>
                  Total{" "}
                  <span className="font-semibold text-[#111827]">
                    {students.length}
                  </span>{" "}
                  siswa
                </>
              )}
            </p>

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="w-fit font-semibold text-[#E53935] hover:underline"
              >
                Reset pencarian
              </button>
            )}
          </div>
        </section>

        {/* STUDENTS */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Daftar Siswa
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Siswa yang mengikuti kelas yang Anda
                ampu.
              </p>
            </div>

            {search && (
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
                {filteredStudents.length} hasil
              </span>
            )}
          </div>

          {students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <UsersRound className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Belum ada siswa
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Belum ada siswa aktif yang terdaftar
                di kelas yang Anda ampu.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Search className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Siswa tidak ditemukan
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Tidak ada siswa yang cocok dengan
                pencarian{" "}
                <span className="font-semibold text-[#111827]">
                  "{search}"
                </span>
                .
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d9322f]"
              >
                <X className="h-4 w-4" />
                Reset pencarian
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map(
                (student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}