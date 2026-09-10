import { NextRequest, NextResponse } from 'next/server'
import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

function cleanString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeNullableString(value: unknown) {
  const cleaned = cleanString(value)
  return cleaned ? cleaned : null
}

function isValidStatus(value: unknown): value is 'ACTIVE' | 'INACTIVE' {
  return value === 'ACTIVE' || value === 'INACTIVE'
}

const VALID_DAYS = [
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
  'MINGGU',
]

function isValidDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    VALID_DAYS.includes(value)
  )
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
    const tutorsOnly = searchParams.get('tutors') === 'true'

    const admin = createAdminClient()

    // ==========================================
    // GET DAFTAR TUTOR
    // ==========================================
    if (tutorsOnly) {
      const { data: tutors, error } = await admin
        .from('profiles')
        .select('id, full_name, phone_number')
        .eq('role_id', 2)
        .order('full_name', {
          ascending: true,
        })

      if (error) {
        console.error('GET TUTORS ERROR:', error)

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
    // AMBIL DATA TUTOR TERPISAH
    // Tidak bergantung pada nama foreign key
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
          .select('id, full_name, phone_number')
          .in('id', tutorIds)
          .eq('role_id', 2)

      if (tutorError) {
        console.error(
          'GET CLASS TUTORS ERROR:',
          tutorError
        )

        return NextResponse.json(
          {
            error: 'Gagal mengambil data tutor kelas.',
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

    const result = (classes ?? []).map((item) => ({
      ...item,
      tutor: item.tutor_id
        ? tutorMap.get(item.tutor_id) ?? null
        : null,
    }))

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
    const body = await request.json()

    const className = cleanString(body.className)
    const subject = cleanString(body.subject)
    const description = normalizeNullableString(
      body.description
    )
    const tutorId = normalizeNullableString(
      body.tutorId
    )
    const scheduleDay = cleanString(
      body.scheduleDay
    )
    const scheduleStart = cleanString(
      body.scheduleStart
    )
    const scheduleEnd = cleanString(
      body.scheduleEnd
    )

    const status = isValidStatus(body.status)
      ? body.status
      : 'ACTIVE'

    // ==========================================
    // VALIDASI
    // ==========================================
    if (!className) {
      return NextResponse.json(
        {
          error: 'Nama kelas wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        {
          error: 'Mata pelajaran wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (!tutorId) {
      return NextResponse.json(
        {
          error: 'Tutor wajib dipilih.',
        },
        { status: 400 }
      )
    }

    if (!isValidDay(scheduleDay)) {
      return NextResponse.json(
        {
          error: 'Hari jadwal tidak valid.',
        },
        { status: 400 }
      )
    }

    if (!scheduleStart || !scheduleEnd) {
      return NextResponse.json(
        {
          error:
            'Jam mulai dan jam selesai wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (scheduleStart >= scheduleEnd) {
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
    // VALIDASI TUTOR
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
          error: 'Gagal memverifikasi tutor.',
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
    const { data: classData, error: insertError } =
      await admin
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

      if (insertError.code === '23503') {
        return NextResponse.json(
          {
            error: 'Tutor yang dipilih tidak valid.',
          },
          { status: 400 }
        )
      }

      if (insertError.code === '23505') {
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
            insertError.message ||
            'Gagal menambahkan kelas.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // AMBIL TUTOR TERPISAH
    // ==========================================
    let tutorData = null

    if (classData.tutor_id) {
      const { data } = await admin
        .from('profiles')
        .select('id, full_name, phone_number')
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

