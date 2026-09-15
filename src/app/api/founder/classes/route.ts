import { NextRequest, NextResponse } from "next/server"

import { requireFounder } from "@/lib/auth/requireFounder"
import { createAdminClient } from "@/lib/supabase/admin"

type ClassStatus = "ACTIVE" | "INACTIVE"

const VALID_DAYS = [
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
  "MINGGU",
] as const

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeNullableString(value: unknown) {
  if (value === null || value === undefined) return null

  const cleaned = cleanString(value)

  return cleaned || null
}

function hasControlChars(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value)
}

function isValidStatus(value: unknown): value is ClassStatus {
  return value === "ACTIVE" || value === "INACTIVE"
}

function isValidDay(value: unknown): value is (typeof VALID_DAYS)[number] {
  return (
    typeof value === "string" &&
    VALID_DAYS.includes(value as (typeof VALID_DAYS)[number])
  )
}

function isValidTime(value: unknown) {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  )
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function isValidUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function getDatabaseErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return String((error as { code?: unknown }).code ?? "")
  }

  return ""
}

function normalizeDbTime(value: string | null) {
  if (!value) return null

  return value.slice(0, 5)
}

export async function GET(request: NextRequest) {
  try {
    await requireFounder()

    const supabase = createAdminClient()

    const tutorsParam = request.nextUrl.searchParams.get("tutors")

    if (tutorsParam === "true") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number")
        .eq("role_id", 2)
        .order("full_name", { ascending: true })

      if (error) {
        console.error("Founder classes tutors GET error:", error)

        return NextResponse.json(
          { error: "Gagal mengambil data tutor." },
          { status: 500 }
        )
      }

      return NextResponse.json({
        tutors: data ?? [],
      })
    }

    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select(
        `
        id,
        tutor_id,
        class_name,
        subject,
        description,
        schedule_day,
        schedule_start,
        schedule_end,
        status,
        created_at,
        updated_at
        `
      )
      .order("class_name", { ascending: true })

    if (classesError) {
      console.error(
        "Founder classes GET error:",
        classesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data kelas." },
        { status: 500 }
      )
    }

    const classItems = classes ?? []

    const tutorIds = [
      ...new Set(
        classItems
          .map((item) => item.tutor_id)
          .filter(Boolean)
      ),
    ]

    const classIds = classItems.map((item) => item.id)

    let tutors: Array<{
      id: string
      full_name: string
      phone_number: string | null
    }> = []

    if (tutorIds.length > 0) {
      const { data: tutorData, error: tutorError } =
        await supabase
          .from("profiles")
          .select("id, full_name, phone_number")
          .in("id", tutorIds)

      if (tutorError) {
        console.error(
          "Founder classes tutor mapping error:",
          tutorError
        )

        return NextResponse.json(
          { error: "Gagal mengambil data tutor kelas." },
          { status: 500 }
        )
      }

      tutors = tutorData ?? []
    }

    let enrollmentRows: Array<{
      class_id: string
      student_id: string
      status: string
    }> = []

    if (classIds.length > 0) {
      const { data, error } = await supabase
        .from("class_enrollments")
        .select("class_id, student_id, status")
        .in("class_id", classIds)
        .eq("status", "ACTIVE")

      if (error) {
        console.error(
          "Founder classes enrollment count error:",
          error
        )

        return NextResponse.json(
          { error: "Gagal mengambil jumlah murid kelas." },
          { status: 500 }
        )
      }

      enrollmentRows = data ?? []
    }

    let moduleRows: Array<{
      class_id: string
    }> = []

    if (classIds.length > 0) {
      const { data, error } = await supabase
        .from("learning_modules")
        .select("class_id")
        .in("class_id", classIds)

      if (error) {
        console.error(
          "Founder classes module count error:",
          error
        )

        return NextResponse.json(
          { error: "Gagal mengambil jumlah modul kelas." },
          { status: 500 }
        )
      }

      moduleRows = data ?? []
    }

    const tutorMap = new Map(
      tutors.map((tutor) => [tutor.id, tutor])
    )

    const studentCountMap = new Map<string, number>()

    for (const enrollment of enrollmentRows) {
      studentCountMap.set(
        enrollment.class_id,
        (studentCountMap.get(enrollment.class_id) ?? 0) + 1
      )
    }

    const moduleCountMap = new Map<string, number>()

    for (const module of moduleRows) {
      moduleCountMap.set(
        module.class_id,
        (moduleCountMap.get(module.class_id) ?? 0) + 1
      )
    }

    const result = classItems.map((item) => {
      const tutor = tutorMap.get(item.tutor_id)

      return {
        ...item,
        schedule_start: normalizeDbTime(item.schedule_start),
        schedule_end: normalizeDbTime(item.schedule_end),

        tutor: tutor
          ? {
              id: tutor.id,
              full_name: tutor.full_name,
              phone_number: tutor.phone_number,
            }
          : null,

        tutors: tutor
          ? {
              full_name: tutor.full_name,
            }
          : null,

        student_count:
          studentCountMap.get(item.id) ?? 0,

        module_count:
          moduleCountMap.get(item.id) ?? 0,
      }
    })

    return NextResponse.json({
      classes: result,
    })
  } catch (error) {
    console.error(
      "Founder classes GET exception:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireFounder()

    const supabase = createAdminClient()

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Format request tidak valid." },
        { status: 400 }
      )
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        { error: "Body request harus berupa object." },
        { status: 400 }
      )
    }

    const className = cleanString(body.className)
    const subject = cleanString(body.subject)
    const description = normalizeNullableString(
      body.description
    )
    const tutorId = cleanString(body.tutorId)
    const scheduleDay = cleanString(body.scheduleDay)
    const scheduleStart = cleanString(body.scheduleStart)
    const scheduleEnd = cleanString(body.scheduleEnd)
    const status = body.status

    if (
      className.length < 2 ||
      className.length > 100 ||
      hasControlChars(className)
    ) {
      return NextResponse.json(
        {
          error:
            "Nama kelas harus 2–100 karakter dan tidak mengandung karakter kontrol.",
        },
        { status: 400 }
      )
    }

    if (
      subject.length < 2 ||
      subject.length > 100 ||
      hasControlChars(subject)
    ) {
      return NextResponse.json(
        {
          error:
            "Mata pelajaran harus 2–100 karakter dan tidak mengandung karakter kontrol.",
        },
        { status: 400 }
      )
    }

    if (
      description &&
      (description.length > 500 ||
        hasControlChars(description))
    ) {
      return NextResponse.json(
        {
          error:
            "Deskripsi maksimal 500 karakter.",
        },
        { status: 400 }
      )
    }

    if (!isValidUUID(tutorId)) {
      return NextResponse.json(
        { error: "Tutor tidak valid." },
        { status: 400 }
      )
    }

    if (!isValidDay(scheduleDay)) {
      return NextResponse.json(
        { error: "Hari jadwal tidak valid." },
        { status: 400 }
      )
    }

    if (
      !isValidTime(scheduleStart) ||
      !isValidTime(scheduleEnd)
    ) {
      return NextResponse.json(
        { error: "Format waktu harus HH:mm." },
        { status: 400 }
      )
    }

    if (
      timeToMinutes(scheduleEnd) <=
      timeToMinutes(scheduleStart)
    ) {
      return NextResponse.json(
        {
          error:
            "Waktu selesai harus lebih besar dari waktu mulai.",
        },
        { status: 400 }
      )
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: "Status kelas tidak valid." },
        { status: 400 }
      )
    }

    const { data: tutor, error: tutorError } =
      await supabase
        .from("profiles")
        .select("id, full_name, phone_number, role_id")
        .eq("id", tutorId)
        .single()

    if (
      tutorError ||
      !tutor ||
      tutor.role_id !== 2
    ) {
      return NextResponse.json(
        { error: "Tutor tidak ditemukan atau bukan tutor." },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Cek konflik jadwal tutor
    // ---------------------------------------------------------

    const { data: tutorClasses, error: tutorClassesError } =
      await supabase
        .from("classes")
        .select(
          `
          id,
          class_name,
          schedule_day,
          schedule_start,
          schedule_end,
          status
          `
        )
        .eq("tutor_id", tutorId)
        .eq("schedule_day", scheduleDay)
        .eq("status", "ACTIVE")

    if (tutorClassesError) {
      console.error(
        "Tutor schedule conflict query error:",
        tutorClassesError
      )

      return NextResponse.json(
        { error: "Gagal memeriksa jadwal tutor." },
        { status: 500 }
      )
    }

    const conflictingTutorClass =
      (tutorClasses ?? []).find((existing) => {
        if (
          !existing.schedule_start ||
          !existing.schedule_end
        ) {
          return false
        }

        const existingStart = timeToMinutes(
          normalizeDbTime(existing.schedule_start) ?? ""
        )

        const existingEnd = timeToMinutes(
          normalizeDbTime(existing.schedule_end) ?? ""
        )

        const newStart = timeToMinutes(scheduleStart)
        const newEnd = timeToMinutes(scheduleEnd)

        return (
          newStart < existingEnd &&
          newEnd > existingStart
        )
      })

    if (conflictingTutorClass) {
      return NextResponse.json(
        {
          error: "Jadwal tutor bentrok.",
          conflict: {
            class_id: conflictingTutorClass.id,
            class_name:
              conflictingTutorClass.class_name,
            day: conflictingTutorClass.schedule_day,
            start: normalizeDbTime(
              conflictingTutorClass.schedule_start
            ),
            end: normalizeDbTime(
              conflictingTutorClass.schedule_end
            ),
          },
        },
        { status: 409 }
      )
    }

    const { data: insertedClass, error: insertError } =
      await supabase
        .from("classes")
        .insert({
          tutor_id: tutorId,
          class_name: className,
          subject,
          description,
          schedule_day: scheduleDay,
          schedule_start: scheduleStart,
          schedule_end: scheduleEnd,
          status,
        })
        .select(
          `
          id,
          tutor_id,
          class_name,
          subject,
          description,
          schedule_day,
          schedule_start,
          schedule_end,
          status,
          created_at,
          updated_at
          `
        )
        .single()

    if (insertError || !insertedClass) {
      console.error(
        "Founder classes POST error:",
        insertError
      )

      const code = getDatabaseErrorCode(insertError)

      if (code === "23503") {
        return NextResponse.json(
          { error: "Tutor tidak valid." },
          { status: 400 }
        )
      }

      if (code === "23505") {
        return NextResponse.json(
          { error: "Data kelas tersebut sudah ada." },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Gagal membuat kelas.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: "Kelas berhasil dibuat.",
        class: {
          ...insertedClass,
          schedule_start: normalizeDbTime(
            insertedClass.schedule_start
          ),
          schedule_end: normalizeDbTime(
            insertedClass.schedule_end
          ),
          tutor: {
            id: tutor.id,
            full_name: tutor.full_name,
            phone_number: tutor.phone_number,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "Founder classes POST exception:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    )
  }
}