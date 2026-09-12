import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type ClassStatus = 'ACTIVE' | 'INACTIVE'

const VALID_DAYS = [
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
  'MINGGU',
] as const

function cleanString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeNullableString(
  value: unknown
): string | null {
  const cleaned = cleanString(value)
  return cleaned ? cleaned : null
}

function hasControlChars(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value)
}

function isValidStatus(
  value: unknown
): value is ClassStatus {
  return value === 'ACTIVE' || value === 'INACTIVE'
}

function isValidDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    VALID_DAYS.includes(
      value as (typeof VALID_DAYS)[number]
    )
  )
}

function isValidTime(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  )
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function getDatabaseErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code ===
      'string'
  ) {
    return (error as { code: string }).code
  }

  return null
}

// ==========================================
// PATCH
// ==========================================

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } = await context.params

    // ==========================================
    // VALIDASI ID
    // ==========================================

    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: 'ID kelas tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // PARSE BODY
    // ==========================================

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: 'Format JSON tidak valid.',
        },
        { status: 400 }
      )
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        {
          error: 'Data request tidak valid.',
        },
        { status: 400 }
      )
    }

    const className = cleanString(
      body.className
    )

    const subject = cleanString(
      body.subject
    )

    const description =
      normalizeNullableString(
        body.description
      )

    const tutorId =
      normalizeNullableString(
        body.tutorId
      )

    const scheduleDay =
      cleanString(body.scheduleDay)

    const scheduleStart =
      cleanString(body.scheduleStart)

    const scheduleEnd =
      cleanString(body.scheduleEnd)

    // ==========================================
    // STATUS STRICT
    // ==========================================

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        {
          error: 'Status kelas tidak valid.',
        },
        { status: 400 }
      )
    }

    const status = body.status

    // ==========================================
    // VALIDASI NAMA
    // ==========================================

    if (!className) {
      return NextResponse.json(
        {
          error: 'Nama kelas wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (className.length < 2) {
      return NextResponse.json(
        {
          error:
            'Nama kelas minimal 2 karakter.',
        },
        { status: 400 }
      )
    }

    if (className.length > 100) {
      return NextResponse.json(
        {
          error:
            'Nama kelas maksimal 100 karakter.',
        },
        { status: 400 }
      )
    }

    if (hasControlChars(className)) {
      return NextResponse.json(
        {
          error:
            'Nama kelas mengandung karakter tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI SUBJECT
    // ==========================================

    if (!subject) {
      return NextResponse.json(
        {
          error:
            'Mata pelajaran wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (subject.length < 2) {
      return NextResponse.json(
        {
          error:
            'Mata pelajaran minimal 2 karakter.',
        },
        { status: 400 }
      )
    }

    if (subject.length > 100) {
      return NextResponse.json(
        {
          error:
            'Mata pelajaran maksimal 100 karakter.',
        },
        { status: 400 }
      )
    }

    if (hasControlChars(subject)) {
      return NextResponse.json(
        {
          error:
            'Mata pelajaran mengandung karakter tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI DESCRIPTION
    // ==========================================

    if (
      description !== null &&
      description.length > 500
    ) {
      return NextResponse.json(
        {
          error:
            'Deskripsi maksimal 500 karakter.',
        },
        { status: 400 }
      )
    }

    if (
      description !== null &&
      hasControlChars(description)
    ) {
      return NextResponse.json(
        {
          error:
            'Deskripsi mengandung karakter tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI TUTOR
    // ==========================================

    if (!tutorId) {
      return NextResponse.json(
        {
          error: 'Tutor wajib dipilih.',
        },
        { status: 400 }
      )
    }

    if (!isValidUUID(tutorId)) {
      return NextResponse.json(
        {
          error: 'ID tutor tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI HARI
    // ==========================================

    if (!isValidDay(scheduleDay)) {
      return NextResponse.json(
        {
          error: 'Hari jadwal tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI JAM
    // ==========================================

    if (!scheduleStart || !scheduleEnd) {
      return NextResponse.json(
        {
          error:
            'Jam mulai dan jam selesai wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (!isValidTime(scheduleStart)) {
      return NextResponse.json(
        {
          error:
            'Format jam mulai tidak valid.',
        },
        { status: 400 }
      )
    }

    if (!isValidTime(scheduleEnd)) {
      return NextResponse.json(
        {
          error:
            'Format jam selesai tidak valid.',
        },
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
            'Jam selesai harus lebih besar dari jam mulai.',
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // ==========================================
    // CEK KELAS
    // ==========================================

    const {
      data: existingClass,
      error: existingError,
    } = await admin
      .from('classes')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      console.error(
        'CHECK CLASS ERROR:',
        existingError
      )

      return NextResponse.json(
        {
          error:
            'Gagal memeriksa data kelas.',
        },
        { status: 500 }
      )
    }

    if (!existingClass) {
      return NextResponse.json(
        {
          error: 'Kelas tidak ditemukan.',
        },
        { status: 404 }
      )
    }

    // ==========================================
    // VALIDASI TUTOR DI DATABASE
    // ==========================================

    const {
      data: tutor,
      error: tutorError,
    } = await admin
      .from('profiles')
      .select('id, role_id')
      .eq('id', tutorId)
      .maybeSingle()

    if (tutorError) {
      console.error(
        'VALIDATE TUTOR ERROR:',
        tutorError
      )

      return NextResponse.json(
        {
          error:
            'Gagal memverifikasi tutor.',
        },
        { status: 500 }
      )
    }

    if (!tutor) {
      return NextResponse.json(
        {
          error: 'Tutor tidak ditemukan.',
        },
        { status: 400 }
      )
    }

    if (tutor.role_id !== 2) {
      return NextResponse.json(
        {
          error:
            'Pengguna yang dipilih bukan akun Tutor.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // UPDATE
    // ==========================================

    const {
      data: classData,
      error: updateError,
    } = await admin
      .from('classes')
      .update({
        tutor_id: tutorId,
        class_name: className,
        subject,
        description,
        schedule_day: scheduleDay,
        schedule_start: scheduleStart,
        schedule_end: scheduleEnd,
        status,
      })
      .eq('id', id)
      .select(`
        id,
        tutor_id,
        class_name,
        subject,
        description,
        schedule_day,
        schedule_start,
        schedule_end,
        status
      `)
      .single()

    if (updateError) {
      console.error(
        'UPDATE CLASS ERROR:',
        updateError
      )

      const errorCode =
        getDatabaseErrorCode(updateError)

      if (errorCode === '23503') {
        return NextResponse.json(
          {
            error:
              'Tutor yang dipilih tidak valid.',
          },
          { status: 400 }
        )
      }

      if (errorCode === '23505') {
        return NextResponse.json(
          {
            error:
              'Kelas dengan data tersebut sudah ada.',
          },
          { status: 409 }
        )
      }

      // Jangan bocorkan updateError.message
      return NextResponse.json(
        {
          error:
            'Gagal memperbarui kelas.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // AMBIL TUTOR
    // ==========================================

    let tutorData = null

    if (classData.tutor_id) {
      const { data } = await admin
        .from('profiles')
        .select(
          'id, full_name, phone_number'
        )
        .eq('id', classData.tutor_id)
        .eq('role_id', 2)
        .maybeSingle()

      tutorData = data
    }

    return NextResponse.json({
      class: {
        ...classData,
        tutor: tutorData,
      },
    })
  } catch (error) {
    console.error(
      'PATCH CLASS UNEXPECTED ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      { status: 500 }
    )
  }
}

// ==========================================
// DELETE
// ==========================================

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } = await context.params

    // ==========================================
    // VALIDASI ID
    // ==========================================

    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: 'ID kelas tidak valid.',
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // ==========================================
    // CEK KELAS
    // ==========================================

    const {
      data: existingClass,
      error: existingError,
    } = await admin
      .from('classes')
      .select('id, class_name')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      console.error(
        'CHECK DELETE CLASS ERROR:',
        existingError
      )

      return NextResponse.json(
        {
          error:
            'Gagal memeriksa data kelas.',
        },
        { status: 500 }
      )
    }

    if (!existingClass) {
      return NextResponse.json(
        {
          error: 'Kelas tidak ditemukan.',
        },
        { status: 404 }
      )
    }

    // ==========================================
    // DELETE
    // ==========================================

    const { error: deleteError } =
      await admin
        .from('classes')
        .delete()
        .eq('id', id)

    if (deleteError) {
      console.error(
        'DELETE CLASS ERROR:',
        deleteError
      )

      const errorCode =
        getDatabaseErrorCode(deleteError)

      if (errorCode === '23503') {
        return NextResponse.json(
          {
            error:
              'Kelas tidak dapat dihapus karena masih memiliki data terkait. Nonaktifkan kelas jika masih memiliki riwayat.',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            'Gagal menghapus kelas.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Kelas berhasil dihapus.',
    })
  } catch (error) {
    console.error(
      'DELETE CLASS UNEXPECTED ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      { status: 500 }
    )
  }
}