import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type AttendanceStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA"

type AttendanceRecordInput = {
  enrollmentId: string
  status: AttendanceStatus
  notes?: string | null
}

type ClassData = {
  id: string
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
}

type EnrollmentData = {
  id: string
  student_id: string
}

type StudentData = {
  id: string
  student_name: string
  grade_level: string
}

type AttendanceRecord = {
  id: string
  enrollment_id: string
  attendance_date: string
  status: AttendanceStatus
  notes: string | null
  updated_at: string
}

const VALID_STATUSES: AttendanceStatus[] = [
  "HADIR",
  "IZIN",
  "SAKIT",
  "ALPHA",
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

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false

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

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    {
      error: message,
      ...extra,
    },
    { status },
  )
}

async function getAuthenticatedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      supabase,
      user: null,
      response: jsonError("Unauthorized", 401),
    }
  }

  return {
    supabase,
    user,
    response: null,
  }
}

async function getOwnedClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  classId: string,
) {
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id,class_name,subject,schedule_day,schedule_start,schedule_end",
    )
    .eq("id", classId)
    .eq("tutor_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as ClassData | null
}

async function getActiveEnrollments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
) {
  const { data, error } = await supabase
    .from("class_enrollments")
    .select("id,student_id")
    .eq("class_id", classId)
    .eq("status", "ACTIVE")

  if (error) {
    throw error
  }

  return (data ?? []) as EnrollmentData[]
}

async function getAllEnrollments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
) {
  const { data, error } = await supabase
    .from("class_enrollments")
    .select("id,student_id")
    .eq("class_id", classId)

  if (error) {
    throw error
  }

  return (data ?? []) as EnrollmentData[]
}

async function getStudents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentIds: string[],
) {
  if (studentIds.length === 0) {
    return [] as StudentData[]
  }

  const { data, error } = await supabase
    .from("students")
    .select("id,student_name,grade_level")
    .in("id", studentIds)

  if (error) {
    throw error
  }

  return (data ?? []) as StudentData[]
}

function buildStudentMap(students: StudentData[]) {
  return new Map(students.map((student) => [student.id, student]))
}

function buildSummary(
  totalStudents: number,
  records: AttendanceRecord[],
) {
  const hadir = records.filter((record) => record.status === "HADIR").length
  const izin = records.filter((record) => record.status === "IZIN").length
  const sakit = records.filter((record) => record.status === "SAKIT").length
  const alpha = records.filter((record) => record.status === "ALPHA").length

  const totalAttendance = records.length

  const attendancePercentage =
    totalStudents > 0
      ? Math.round((hadir / totalStudents) * 100)
      : 0

  return {
    total_students: totalStudents,
    total_attendance: totalAttendance,
    hadir,
    izin,
    sakit,
    alpha,
    attendance_percentage: attendancePercentage,
  }
}

function getWeekday(dateString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${dateString}T12:00:00+07:00`))
}

function sortHistory(
  a: { attendance_date: string },
  b: { attendance_date: string },
) {
  return b.attendance_date.localeCompare(a.attendance_date)
}

async function getHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
) {
  const enrollments = await getAllEnrollments(supabase, classId)
  const enrollmentIds = enrollments.map((item) => item.id)

  if (enrollmentIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("student_attendance")
    .select(
      "id,enrollment_id,attendance_date,status,notes,updated_at",
    )
    .in("enrollment_id", enrollmentIds)

  if (error) {
    throw error
  }

  const records = (data ?? []) as AttendanceRecord[]

  const grouped = new Map<string, AttendanceRecord[]>()

  for (const record of records) {
    const current = grouped.get(record.attendance_date) ?? []
    current.push(record)
    grouped.set(record.attendance_date, current)
  }

  const totalStudents = enrollments.length

  return Array.from(grouped.entries())
    .map(([attendanceDate, dateRecords]) => {
      const summary = buildSummary(totalStudents, dateRecords)

      const lastUpdatedAt =
        dateRecords
          .map((record) => record.updated_at)
          .sort()
          .at(-1) ?? null

      return {
        attendance_date: attendanceDate,
        weekday: getWeekday(attendanceDate),
        total_students: summary.total_students,
        total_attendance: summary.total_attendance,
        hadir: summary.hadir,
        izin: summary.izin,
        sakit: summary.sakit,
        alpha: summary.alpha,
        attendance_percentage: summary.attendance_percentage,
        last_updated_at: lastUpdatedAt,
      }
    })
    .sort(sortHistory)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()

    if (auth.response) {
      return auth.response
    }

    const { supabase, user } = auth

    if (!user) {
      return jsonError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)

    const classId = searchParams.get("classId")
    const date = searchParams.get("date")
    const view = searchParams.get("view")

    /*
     * GET /api/tutor/attendance
     * -> daftar kelas aktif tutor
     */
    if (!classId) {
      const { data: classRows, error: classError } = await supabase
        .from("classes")
        .select(
          "id,class_name,subject,schedule_day,schedule_start,schedule_end",
        )
        .eq("tutor_id", user.id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })

      if (classError) {
        return jsonError(
          classError.message,
          500,
          {
            code: classError.code ?? null,
          },
        )
      }

      const baseClasses = (classRows ?? []) as ClassData[]

      const classes = await Promise.all(
        baseClasses.map(async (classItem) => {
          const { count, error } = await supabase
            .from("class_enrollments")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("class_id", classItem.id)
            .eq("status", "ACTIVE")

          if (error) {
            throw error
          }

          return {
            ...classItem,
            student_count: count ?? 0,
          }
        }),
      )

      return NextResponse.json({
        classes,
      })
    }

    if (!user.id) {
      return jsonError("Unauthorized", 401)
    }

    if (!/^[0-9a-fA-F-]{36}$/.test(classId)) {
      return jsonError("classId tidak valid.", 400)
    }

    const classData = await getOwnedClass(
      supabase,
      user.id,
      classId,
    )

    if (!classData) {
      return jsonError("Kelas tidak ditemukan.", 404)
    }

    /*
     * GET history
     */
    if (view === "history" || !date) {
      const history = await getHistory(supabase, classId)

      const activeEnrollments = await getActiveEnrollments(
        supabase,
        classId,
      )

      return NextResponse.json({
        class: {
          ...classData,
          student_count: activeEnrollments.length,
        },
        history,
      })
    }

    /*
     * GET selected date
     */
    if (!isValidDate(date)) {
      return jsonError("Format tanggal tidak valid.", 400)
    }

    const activeEnrollments = await getActiveEnrollments(
      supabase,
      classId,
    )

    const enrollmentIds = activeEnrollments.map((item) => item.id)

    const students = await getStudents(
      supabase,
      activeEnrollments.map((item) => item.student_id),
    )

    const studentMap = buildStudentMap(students)

    let attendanceRecords: AttendanceRecord[] = []

    if (enrollmentIds.length > 0) {
      const { data, error } = await supabase
        .from("student_attendance")
        .select(
          "id,enrollment_id,attendance_date,status,notes,updated_at",
        )
        .in("enrollment_id", enrollmentIds)
        .eq("attendance_date", date)

      if (error) {
        return jsonError(
          error.message,
          500,
          {
            code: error.code ?? null,
          },
        )
      }

      attendanceRecords = (data ?? []) as AttendanceRecord[]
    }

    const attendanceMap = new Map(
      attendanceRecords.map((record) => [
        record.enrollment_id,
        record,
      ]),
    )

    const attendance = activeEnrollments
      .map((enrollment) => {
        const student = studentMap.get(enrollment.student_id)

        if (!student) {
          return null
        }

        const record = attendanceMap.get(enrollment.id)

        return {
          enrollment_id: enrollment.id,
          student_id: student.id,
          student_name: student.student_name,
          grade_level: student.grade_level,
          status: record?.status ?? null,
          notes: record?.notes ?? "",
        }
      })
      .filter(
        (
          item,
        ): item is {
          enrollment_id: string
          student_id: string
          student_name: string
          grade_level: string
          status: AttendanceStatus | null
          notes: string
        } => item !== null,
      )

    const summary = buildSummary(
      activeEnrollments.length,
      attendanceRecords,
    )

    const lastUpdatedAt =
      attendanceRecords
        .map((record) => record.updated_at)
        .sort()
        .at(-1) ?? null

    return NextResponse.json({
      class: {
        ...classData,
        student_count: activeEnrollments.length,
      },
      attendance,
      summary,
      attendance_meta: {
        is_saved: attendanceRecords.length > 0,
        saved_count: attendanceRecords.length,
        last_updated_at: lastUpdatedAt,
      },
    })
  } catch (error) {
    console.error("GET ATTENDANCE ERROR:", error)

    return jsonError(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memuat absensi.",
      500,
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()

    if (auth.response) {
      return auth.response
    }

    const { supabase, user } = auth

    if (!user) {
      return jsonError("Unauthorized", 401)
    }

    let body: {
      classId?: unknown
      attendanceDate?: unknown
      originalAttendanceDate?: unknown
      records?: unknown
    }

    try {
      body = await request.json()
    } catch {
      return jsonError("Body JSON tidak valid.", 400)
    }

    const classId = body.classId
    const attendanceDate = body.attendanceDate
    const originalAttendanceDate = body.originalAttendanceDate

    if (typeof classId !== "string" || !classId) {
      return jsonError("classId wajib diisi.", 400)
    }

    if (!isValidDate(attendanceDate)) {
      return jsonError("attendanceDate tidak valid.", 400)
    }

    if (attendanceDate > getTodayJakarta()) {
      return jsonError(
        "Tanggal absensi tidak boleh melebihi hari ini.",
        400,
      )
    }

    let originalDate: string | null = null

    if (
      originalAttendanceDate !== null &&
      originalAttendanceDate !== undefined &&
      originalAttendanceDate !== ""
    ) {
      if (!isValidDate(originalAttendanceDate)) {
        return jsonError(
          "originalAttendanceDate tidak valid.",
          400,
        )
      }

      if (originalAttendanceDate > getTodayJakarta()) {
        return jsonError(
          "Tanggal absensi awal tidak valid.",
          400,
        )
      }

      originalDate = originalAttendanceDate
    }

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return jsonError(
        "Minimal satu data absensi harus dikirim.",
        400,
      )
    }

    const rawRecords = body.records as unknown[]

    const records: AttendanceRecordInput[] = []

    const enrollmentIds = new Set<string>()

    for (const raw of rawRecords) {
      if (
        typeof raw !== "object" ||
        raw === null ||
        !("enrollmentId" in raw) ||
        !("status" in raw)
      ) {
        return jsonError(
          "Format records tidak valid.",
          400,
        )
      }

      const enrollmentId =
        typeof raw.enrollmentId === "string"
          ? raw.enrollmentId
          : ""

      const status = raw.status

      if (!enrollmentId) {
        return jsonError(
          "enrollmentId wajib diisi.",
          400,
        )
      }

      if (
        typeof status !== "string" ||
        !VALID_STATUSES.includes(
          status as AttendanceStatus,
        )
      ) {
        return jsonError(
          `Status absensi tidak valid untuk ${enrollmentId}.`,
          400,
        )
      }

      if (enrollmentIds.has(enrollmentId)) {
        return jsonError(
          `Data enrollment ${enrollmentId} duplikat.`,
          400,
        )
      }

      enrollmentIds.add(enrollmentId)

      const notes =
        "notes" in raw &&
        (typeof raw.notes === "string" ||
          raw.notes === null)
          ? raw.notes
          : null

      records.push({
        enrollmentId,
        status: status as AttendanceStatus,
        notes,
      })
    }

    const classData = await getOwnedClass(
      supabase,
      user.id,
      classId,
    )

    if (!classData) {
      return jsonError("Kelas tidak ditemukan.", 404)
    }

    const activeEnrollments = await getActiveEnrollments(
      supabase,
      classId,
    )

    const activeEnrollmentIds = new Set(
      activeEnrollments.map((item) => item.id),
    )

    for (const record of records) {
      if (!activeEnrollmentIds.has(record.enrollmentId)) {
        return jsonError(
          "Terdapat siswa yang bukan bagian dari enrollment aktif kelas ini.",
          400,
        )
      }
    }

    const now = new Date().toISOString()

    /*
     * =========================================================
     * CASE 1:
     * Edit tanggal yang sama / absensi baru
     * =========================================================
     */
    if (!originalDate || originalDate === attendanceDate) {
      const payload = records.map((record) => ({
        enrollment_id: record.enrollmentId,
        attendance_date: attendanceDate,
        status: record.status,
        notes: record.notes ?? null,
        updated_at: now,
      }))

      const { data, error } = await supabase
        .from("student_attendance")
        .upsert(payload, {
          onConflict: "enrollment_id,attendance_date",
        })
        .select("id,updated_at")

      if (error) {
        console.error("SAVE ATTENDANCE ERROR:", error)

        return jsonError(
          error.message,
          500,
          {
            code: error.code ?? null,
            hint: error.hint ?? null,
          },
        )
      }

      const returnedRows = (data ?? []) as {
        id: string
        updated_at: string
      }[]

      return NextResponse.json({
        success: true,
        moved: false,
        savedCount: returnedRows.length,
        lastUpdatedAt: now,
        message: "Absensi berhasil disimpan.",
      })
    }

    /*
     * =========================================================
     * CASE 2:
     * Edit tanggal -> MOVE SESSION
     *
     * Tidak membuat session baru secara terpisah.
     * Data tanggal lama dipindahkan ke tanggal baru.
     * =========================================================
     */

    const allEnrollments = await getAllEnrollments(
      supabase,
      classId,
    )

    const allEnrollmentIds = allEnrollments.map(
      (item) => item.id,
    )

    if (allEnrollmentIds.length === 0) {
      return jsonError(
        "Tidak ada enrollment untuk kelas ini.",
        400,
      )
    }

    const { data: oldData, error: oldError } = await supabase
      .from("student_attendance")
      .select(
        "id,enrollment_id,attendance_date,status,notes,updated_at",
      )
      .in("enrollment_id", allEnrollmentIds)
      .eq("attendance_date", originalDate)

    if (oldError) {
      return jsonError(
        oldError.message,
        500,
        {
          code: oldError.code ?? null,
        },
      )
    }

    const oldRecords = (oldData ?? []) as AttendanceRecord[]

    /*
     * Kalau session lama tidak ditemukan, kita tidak boleh
     * pura-pura melakukan MOVE.
     */
    if (oldRecords.length === 0) {
      return jsonError(
        "Sesi absensi pada tanggal awal tidak ditemukan. Muat ulang riwayat lalu coba lagi.",
        404,
      )
    }

    /*
     * Pastikan tanggal tujuan belum mempunyai data.
     * Kalau sudah ada, jangan digabung.
     */
    const { data: targetData, error: targetError } =
      await supabase
        .from("student_attendance")
        .select(
          "id,enrollment_id,attendance_date,status,notes,updated_at",
        )
        .in("enrollment_id", allEnrollmentIds)
        .eq("attendance_date", attendanceDate)

    if (targetError) {
      return jsonError(
        targetError.message,
        500,
        {
          code: targetError.code ?? null,
        },
      )
    }

    const targetRecords = (targetData ?? []) as AttendanceRecord[]

    if (targetRecords.length > 0) {
      return jsonError(
        "Tanggal tujuan sudah memiliki absensi. Pilih tanggal lain agar data tidak tergabung.",
        409,
      )
    }

    /*
     * Map old rows supaya update menggunakan ID row lama.
     */
    const oldRecordMap = new Map(
      oldRecords.map((record) => [
        record.enrollment_id,
        record,
      ]),
    )

    const submittedIds = new Set(
      records.map((record) => record.enrollmentId),
    )

    /*
     * Update row lama yang masih dikirim.
     *
     * ID tetap sama.
     * Hanya attendance_date/status/notes yang berubah.
     */
    for (const record of records) {
      const oldRecord = oldRecordMap.get(
        record.enrollmentId,
      )

      if (!oldRecord) {
        continue
      }

      const { error: updateError } = await supabase
        .from("student_attendance")
        .update({
          attendance_date: attendanceDate,
          status: record.status,
          notes: record.notes ?? null,
          updated_at: now,
        })
        .eq("id", oldRecord.id)

      if (updateError) {
        console.error(
          "MOVE ATTENDANCE UPDATE ERROR:",
          updateError,
        )

        return jsonError(
          updateError.message,
          500,
          {
            code: updateError.code ?? null,
          },
        )
      }
    }

    /*
     * Kalau ada record baru di draft yang sebelumnya belum ada
     * pada session lama, insert sebagai bagian session baru.
     */
    const newRecords = records.filter(
      (record) => !oldRecordMap.has(record.enrollmentId),
    )

    if (newRecords.length > 0) {
      const insertPayload = newRecords.map((record) => ({
        enrollment_id: record.enrollmentId,
        attendance_date: attendanceDate,
        status: record.status,
        notes: record.notes ?? null,
        updated_at: now,
      }))

      const { error: insertError } = await supabase
        .from("student_attendance")
        .insert(insertPayload)

      if (insertError) {
        console.error(
          "MOVE ATTENDANCE INSERT ERROR:",
          insertError,
        )

        return jsonError(
          insertError.message,
          500,
          {
            code: insertError.code ?? null,
          },
        )
      }
    }

    /*
     * Kalau tutor menghapus status siswa dari draft sebelum save,
     * row lama siswa tersebut ikut dihapus.
     */
    const rowsToDelete = oldRecords.filter(
      (record) => !submittedIds.has(record.enrollment_id),
    )

    for (const record of rowsToDelete) {
      const { error: deleteError } = await supabase
        .from("student_attendance")
        .delete()
        .eq("id", record.id)

      if (deleteError) {
        console.error(
          "MOVE ATTENDANCE DELETE ERROR:",
          deleteError,
        )

        return jsonError(
          deleteError.message,
          500,
          {
            code: deleteError.code ?? null,
          },
        )
      }
    }

    return NextResponse.json({
      success: true,
      moved: true,
      savedCount: records.length,
      lastUpdatedAt: now,
      message:
        "Sesi absensi berhasil dipindahkan ke tanggal baru.",
    })
  } catch (error) {
    console.error("POST ATTENDANCE ERROR:", error)

    return jsonError(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menyimpan absensi.",
      500,
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()

    if (auth.response) {
      return auth.response
    }

    const { supabase, user } = auth

    if (!user) {
      return jsonError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)

    const classId = searchParams.get("classId")
    const attendanceDate = searchParams.get("date")

    if (!classId) {
      return jsonError("classId wajib diisi.", 400)
    }

    if (!attendanceDate || !isValidDate(attendanceDate)) {
      return jsonError("Tanggal absensi tidak valid.", 400)
    }

    const classData = await getOwnedClass(
      supabase,
      user.id,
      classId,
    )

    if (!classData) {
      return jsonError("Kelas tidak ditemukan.", 404)
    }

    /*
     * Gunakan semua enrollment karena history lama
     * bisa berasal dari enrollment yang sudah tidak ACTIVE.
     */
    const enrollments = await getAllEnrollments(
      supabase,
      classId,
    )

    const enrollmentIds = enrollments.map(
      (item) => item.id,
    )

    if (enrollmentIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "Tidak ada enrollment pada kelas ini.",
      })
    }

    /*
     * STEP 1
     * Cari dulu data yang SEHARUSNYA dihapus.
     */
    const { data: existingRows, error: existingError } =
      await supabase
        .from("student_attendance")
        .select("id,enrollment_id,attendance_date")
        .in("enrollment_id", enrollmentIds)
        .eq("attendance_date", attendanceDate)

    if (existingError) {
      console.error(
        "CHECK ATTENDANCE BEFORE DELETE:",
        existingError,
      )

      return jsonError(
        existingError.message,
        500,
        {
          code: existingError.code ?? null,
          hint: existingError.hint ?? null,
        },
      )
    }

    const existingCount = existingRows?.length ?? 0

    /*
     * Kalau 0 di tahap SELECT, berarti masalahnya bukan DELETE.
     * Supabase client memang tidak bisa melihat row tersebut.
     */
    if (existingCount === 0) {
      return jsonError(
        "Data absensi ditemukan di riwayat, tetapi tidak dapat dibaca oleh query DELETE. Periksa RLS SELECT/policy ownership pada student_attendance.",
        409,
        {
          existingCount: 0,
          classId,
          attendanceDate,
        },
      )
    }

    /*
     * STEP 2
     * Hapus row berdasarkan ID yang benar-benar ditemukan.
     */
    const existingIds = existingRows.map(
      (row) => row.id,
    )

    const { error: deleteError } = await supabase
      .from("student_attendance")
      .delete()
      .in("id", existingIds)

    if (deleteError) {
      console.error(
        "DELETE ATTENDANCE ERROR:",
        deleteError,
      )

      return jsonError(
        deleteError.message,
        500,
        {
          code: deleteError.code ?? null,
          hint: deleteError.hint ?? null,
        },
      )
    }

    /*
     * STEP 3
     * Verifikasi ulang setelah DELETE.
     */
    const { data: remainingRows, error: verifyError } =
      await supabase
        .from("student_attendance")
        .select("id")
        .in("id", existingIds)

    if (verifyError) {
      console.error(
        "VERIFY DELETE ERROR:",
        verifyError,
      )

      return jsonError(
        verifyError.message,
        500,
        {
          code: verifyError.code ?? null,
          hint: verifyError.hint ?? null,
        },
      )
    }

    const remainingCount = remainingRows?.length ?? 0
    const deletedCount = existingCount - remainingCount

    /*
     * Kalau masih ada row, DELETE policy kemungkinan
     * tidak mengizinkan penghapusan.
     */
    if (remainingCount > 0) {
      return jsonError(
        "Data absensi ditemukan tetapi tidak berhasil dihapus. Periksa policy DELETE/RLS pada student_attendance.",
        403,
        {
          existingCount,
          remainingCount,
          deletedCount,
        },
      )
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} data absensi berhasil dihapus.`,
    })
  } catch (error) {
    console.error("DELETE ATTENDANCE ERROR:", error)

    return jsonError(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menghapus absensi.",
      500,
    )
  }
}