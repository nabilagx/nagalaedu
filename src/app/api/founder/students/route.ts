import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type StudentStatus = 'ACTIVE' | 'INACTIVE'

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

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

function isValidUuid(value: unknown): boolean {
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

  // Menolak control characters.
  if (/[\u0000-\u001F\u007F]/.test(cleaned)) {
    return false
  }

  return true
}

function isValidSchoolName(
  value: unknown
): boolean {
  if (value === null || value === undefined) {
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

  if (/[\u0000-\u001F\u007F]/.test(cleaned)) {
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
      body: body as Record<string, unknown>,
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
 * GET /api/founder/students
 *
 * Mengambil seluruh data siswa.
 *
 * GET /api/founder/students?parents=true
 *
 * Mengambil daftar akun Orang Tua.
 */
export async function GET(
  request: NextRequest
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { searchParams } =
      new URL(request.url)

    const parentsOnly =
      searchParams.get('parents') === 'true'

    const admin = createAdminClient()

    // ==========================================
    // GET PARENT
    // ==========================================

    if (parentsOnly) {
      const {
        data: parents,
        error,
      } = await admin
        .from('profiles')
        .select(
          'id, full_name, phone_number'
        )
        .eq('role_id', 3)
        .order('full_name', {
          ascending: true,
        })

      if (error) {
        console.error(
          'GET PARENTS ERROR:',
          error
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data orang tua.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        parents: parents ?? [],
      })
    }

    // ==========================================
    // GET STUDENTS
    // ==========================================

    const {
      data: students,
      error: studentsError,
    } = await admin
      .from('students')
      .select(`
        id,
        parent_id,
        student_name,
        grade_level,
        school_name,
        phone_number,
        status
      `)
      .order('student_name', {
        ascending: true,
      })

    if (studentsError) {
      console.error(
        'GET STUDENTS ERROR:',
        studentsError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data siswa.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // GET PARENTS TERKAIT SISWA
    // ==========================================

    const parentIds = [
      ...new Set(
        (students ?? [])
          .map(
            (student) =>
              student.parent_id
          )
          .filter(
            (id): id is string =>
              Boolean(id)
          )
      ),
    ]

    let parents: Array<{
      id: string
      full_name: string
      phone_number: string | null
    }> = []

    if (parentIds.length > 0) {
      const {
        data: parentData,
        error: parentError,
      } = await admin
        .from('profiles')
        .select(
          'id, full_name, phone_number'
        )
        .in('id', parentIds)
        .eq('role_id', 3)

      if (parentError) {
        console.error(
          'GET STUDENT PARENTS ERROR:',
          parentError
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data orang tua siswa.',
          },
          { status: 500 }
        )
      }

      parents = parentData ?? []
    }

    // ==========================================
    // MAP PARENT
    // ==========================================

    const parentMap = new Map(
      parents.map((parent) => [
        parent.id,
        {
          full_name:
            parent.full_name,
          phone_number:
            parent.phone_number,
        },
      ])
    )

    const result = (
      students ?? []
    ).map((student) => ({
      ...student,
      parent: student.parent_id
        ? parentMap.get(
            student.parent_id
          ) ?? null
        : null,
    }))

    return NextResponse.json({
      students: result,
    })
  } catch (error) {
    console.error(
      'GET STUDENTS UNEXPECTED ERROR:',
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
 * POST /api/founder/students
 *
 * Membuat data siswa baru.
 */
export async function POST(
  request: NextRequest
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    // ==========================================
    // PARSE JSON DENGAN AMAN
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

    // Status wajib valid.
    // Jangan fallback diam-diam ke ACTIVE.
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
    // VALIDASI SEKOLAH
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
    // INSERT
    // ==========================================

    const {
      data: student,
      error: insertError,
    } = await admin
      .from('students')
      .insert({
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

    if (insertError) {
      console.error(
        'INSERT STUDENT ERROR:',
        insertError
      )

      if (
        insertError.code ===
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

      if (
        insertError.code ===
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

      return NextResponse.json(
        {
          error:
            'Gagal menambahkan siswa.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // GET PARENT RESULT
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
          'GET INSERTED STUDENT PARENT ERROR:',
          parentError
        )
      } else {
        parent = parentData
      }
    }

    return NextResponse.json(
      {
        student: {
          ...student,
          parent,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      'POST STUDENT UNEXPECTED ERROR:',
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