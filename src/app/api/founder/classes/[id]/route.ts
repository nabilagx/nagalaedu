import { NextResponse } from "next/server"

import { requireFounder } from "@/lib/auth/requireFounder"
import { createAdminClient } from "@/lib/supabase/admin"

type Params = {
  params: Promise<{
    id: string
  }>
}

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
  if (value === null || value === undefined) {
    return null
  }

  const cleaned = cleanString(value)
  return cleaned || null
}

function hasControlChars(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value)
}

function isValidStatus(value: unknown): value is ClassStatus {
  return value === "ACTIVE" || value === "INACTIVE"
}

function isValidDay(
  value: unknown
): value is (typeof VALID_DAYS)[number] {
  return (
    typeof value === "string" &&
    VALID_DAYS.includes(value as (typeof VALID_DAYS)[number])
  )
}

/**
 * Type guard:
 * setelah lolos fungsi ini, TypeScript tahu value adalah string.
 */
function isValidTime(value: unknown): value is string {
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

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
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
    return String(
      (error as { code?: unknown }).code ?? ""
    )
  }

  return ""
}

/**
 * Supabase/Postgres TIME kadang dikembalikan sebagai:
 * "13:00:00"
 *
 * Frontend cukup membutuhkan:
 * "13:00"
 */
function normalizeDbTime(value: string | null) {
  if (!value) {
    return null
  }

  return value.slice(0, 5)
}

/**
 * Cek apakah dua interval waktu saling overlap.
 *
 * Contoh:
 * 13:00–14:30
 * 14:30–16:00
 *
 * Tidak dianggap bentrok karena hanya bersentuhan di endpoint.
 */
function isTimeOverlap(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
) {
  const newStartMinutes = timeToMinutes(newStart)
  const newEndMinutes = timeToMinutes(newEnd)

  const existingStartMinutes =
    timeToMinutes(existingStart)

  const existingEndMinutes =
    timeToMinutes(existingEnd)

  return (
    newStartMinutes < existingEndMinutes &&
    newEndMinutes > existingStartMinutes
  )
}

export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    await requireFounder()

    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: "ID kelas tidak valid.",
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // ---------------------------------------------------------
    // Parse request body
    // ---------------------------------------------------------

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: "Format request tidak valid.",
        },
        { status: 400 }
      )
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        {
          error: "Body request harus berupa object.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Ambil data kelas yang sedang diedit
    // ---------------------------------------------------------

    const {
      data: existingClass,
      error: existingError,
    } = await supabase
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
        status
        `
      )
      .eq("id", id)
      .single()

    if (existingError || !existingClass) {
      return NextResponse.json(
        {
          error: "Kelas tidak ditemukan.",
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Normalisasi data
    // ---------------------------------------------------------

    const className =
      body.className !== undefined
        ? cleanString(body.className)
        : existingClass.class_name

    const subject =
      body.subject !== undefined
        ? cleanString(body.subject)
        : existingClass.subject

    const description =
      body.description !== undefined
        ? normalizeNullableString(body.description)
        : existingClass.description

    const tutorId =
      body.tutorId !== undefined
        ? cleanString(body.tutorId)
        : existingClass.tutor_id

    const scheduleDay =
      body.scheduleDay !== undefined
        ? cleanString(body.scheduleDay)
        : existingClass.schedule_day

    const scheduleStart =
      body.scheduleStart !== undefined
        ? cleanString(body.scheduleStart)
        : normalizeDbTime(existingClass.schedule_start)

    const scheduleEnd =
      body.scheduleEnd !== undefined
        ? cleanString(body.scheduleEnd)
        : normalizeDbTime(existingClass.schedule_end)

    const status =
      body.status !== undefined
        ? body.status
        : existingClass.status

    // ---------------------------------------------------------
    // Validasi nama kelas
    // ---------------------------------------------------------

    if (
      className.length < 2 ||
      className.length > 100 ||
      hasControlChars(className)
    ) {
      return NextResponse.json(
        {
          error: "Nama kelas harus 2–100 karakter.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi subject
    // ---------------------------------------------------------

    if (
      subject.length < 2 ||
      subject.length > 100 ||
      hasControlChars(subject)
    ) {
      return NextResponse.json(
        {
          error: "Mata pelajaran harus 2–100 karakter.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi description
    // ---------------------------------------------------------

    if (
      description &&
      (
        description.length > 500 ||
        hasControlChars(description)
      )
    ) {
      return NextResponse.json(
        {
          error: "Deskripsi maksimal 500 karakter.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi tutor
    // ---------------------------------------------------------

    if (!isValidUUID(tutorId)) {
      return NextResponse.json(
        {
          error: "Tutor tidak valid.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi hari
    // ---------------------------------------------------------

    if (!isValidDay(scheduleDay)) {
      return NextResponse.json(
        {
          error: "Hari jadwal tidak valid.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi waktu
    //
    // isValidTime adalah type guard sehingga setelah blok ini:
    // scheduleStart dan scheduleEnd dipastikan string.
    // ---------------------------------------------------------

    if (
      !isValidTime(scheduleStart) ||
      !isValidTime(scheduleEnd)
    ) {
      return NextResponse.json(
        {
          error: "Format waktu harus HH:mm.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi urutan waktu
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // Validasi status
    // ---------------------------------------------------------

    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          error: "Status kelas tidak valid.",
        },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi tutor benar-benar role Tutor
    // ---------------------------------------------------------

    const {
      data: tutor,
      error: tutorError,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name, phone_number, role_id"
      )
      .eq("id", tutorId)
      .single()

    if (
      tutorError ||
      !tutor ||
      tutor.role_id !== 2
    ) {
      return NextResponse.json(
        {
          error:
            "Tutor tidak ditemukan atau bukan tutor.",
        },
        { status: 400 }
      )
    }

    // =========================================================
    // CEK KONFLIK JADWAL TUTOR
    // =========================================================

    if (status === "ACTIVE") {
      const {
        data: tutorClasses,
        error: tutorClassesError,
      } = await supabase
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
        .neq("id", id)

      if (tutorClassesError) {
        console.error(
          "Tutor schedule PATCH conflict error:",
          tutorClassesError
        )

        return NextResponse.json(
          {
            error:
              "Gagal memeriksa jadwal tutor.",
          },
          { status: 500 }
        )
      }

      const tutorConflict =
        (tutorClasses ?? []).find(
          (existing) => {
            const existingStart =
              normalizeDbTime(
                existing.schedule_start
              )

            const existingEnd =
              normalizeDbTime(
                existing.schedule_end
              )

            if (
              !existingStart ||
              !existingEnd
            ) {
              return false
            }

            return isTimeOverlap(
              scheduleStart,
              scheduleEnd,
              existingStart,
              existingEnd
            )
          }
        )

      if (tutorConflict) {
        return NextResponse.json(
          {
            error: "Jadwal tutor bentrok.",
            conflict: {
              class_id: tutorConflict.id,
              class_name:
                tutorConflict.class_name,
              day:
                tutorConflict.schedule_day,
              start: normalizeDbTime(
                tutorConflict.schedule_start
              ),
              end: normalizeDbTime(
                tutorConflict.schedule_end
              ),
            },
          },
          { status: 409 }
        )
      }
    }

    // =========================================================
    // CEK KONFLIK MURID
    //
    // Dilakukan jika jadwal kelas berubah.
    //
    // Contoh:
    // Kelas A awalnya Senin 13:00–14:00
    // Kelas B Senin 14:00–15:00
    //
    // Mengubah A menjadi 13:30–14:30 akan ditolak
    // jika ada murid yang terdaftar di A dan B.
    // =========================================================

    const scheduleChanged =
      normalizeDbTime(
        existingClass.schedule_start
      ) !== scheduleStart ||
      normalizeDbTime(
        existingClass.schedule_end
      ) !== scheduleEnd ||
      existingClass.schedule_day !== scheduleDay

    if (
      scheduleChanged &&
      status === "ACTIVE"
    ) {
      // -------------------------------------------------------
      // Ambil murid aktif di kelas ini
      // -------------------------------------------------------

      const {
        data: enrollments,
        error: enrollmentError,
      } = await supabase
        .from("class_enrollments")
        .select("student_id")
        .eq("class_id", id)
        .eq("status", "ACTIVE")

      if (enrollmentError) {
        console.error(
          "Class student schedule query error:",
          enrollmentError
        )

        return NextResponse.json(
          {
            error:
              "Gagal memeriksa jadwal murid.",
          },
          { status: 500 }
        )
      }

      const studentIds = [
        ...new Set(
          (enrollments ?? []).map(
            (item) => item.student_id
          )
        ),
      ]

      // -------------------------------------------------------
      // Kalau kelas belum punya murid, tidak perlu cek
      // -------------------------------------------------------

      if (studentIds.length > 0) {
        // -----------------------------------------------------
        // Cari enrollment aktif murid-murid tersebut
        // di kelas lain
        // -----------------------------------------------------

        const {
          data: otherEnrollments,
          error: otherError,
        } = await supabase
          .from("class_enrollments")
          .select(
            `
            id,
            student_id,
            class_id,
            status
            `
          )
          .in("student_id", studentIds)
          .eq("status", "ACTIVE")
          .neq("class_id", id)

        if (otherError) {
          console.error(
            "Other student enrollments query error:",
            otherError
          )

          return NextResponse.json(
            {
              error:
                "Gagal memeriksa jadwal murid.",
            },
            { status: 500 }
          )
        }

        // -----------------------------------------------------
        // Ambil ID kelas lain
        // -----------------------------------------------------

        const otherClassIds = [
          ...new Set(
            (otherEnrollments ?? []).map(
              (item) => item.class_id
            )
          ),
        ]

        if (otherClassIds.length > 0) {
          // ---------------------------------------------------
          // Ambil jadwal kelas lain
          // ---------------------------------------------------

          const {
            data: otherClasses,
            error: classesError,
          } = await supabase
            .from("classes")
            .select(
              `
              id,
              class_name,
              schedule_day,
              schedule_start,
              schedule_end
              `
            )
            .in("id", otherClassIds)
            .eq("status", "ACTIVE")

          if (classesError) {
            console.error(
              "Other student classes query error:",
              classesError
            )

            return NextResponse.json(
              {
                error:
                  "Gagal memeriksa jadwal murid.",
              },
              { status: 500 }
            )
          }

          const classMap = new Map(
            (otherClasses ?? []).map(
              (item) => [item.id, item]
            )
          )

          // ---------------------------------------------------
          // Cek satu per satu enrollment
          // ---------------------------------------------------

          for (
            const enrollment of
              otherEnrollments ?? []
          ) {
            const otherClass =
              classMap.get(
                enrollment.class_id
              )

            if (
              !otherClass ||
              otherClass.schedule_day !==
                scheduleDay
            ) {
              continue
            }

            const existingStart =
              normalizeDbTime(
                otherClass.schedule_start
              )

            const existingEnd =
              normalizeDbTime(
                otherClass.schedule_end
              )

            if (
              !existingStart ||
              !existingEnd
            ) {
              continue
            }

            const overlap =
              isTimeOverlap(
                scheduleStart,
                scheduleEnd,
                existingStart,
                existingEnd
              )

            if (overlap) {
              return NextResponse.json(
                {
                  error:
                    "Perubahan jadwal menyebabkan konflik dengan jadwal murid.",
                  conflict: {
                    class_id:
                      otherClass.id,
                    class_name:
                      otherClass.class_name,
                    day:
                      otherClass.schedule_day,
                    start:
                      existingStart,
                    end:
                      existingEnd,
                    student_id:
                      enrollment.student_id,
                  },
                },
                { status: 409 }
              )
            }
          }
        }
      }
    }

    // =========================================================
    // UPDATE CLASS
    // =========================================================

    const {
      data: updatedClass,
      error: updateError,
    } = await supabase
      .from("classes")
      .update({
        tutor_id: tutorId,
        class_name: className,
        subject,
        description,
        schedule_day: scheduleDay,
        schedule_start: scheduleStart,
        schedule_end: scheduleEnd,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
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

    if (
      updateError ||
      !updatedClass
    ) {
      console.error(
        "Founder class PATCH error:",
        updateError
      )

      const code =
        getDatabaseErrorCode(
          updateError
        )

      if (code === "23503") {
        return NextResponse.json(
          {
            error: "Tutor tidak valid.",
          },
          { status: 400 }
        )
      }

      if (code === "23505") {
        return NextResponse.json(
          {
            error:
              "Data kelas tersebut sudah ada.",
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "Gagal memperbarui kelas.",
        },
        { status: 500 }
      )
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json({
      message:
        "Kelas berhasil diperbarui.",

      class: {
        ...updatedClass,

        schedule_start:
          normalizeDbTime(
            updatedClass.schedule_start
          ),

        schedule_end:
          normalizeDbTime(
            updatedClass.schedule_end
          ),

        tutor: {
          id: tutor.id,
          full_name:
            tutor.full_name,
          phone_number:
            tutor.phone_number,
        },
      },
    })
  } catch (error) {
    console.error(
      "Founder class PATCH exception:",
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

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    await requireFounder()

    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: "ID kelas tidak valid.",
        },
        { status: 400 }
      )
    }

    const supabase =
      createAdminClient()

    // ---------------------------------------------------------
    // Pastikan kelas ada
    // ---------------------------------------------------------

    const {
      data: existingClass,
      error: classError,
    } = await supabase
      .from("classes")
      .select(
        "id, class_name"
      )
      .eq("id", id)
      .single()

    if (
      classError ||
      !existingClass
    ) {
      return NextResponse.json(
        {
          error: "Kelas tidak ditemukan.",
        },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Delete
    // ---------------------------------------------------------

    const {
      error: deleteError,
    } = await supabase
      .from("classes")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error(
        "Founder class DELETE error:",
        deleteError
      )

      const code =
        getDatabaseErrorCode(
          deleteError
        )

      if (code === "23503") {
        return NextResponse.json(
          {
            error:
              "Kelas tidak dapat dihapus karena masih memiliki data terkait. Nonaktifkan kelas jika masih memiliki riwayat.",
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Gagal menghapus kelas.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message:
        "Kelas berhasil dihapus.",
    })
  } catch (error) {
    console.error(
      "Founder class DELETE exception:",
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