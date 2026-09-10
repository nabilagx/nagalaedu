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

const DAY_MAP: Record<string, string> = {
  senin: 'SENIN',
  selasa: 'SELASA',
  rabu: 'RABU',
  kamis: 'KAMIS',
  jumat: 'JUMAT',
  sabtu: 'SABTU',
  minggu: 'MINGGU',
}

function normalizeScheduleDay(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const cleaned = value.trim().toLowerCase()

  return DAY_MAP[cleaned] ?? null
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

    if (!id) {
      return NextResponse.json(
        {
          error: 'ID kelas tidak valid.',
        },
        { status: 400 }
      )
    }

    const body = await request.json()

    const className = cleanString(body.className)
    const subject = cleanString(body.subject)
    const description = normalizeNullableString(
      body.description
    )
    const tutorId = normalizeNullableString(
      body.tutorId
    )
    const scheduleDay = normalizeScheduleDay(
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

    if (!scheduleDay) {
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
    // CEK KELAS
    // ==========================================
    const { data: existingClass, error: existingError } =
      await admin
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
          error: 'Gagal memeriksa data kelas.',
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
    // UPDATE
    // ==========================================
    const { data: classData, error: updateError } =
      await admin
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

      if (updateError.code === '23503') {
        return NextResponse.json(
          {
            error: 'Tutor yang dipilih tidak valid.',
          },
          { status: 400 }
        )
      }

      if (updateError.code === '23505') {
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
            updateError.message ||
            'Gagal memperbarui kelas.',
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
        error: 'Terjadi kesalahan pada server.',
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

    if (!id) {
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
    const { data: existingClass, error: existingError } =
      await admin
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
          error: 'Gagal memeriksa data kelas.',
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
    const { error: deleteError } = await admin
      .from('classes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error(
        'DELETE CLASS ERROR:',
        deleteError
      )

      if (deleteError.code === '23503') {
        return NextResponse.json(
          {
            error:
              'Kelas tidak dapat dihapus karena masih memiliki data pendaftaran, absensi, nilai, atau modul. Nonaktifkan kelas jika masih memiliki riwayat.',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            'Gagal menghapus kelas.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Kelas berhasil dihapus secara permanen.',
    })
  } catch (error) {
    console.error(
      'DELETE CLASS UNEXPECTED ERROR:',
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

