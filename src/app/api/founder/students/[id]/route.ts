import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type StudentStatus =
  | 'ACTIVE'
  | 'INACTIVE'

const ALLOWED_GRADE_LEVELS = [
  'TK',
  'SD 1',
  'SD 2',
  'SD 3',
  'SD 4',
  'SD 5',
  'SD 6',
  'SMP 7',
  'SMP 8',
  'SMP 9',
  'SMA 10',
  'SMA 11',
  'SMA 12',
] as const

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function cleanString(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim()
    : ''
}

function normalizeNullableString(
  value: unknown
): string | null {
  const cleaned = cleanString(value)

  return cleaned || null
}

function isValidStatus(
  value: unknown
): value is StudentStatus {
  return (
    value === 'ACTIVE' ||
    value === 'INACTIVE'
  )
}

function isValidUuid(
  value: unknown
): boolean {
  if (typeof value !== 'string') {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isValidGradeLevel(
  value: unknown
): boolean {
  return (
    typeof value === 'string' &&
    ALLOWED_GRADE_LEVELS.includes(
      value as (typeof ALLOWED_GRADE_LEVELS)[number]
    )
  )
}

function isValidStudentName(
  value: unknown
): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const cleaned = value.trim()

  if (
    cleaned.length < 2 ||
    cleaned.length > 100
  ) {
    return false
  }

  if (
    /[\u0000-\u001F\u007F]/.test(
      cleaned
    )
  ) {
    return false
  }

  return true
}

function isValidSchoolName(
  value: unknown
): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  const cleaned = value.trim()

  if (cleaned.length === 0) {
    return true
  }

  if (cleaned.length > 150) {
    return false
  }

  if (
    /[\u0000-\u001F\u007F]/.test(
      cleaned
    )
  ) {
    return false
  }

  return true
}

function isValidPhoneNumber(
  value: unknown
): value is string {
  if (
    value === null ||
    value === undefined
  ) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  const cleaned = value.trim()

  // Nomor HP boleh dikosongkan
  if (cleaned === '') {
    return true
  }

  // Jika diisi, wajib 08 + total 10–13 digit
  return /^08\d{8,11}$/.test(cleaned)
}

async function parseJsonBody(
  request: NextRequest
): Promise<
  | {
      success: true
      body: Record<string, unknown>
    }
  | {
      success: false
      response: NextResponse
    }
> {
  try {
    const body = await request.json()

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error:
              'Format data yang dikirim tidak valid.',
          },
          { status: 400 }
        ),
      }
    }

    return {
      success: true,
      body: body as Record<
        string,
        unknown
      >,
    }
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          error:
            'Format JSON tidak valid.',
        },
        { status: 400 }
      ),
    }
  }
}

/**
 * PATCH /api/founder/students/[id]
 *
 * Mengubah data siswa.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    // ==========================================
    // VALIDASI ID
    // ==========================================

    const { id } =
      await context.params

    if (
      !isValidUuid(id)
    ) {
      return NextResponse.json(
        {
          error:
            'ID siswa tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // PARSE BODY
    // ==========================================

    const parsed =
      await parseJsonBody(request)

    if (!parsed.success) {
      return parsed.response
    }

    const body = parsed.body

    // ==========================================
    // NORMALIZE
    // ==========================================

    const studentName =
      cleanString(body.studentName)

    const gradeLevel =
      cleanString(body.gradeLevel)

    const schoolName =
      normalizeNullableString(
        body.schoolName
      )

    const phoneNumber =
      normalizeNullableString(
        body.phoneNumber
      )

    const parentId =
      normalizeNullableString(
        body.parentId
      )

    const status = body.status

    // ==========================================
    // VALIDASI NAMA
    // ==========================================

    if (
      !isValidStudentName(
        studentName
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Nama siswa harus terdiri dari 2–100 karakter.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI GRADE
    // ==========================================

    if (
      !isValidGradeLevel(
        gradeLevel
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Kelas siswa tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI SCHOOL
    // ==========================================

    if (
      !isValidSchoolName(
        schoolName
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Nama sekolah tidak valid atau melebihi 150 karakter.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI PHONE
    // ==========================================

    if (
      !isValidPhoneNumber(
        phoneNumber
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Nomor telepon wajib diisi dan harus terdiri dari 10–13 digit angka.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI STATUS
    // ==========================================

    if (
      !isValidStatus(status)
    ) {
      return NextResponse.json(
        {
          error:
            'Status siswa tidak valid.',
        },
        { status: 400 }
      )
    }

    // ==========================================
    // VALIDASI PARENT UUID
    // ==========================================

    if (
      parentId &&
      !isValidUuid(parentId)
    ) {
      return NextResponse.json(
        {
          error:
            'ID orang tua tidak valid.',
        },
        { status: 400 }
      )
    }

    const admin =
      createAdminClient()

    // ==========================================
    // CEK SISWA
    // ==========================================

    const {
      data: existingStudent,
      error: existingError,
    } = await admin
      .from('students')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      console.error(
        'CHECK STUDENT ERROR:',
        existingError
      )

      return NextResponse.json(
        {
          error:
            'Gagal memeriksa data siswa.',
        },
        { status: 500 }
      )
    }

    if (!existingStudent) {
      return NextResponse.json(
        {
          error:
            'Siswa tidak ditemukan.',
        },
        { status: 404 }
      )
    }

    // ==========================================
    // VALIDASI PARENT
    // ==========================================

    if (parentId) {
      const {
        data: parent,
        error: parentError,
      } = await admin
        .from('profiles')
        .select('id, role_id')
        .eq('id', parentId)
        .maybeSingle()

      if (parentError) {
        console.error(
          'VALIDATE PARENT ERROR:',
          parentError
        )

        return NextResponse.json(
          {
            error:
              'Gagal memverifikasi orang tua.',
          },
          { status: 500 }
        )
      }

      if (!parent) {
        return NextResponse.json(
          {
            error:
              'Orang tua yang dipilih tidak ditemukan.',
          },
          { status: 400 }
        )
      }

      if (
        parent.role_id !== 3
      ) {
        return NextResponse.json(
          {
            error:
              'Pengguna yang dipilih bukan akun Orang Tua.',
          },
          { status: 400 }
        )
      }
    }

    // ==========================================
    // UPDATE
    // ==========================================

    const {
      data: student,
      error: updateError,
    } = await admin
      .from('students')
      .update({
        student_name:
          studentName,
        grade_level:
          gradeLevel,
        school_name:
          schoolName,
        phone_number:
          phoneNumber,
        parent_id:
          parentId,
        status,
      })
      .eq('id', id)
      .select(`
        id,
        parent_id,
        student_name,
        grade_level,
        school_name,
        phone_number,
        status
      `)
      .single()

    if (updateError) {
      console.error(
        'UPDATE STUDENT ERROR:',
        updateError
      )

      if (
        updateError.code ===
        '23503'
      ) {
        return NextResponse.json(
          {
            error:
              'Orang tua yang dipilih tidak valid.',
          },
          { status: 400 }
        )
      }

      if (
        updateError.code ===
        '23505'
      ) {
        return NextResponse.json(
          {
            error:
              'Data siswa tersebut sudah ada.',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            'Gagal memperbarui siswa.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // GET UPDATED PARENT
    // ==========================================

    let parent = null

    if (student.parent_id) {
      const {
        data: parentData,
        error: parentError,
      } = await admin
        .from('profiles')
        .select(
          'id, full_name, phone_number'
        )
        .eq(
          'id',
          student.parent_id
        )
        .eq('role_id', 3)
        .maybeSingle()

      if (parentError) {
        console.error(
          'GET UPDATED STUDENT PARENT ERROR:',
          parentError
        )
      } else {
        parent = parentData
      }
    }

    return NextResponse.json({
      student: {
        ...student,
        parent,
      },
    })
  } catch (error) {
    console.error(
      'PATCH STUDENT UNEXPECTED ERROR:',
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

/**
 * DELETE /api/founder/students/[id]
 *
 * Menghapus siswa.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    // ==========================================
    // VALIDASI ID
    // ==========================================

    const { id } =
      await context.params

    if (
      !isValidUuid(id)
    ) {
      return NextResponse.json(
        {
          error:
            'ID siswa tidak valid.',
        },
        { status: 400 }
      )
    }

    const admin =
      createAdminClient()

    // ==========================================
    // CEK SISWA
    // ==========================================

    const {
      data: existingStudent,
      error: existingError,
    } = await admin
      .from('students')
      .select(
        `
          id,
          student_name
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      console.error(
        'GET STUDENT BEFORE DELETE ERROR:',
        existingError
      )

      return NextResponse.json(
        {
          error:
            'Gagal memeriksa data siswa.',
        },
        { status: 500 }
      )
    }

    if (!existingStudent) {
      return NextResponse.json(
        {
          error:
            'Data siswa tidak ditemukan.',
        },
        { status: 404 }
      )
    }

    // ==========================================
    // DELETE
    // ==========================================

    const {
      error: deleteError,
    } = await admin
      .from('students')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error(
        'DELETE STUDENT ERROR:',
        deleteError
      )

      // Foreign key constraint
      if (
        deleteError.code ===
        '23503'
      ) {
        return NextResponse.json(
          {
            error:
              'Siswa tidak dapat dihapus karena masih memiliki data akademik atau pendaftaran kelas yang terkait. Nonaktifkan siswa terlebih dahulu jika data historis tetap diperlukan.',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error:
            'Gagal menghapus data siswa.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message:
        'Data siswa berhasil dihapus secara permanen.',
    })
  } catch (error) {
    console.error(
      'DELETE STUDENT UNEXPECTED ERROR:',
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