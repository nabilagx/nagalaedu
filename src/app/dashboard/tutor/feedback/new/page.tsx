"use client"

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Save,
  UserRound,
  XCircle,
} from "lucide-react"

type EnrollmentOption = {
  enrollment_id: string
  student_id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  student_status: string | null
  class_id: string
  class_name: string
  class_subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
}

type DashboardData = {
  tutor: {
    id: string
    full_name: string
  }

  enrollments: EnrollmentOption[]
}

type Toast = {
  type: "success" | "error"
  message: string
}

export default function NewTutorFeedbackPage() {
  const router = useRouter()

  // =========================================================
  // STATE
  // =========================================================
  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [data, setData] =
    useState<DashboardData | null>(null)

  const [
    enrollmentId,
    setEnrollmentId,
  ] = useState("")

  const [
    assessmentName,
    setAssessmentName,
  ] = useState("")

  const [score, setScore] =
    useState("")

  const [
    feedbackNotes,
    setFeedbackNotes,
  ] = useState("")

  const [toast, setToast] =
    useState<Toast | null>(null)

  // =========================================================
  // LOAD DATA
  // =========================================================
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        const response =
          await fetch(
            "/api/tutor/feedback",
            {
              cache: "no-store",
            }
          )

        const result =
          await response.json()

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Gagal mengambil data siswa"
          )
        }

        setData(result)
      } catch (error) {
        console.error(
          "Load new feedback error:",
          error
        )

        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Gagal mengambil data siswa",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // =========================================================
  // AUTO HIDE TOAST
  // =========================================================
  useEffect(() => {
    if (!toast) {
      return
    }

    const timer =
      window.setTimeout(() => {
        setToast(null)
      }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [toast])

  // =========================================================
  // ENROLLMENTS
  // =========================================================
  const enrollments =
    data?.enrollments ?? []

  // =========================================================
  // GROUP ENROLLMENTS BY CLASS
  // =========================================================
  const groupedClasses =
    useMemo(() => {
      const groups = new Map<
        string,
        {
          class_id: string
          class_name: string
          subject: string
          students: EnrollmentOption[]
        }
      >()

      for (const enrollment of enrollments) {
        const existing =
          groups.get(
            enrollment.class_id
          )

        if (existing) {
          existing.students.push(
            enrollment
          )
        } else {
          groups.set(
            enrollment.class_id,
            {
              class_id:
                enrollment.class_id,

              class_name:
                enrollment.class_name,

              subject:
                enrollment.class_subject,

              students: [
                enrollment,
              ],
            }
          )
        }
      }

      return Array.from(
        groups.values()
      ).sort((a, b) =>
        a.class_name.localeCompare(
          b.class_name
        )
      )
    }, [enrollments])

  // =========================================================
  // SELECTED ENROLLMENT
  // =========================================================
  const selectedEnrollment =
    enrollments.find(
      (item) =>
        item.enrollment_id ===
        enrollmentId
    ) ?? null

  // =========================================================
  // SELECT STUDENT
  // =========================================================
  function handleEnrollmentChange(
    value: string
  ) {
    setEnrollmentId(value)
  }

  // =========================================================
  // SUBMIT
  // =========================================================
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) {
      return
    }

    // -------------------------------------------------------
    // Frontend validation
    // -------------------------------------------------------
    if (!enrollmentId) {
      setToast({
        type: "error",
        message:
          "Silakan pilih siswa terlebih dahulu.",
      })
      return
    }

    if (!assessmentName.trim()) {
      setToast({
        type: "error",
        message:
          "Nama penilaian wajib diisi.",
      })
      return
    }

    const numericScore =
      Number(score)

    if (
      !Number.isFinite(
        numericScore
      )
    ) {
      setToast({
        type: "error",
        message:
          "Nilai harus berupa angka.",
      })
      return
    }

    if (
      numericScore < 0 ||
      numericScore > 100
    ) {
      setToast({
        type: "error",
        message:
          "Nilai harus berada di antara 0 sampai 100.",
      })
      return
    }

    if (!feedbackNotes.trim()) {
      setToast({
        type: "error",
        message:
          "Feedback wajib diisi.",
      })
      return
    }

    try {
      setSaving(true)

      // =====================================================
      // POST
      //
      // Tidak mengirim subject.
      // Backend yang menentukan subject
      // berdasarkan kelas dari enrollment.
      // =====================================================
      const response =
        await fetch(
          "/api/tutor/feedback",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              enrollment_id:
                enrollmentId,

              assessment_name:
                assessmentName.trim(),

              score:
                numericScore,

              feedback_notes:
                feedbackNotes.trim(),
            }),
          }
        )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menyimpan feedback"
        )
      }

      // =====================================================
      // SUCCESS
      // =====================================================
      setToast({
        type: "success",
        message:
          "Feedback berhasil ditambahkan.",
      })

      const createdId =
        result.grade?.id

      if (createdId) {
        window.setTimeout(() => {
          router.push(
            `/dashboard/tutor/feedback/${createdId}`
          )
        }, 700)
      } else {
        window.setTimeout(() => {
          router.push(
            "/dashboard/tutor/feedback"
          )
        }, 700)
      }
    } catch (error) {
      console.error(
        "Create feedback error:",
        error
      )

      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan feedback",
      })
    } finally {
      setSaving(false)
    }
  }

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-[#E53935]" />

          <span className="text-sm font-medium">
            Memuat data siswa...
          </span>
        </div>
      </div>
    )
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ===================================================
            TOAST
        =================================================== */}
        {toast && (
          <div
            className={[
              "fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl",
              toast.type === "success"
                ? "border-emerald-200"
                : "border-red-200",
            ].join(" ")}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E53935]" />
            )}

            <div className="min-w-0 flex-1">
              <p
                className={[
                  "text-sm font-semibold",
                  toast.type === "success"
                    ? "text-emerald-700"
                    : "text-red-700",
                ].join(" ")}
              >
                {toast.type === "success"
                  ? "Berhasil"
                  : "Terjadi Kesalahan"}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup notifikasi"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ===================================================
            HEADER
        =================================================== */}
        <div className="space-y-4">
          <Link
            href="/dashboard/tutor/feedback"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#E53935]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Feedback
          </Link>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E53935]">
              Feedback Siswa
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Tambah Feedback
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Tambahkan hasil penilaian dan
              feedback pembelajaran untuk
              siswa pada kelas yang Anda ajar.
            </p>
          </div>
        </div>

        {/* ===================================================
            NO STUDENTS
        =================================================== */}
        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <UsersRoundIcon />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#111827]">
              Belum ada siswa
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Belum ada siswa aktif yang
              terdaftar pada kelas yang Anda
              ajar. Tambahkan enrollment terlebih
              dahulu sebelum memberikan feedback.
            </p>

            <Link
              href="/dashboard/tutor/classes"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <BookOpen className="h-4 w-4" />
              Lihat Kelas Saya
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* =================================================
                STUDENT SECTION
            ================================================= */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-[#111827]">
                    Siswa
                  </h2>

                  <p className="text-sm text-slate-500">
                    Pilih siswa berdasarkan kelas
                    yang Anda ajar.
                  </p>
                </div>
              </div>

              {/* =================================================
                  GROUPED STUDENT DROPDOWN
              ================================================= */}
              <div className="mt-5">
                <label
                  htmlFor="enrollment"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Siswa
                </label>

                <div className="relative">
                  <select
                    id="enrollment"
                    value={enrollmentId}
                    onChange={(event) =>
                      handleEnrollmentChange(
                        event.target.value
                      )
                    }
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-700 outline-none transition focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">
                      Pilih siswa...
                    </option>

                    {groupedClasses.map(
                      (classGroup) => (
                        <optgroup
                          key={
                            classGroup.class_id
                          }
                          label={`${classGroup.class_name} — ${classGroup.subject}`}
                        >
                          {classGroup.students
                            .sort((a, b) =>
                              a.student_name.localeCompare(
                                b.student_name
                              )
                            )
                            .map(
                              (student) => (
                                <option
                                  key={
                                    student.enrollment_id
                                  }
                                  value={
                                    student.enrollment_id
                                  }
                                >
                                  {
                                    student.student_name
                                  }
                                  {student.grade_level
                                    ? ` — ${student.grade_level}`
                                    : ""}
                                </option>
                              )
                            )}
                        </optgroup>
                      )
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Daftar siswa dikelompokkan
                  berdasarkan kelas.
                </p>
              </div>

              {/* =================================================
                  SELECTED STUDENT
              ================================================= */}
              {selectedEnrollment && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-sm font-bold text-white">
                        {selectedEnrollment.student_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold text-[#111827]">
                          {
                            selectedEnrollment.student_name
                          }
                        </p>

                        <p className="text-sm text-slate-500">
                          {selectedEnrollment.grade_level ||
                            "Kelas belum tersedia"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Kelas
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {
                          selectedEnrollment.class_name
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* =================================================
                ASSESSMENT SECTION
            ================================================= */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-[#111827]">
                    Penilaian
                  </h2>

                  <p className="text-sm text-slate-500">
                    Informasi penilaian akan
                    dikaitkan dengan kelas siswa.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">

                {/* =================================================
                    SUBJECT — AUTO FROM CLASS
                ================================================= */}
                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mata Pelajaran
                  </label>

                  <div className="relative">
                    <input
                      id="subject"
                      type="text"
                      value={
                        selectedEnrollment?.class_subject ??
                        ""
                      }
                      readOnly
                      tabIndex={-1}
                      placeholder="Akan mengikuti kelas"
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 outline-none"
                    />

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Otomatis
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Mata pelajaran mengikuti kelas
                    yang dipilih.
                  </p>
                </div>

                {/* =================================================
                    ASSESSMENT NAME
                ================================================= */}
                <div>
                  <label
                    htmlFor="assessmentName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nama Penilaian
                  </label>

                  <input
                    id="assessmentName"
                    type="text"
                    value={
                      assessmentName
                    }
                    onChange={(event) =>
                      setAssessmentName(
                        event.target.value
                      )
                    }
                    placeholder="Contoh: Ulangan Bab Aljabar"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                  />
                </div>

                {/* =================================================
                    SCORE
                ================================================= */}
                <div>
                  <label
                    htmlFor="score"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nilai
                  </label>

                  <div className="relative">
                    <input
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={score}
                      onChange={(event) =>
                        setScore(
                          event.target.value
                        )
                      }
                      placeholder="0 - 100"
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      / 100
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================
                FEEDBACK SECTION
            ================================================= */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <MessageSquareText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-[#111827]">
                    Feedback Pembelajaran
                  </h2>

                  <p className="text-sm text-slate-500">
                    Berikan catatan perkembangan
                    dan saran untuk siswa.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="feedbackNotes"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Feedback
                </label>

                <textarea
                  id="feedbackNotes"
                  value={
                    feedbackNotes
                  }
                  onChange={(event) =>
                    setFeedbackNotes(
                      event.target.value
                    )
                  }
                  required
                  rows={6}
                  placeholder="Contoh: Pemahaman konsep sudah cukup baik. Perlu lebih banyak latihan pada soal cerita dan ketelitian dalam melakukan perhitungan."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                />

                <div className="mt-2 flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-400">
                    Feedback akan menjadi catatan
                    perkembangan siswa.
                  </p>

                  <span className="shrink-0 text-xs font-medium text-slate-400">
                    {
                      feedbackNotes.length
                    }{" "}
                    karakter
                  </span>
                </div>
              </div>
            </section>

            {/* =================================================
                ACTION
            ================================================= */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/tutor/feedback"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// =============================================================
// ICON
// =============================================================

function UsersRoundIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle
        cx="9"
        cy="7"
        r="4"
      />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}