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
// GET
// ==========================================

export async function GET(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    const tutorsOnly =
      searchParams.get('tutors') === 'true'

    const admin = createAdminClient()

    // ==========================================
    // GET DAFTAR TUTOR
    // ==========================================

    if (tutorsOnly) {
      const { data: tutors, error } = await admin
        .from('profiles')
        .select(
          'id, full_name, phone_number'
        )
        .eq('role_id', 2)
        .order('full_name', {
          ascending: true,
        })

      if (error) {
        console.error(
          'GET TUTORS ERROR:',
          error
        )

        return NextResponse.json(
          {
            error: 'Gagal mengambil data tutor.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        tutors: tutors ?? [],
      })
    }

    // ==========================================
    // GET KELAS
    // ==========================================

    const { data: classes, error: classesError } =
      await admin
        .from('classes')
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
        .order('class_name', {
          ascending: true,
        })

    if (classesError) {
      console.error(
        'GET CLASSES ERROR:',
        classesError
      )

      return NextResponse.json(
        {
          error: 'Gagal mengambil data kelas.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // AMBIL DATA TUTOR
    // ==========================================

    const tutorIds = [
      ...new Set(
        (classes ?? [])
          .map((item) => item.tutor_id)
          .filter(
            (id): id is string => Boolean(id)
          )
      ),
    ]

    let tutors: Array<{
      id: string
      full_name: string
      phone_number: string | null
    }> = []

    if (tutorIds.length > 0) {
      const { data: tutorData, error: tutorError } =
        await admin
          .from('profiles')
          .select(
            'id, full_name, phone_number'
          )
          .in('id', tutorIds)
          .eq('role_id', 2)

      if (tutorError) {
        console.error(
          'GET CLASS TUTORS ERROR:',
          tutorError
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data tutor kelas.',
          },
          { status: 500 }
        )
      }

      tutors = tutorData ?? []
    }

    const tutorMap = new Map(
      tutors.map((tutor) => [
        tutor.id,
        {
          full_name: tutor.full_name,
          phone_number: tutor.phone_number,
        },
      ])
    )

    const result = (classes ?? []).map(
      (item) => ({
        ...item,
        tutor: item.tutor_id
          ? tutorMap.get(item.tutor_id) ?? null
          : null,
      })
    )

    return NextResponse.json({
      classes: result,
    })
  } catch (error) {
    console.error(
      'GET CLASSES UNEXPECTED ERROR:',
      error
    )

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan pada server.',
      },
      { status: 500 }
    )
  }
}

// ==========================================
// POST
// ==========================================

export async function POST(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
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

    // Jangan default secara diam-diam
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
    // VALIDASI CLASS NAME
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
    // VALIDASI TUTOR ID
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
    // VALIDASI WAKTU
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
    // VALIDASI TUTOR DI DATABASE
    // ==========================================

    const { data: tutor, error: tutorError } =
      await admin
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
    // INSERT
    // ==========================================

    const {
      data: classData,
      error: insertError,
    } = await admin
      .from('classes')
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

    if (insertError) {
      console.error(
        'INSERT CLASS ERROR:',
        insertError
      )

      const errorCode =
        getDatabaseErrorCode(insertError)

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

      return NextResponse.json(
        {
          error:
            'Gagal menambahkan kelas.',
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

    return NextResponse.json(
      {
        class: {
          ...classData,
          tutor: tutorData,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      'POST CLASS UNEXPECTED ERROR:',
      error
    )

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan pada server.',
      },
      { status: 500 }
    )
  }
}