import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type StudentStatus = 'ACTIVE' | 'INACTIVE'

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

/**
 * GET
 *
 * GET /api/founder/students
 *
 * Mengambil seluruh data siswa.
 *
 * Optional:
 * GET /api/founder/students?parents=true
 *
 * Digunakan halaman Founder untuk mengambil
 * daftar akun Orang Tua yang dapat dihubungkan
 * ke siswa.
 */

export async function GET(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const parentsOnly = searchParams.get('parents') === 'true'

    const admin = createAdminClient()

    // ==========================================
    // GET DAFTAR PARENT
    // ==========================================
    if (parentsOnly) {
      const { data: parents, error } = await admin
        .from('profiles')
        .select('id, full_name, phone_number')
        .eq('role_id', 3)
        .order('full_name', {
          ascending: true,
        })

      if (error) {
        console.error('GET PARENTS ERROR:', error)

        return NextResponse.json(
          {
            error: 'Gagal mengambil data orang tua.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        parents: parents ?? [],
      })
    }

    // ==========================================
    // GET DAFTAR SISWA
    // ==========================================
    const { data: students, error: studentsError } =
      await admin
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
      console.error('GET STUDENTS ERROR:', studentsError)

      return NextResponse.json(
        {
          error: 'Gagal mengambil data siswa.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // AMBIL DATA PARENT SECARA TERPISAH
    // Tidak bergantung pada nama foreign key
    // ==========================================
    const parentIds = [
      ...new Set(
        (students ?? [])
          .map((student) => student.parent_id)
          .filter(
            (id): id is string => Boolean(id)
          )
      ),
    ]

    let parents: Array<{
      id: string
      full_name: string
      phone_number: string | null
    }> = []

    if (parentIds.length > 0) {
      const { data: parentData, error: parentError } =
        await admin
          .from('profiles')
          .select('id, full_name, phone_number')
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
    // GABUNGKAN DATA SISWA + PARENT
    // ==========================================
    const parentMap = new Map(
      parents.map((parent) => [
        parent.id,
        {
          full_name: parent.full_name,
          phone_number: parent.phone_number,
        },
      ])
    )

    const result = (students ?? []).map((student) => ({
      ...student,
      parent: student.parent_id
        ? parentMap.get(student.parent_id) ?? null
        : null,
    }))

    return NextResponse.json({
      students: result,
    })
  } catch (error) {
    console.error('GET STUDENTS UNEXPECTED ERROR:', error)

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan pada server.',
      },
      { status: 500 }
    )
  }
}


/**
 * POST
 *
 * POST /api/founder/students
 *
 * Membuat data siswa baru.
 */

export async function POST(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const body = await request.json()

    const studentName = cleanString(body.studentName)
    const gradeLevel = cleanString(body.gradeLevel)
    const schoolName = normalizeNullableString(body.schoolName)
    const phoneNumber = normalizeNullableString(body.phoneNumber)
    const parentId = normalizeNullableString(body.parentId)

    const status = isValidStatus(body.status)
      ? body.status
      : 'ACTIVE'

    // ==========================================
    // VALIDASI
    // ==========================================
    if (!studentName) {
      return NextResponse.json(
        {
          error: 'Nama siswa wajib diisi.',
        },
        { status: 400 }
      )
    }

    if (!gradeLevel) {
      return NextResponse.json(
        {
          error: 'Kelas siswa wajib dipilih.',
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // ==========================================
    // VALIDASI PARENT
    // ==========================================
    if (parentId) {
      const { data: parent, error: parentError } =
        await admin
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

      if (parent.role_id !== 3) {
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
    // INSERT SISWA
    // ==========================================
    const { data: student, error: insertError } =
      await admin
        .from('students')
        .insert({
          student_name: studentName,
          grade_level: gradeLevel,
          school_name: schoolName,
          phone_number: phoneNumber,
          parent_id: parentId,
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

      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            error:
              'Data siswa tersebut sudah ada.',
          },
          { status: 409 }
        )
      }

      if (insertError.code === '23503') {
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
            insertError.message ||
            'Gagal menambahkan siswa.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // AMBIL DATA PARENT TERPISAH
    // Tidak menggunakan relationship FK
    // ==========================================
    let parent = null

    if (student.parent_id) {
      const { data: parentData, error: parentError } =
        await admin
          .from('profiles')
          .select('id, full_name, phone_number')
          .eq('id', student.parent_id)
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

    // ==========================================
    // RESPONSE
    // ==========================================
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



