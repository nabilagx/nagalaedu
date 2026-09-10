import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type StudentStatus = 'ACTIVE' | 'INACTIVE'

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

/**
 * PATCH
 *
 * PATCH /api/founder/students/[id]
 *
 * Mengubah data siswa.
 */

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
          error: 'ID siswa tidak valid.',
        },
        { status: 400 }
      )
    }

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
    // CEK SISWA
    // ==========================================
    const { data: existingStudent, error: existingError } =
      await admin
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
          error: 'Gagal memeriksa data siswa.',
        },
        { status: 500 }
      )
    }

    if (!existingStudent) {
      return NextResponse.json(
        {
          error: 'Siswa tidak ditemukan.',
        },
        { status: 404 }
      )
    }

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
    // UPDATE SISWA
    // ==========================================
    const { data: student, error: updateError } =
      await admin
        .from('students')
        .update({
          student_name: studentName,
          grade_level: gradeLevel,
          school_name: schoolName,
          phone_number: phoneNumber,
          parent_id: parentId,
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

      if (updateError.code === '23503') {
        return NextResponse.json(
          {
            error:
              'Orang tua yang dipilih tidak valid.',
          },
          { status: 400 }
        )
      }

      if (updateError.code === '23505') {
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
            updateError.message ||
            'Gagal memperbarui siswa.',
        },
        { status: 500 }
      )
    }

    // ==========================================
    // AMBIL DATA PARENT TERPISAH
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
          'GET UPDATED STUDENT PARENT ERROR:',
          parentError
        )
      } else {
        parent = parentData
      }
    }

    // ==========================================
    // RESPONSE
    // ==========================================
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
 * DELETE
 *
 * DELETE /api/founder/students/[id]
 *
 * Menghapus siswa.
 *
 * Penghapusan sengaja tidak melakukan
 * cascade manual terhadap data akademik.
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
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'ID siswa tidak ditemukan.',
        },
        {
          status: 400,
        }
      )
    }

    const admin = createAdminClient()

    /**
     * Pastikan siswa ada.
     */
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
        {
          status: 500,
        }
      )
    }

    if (!existingStudent) {
      return NextResponse.json(
        {
          error:
            'Data siswa tidak ditemukan.',
        },
        {
          status: 404,
        }
      )
    }

    /**
     * DELETE SISWA
     */
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

      /**
       * Foreign key constraint.
       *
       * Biasanya terjadi ketika siswa masih
       * mempunyai enrollment / data akademik
       * yang bergantung pada student tersebut.
       */
      if (
        deleteError.code === '23503'
      ) {
        return NextResponse.json(
          {
            error:
              'Siswa tidak dapat dihapus karena masih memiliki data akademik atau pendaftaran kelas yang terkait. Nonaktifkan siswa terlebih dahulu jika data historis tetap diperlukan.',
          },
          {
            status: 409,
          }
        )
      }

      return NextResponse.json(
        {
          error:
            'Gagal menghapus data siswa.',
        },
        {
          status: 500,
        }
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
      {
        status: 500,
      }
    )
  }
}

