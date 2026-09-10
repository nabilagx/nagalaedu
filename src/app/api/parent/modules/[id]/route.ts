import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'ID modul tidak valid.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // =====================================================
    // 1. CEK USER LOGIN
    // =====================================================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 },
      )
    }

    // =====================================================
    // 2. CEK ROLE PARENT
    // =====================================================

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role_id, full_name')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
      console.error('PROFILE ERROR:', profileError)

      return NextResponse.json(
        { error: 'Profil pengguna tidak ditemukan.' },
        { status: 500 },
      )
    }

    if (profile.role_id !== 3) {
      return NextResponse.json(
        { error: 'Akses hanya untuk Parent.' },
        { status: 403 },
      )
    }

    // =====================================================
    // 3. AMBIL MODUL
    // =====================================================

    const { data: module, error: moduleError } =
      await supabase
        .from('learning_modules')
        .select(`
          id,
          class_id,
          tutor_id,
          title,
          description,
          file_url,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .maybeSingle()

    if (moduleError) {
      console.error('MODULE ERROR:', moduleError)

      return NextResponse.json(
        {
          error: 'Gagal mengambil data modul.',
          detail: moduleError.message,
        },
        { status: 500 },
      )
    }

    if (!module) {
      return NextResponse.json(
        {
          error: 'Modul belajar tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    // =====================================================
    // 4. AMBIL ANAK MILIK PARENT
    // =====================================================

    const { data: students, error: studentError } =
      await supabase
        .from('students')
        .select(`
          id,
          student_name,
          grade_level,
          school_name
        `)
        .eq('parent_id', user.id)

    if (studentError) {
      console.error('STUDENT ERROR:', studentError)

      return NextResponse.json(
        { error: 'Gagal mengambil data anak.' },
        { status: 500 },
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        {
          error:
            'Anda belum memiliki data anak.',
        },
        { status: 403 },
      )
    }

    const studentIds = students.map(
      (student) => student.id,
    )

    // =====================================================
    // 5. CEK APAKAH MODUL BERASAL DARI KELAS ANAK
    // =====================================================

    const {
      data: enrollment,
      error: enrollmentError,
    } = await supabase
      .from('class_enrollments')
      .select(`
        id,
        student_id,
        class_id,
        status
      `)
      .in('student_id', studentIds)
      .eq('class_id', module.class_id)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle()

    if (enrollmentError) {
      console.error(
        'ENROLLMENT ERROR:',
        enrollmentError,
      )

      return NextResponse.json(
        {
          error: 'Gagal memverifikasi akses modul.',
          detail: enrollmentError.message,
        },
        { status: 500 },
      )
    }

    // =====================================================
    // 6. JIKA BUKAN KELAS ANAK → DENY
    // =====================================================

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            'Anda tidak memiliki akses ke modul ini.',
        },
        { status: 403 },
      )
    }

    // =====================================================
    // 7. AMBIL DATA KELAS
    // =====================================================

    const { data: classData, error: classError } =
      await supabase
        .from('classes')
        .select(`
          id,
          class_name,
          subject,
          description,
          status
        `)
        .eq('id', module.class_id)
        .maybeSingle()

    if (classError) {
      console.error('CLASS ERROR:', classError)

      return NextResponse.json(
        {
          error: 'Gagal mengambil data kelas.',
          detail: classError.message,
        },
        { status: 500 },
      )
    }

    // =====================================================
    // 8. DATA ANAK YANG TERHUBUNG DENGAN MODUL
    // =====================================================

    const child =
      students.find(
        (student) =>
          student.id === enrollment.student_id,
      ) ?? null

    // =====================================================
    // 9. RESPONSE
    // =====================================================

    return NextResponse.json({
      module: {
        ...module,
        class: classData ?? null,
        child,
      },
    })
  } catch (error) {
    console.error(
      'PARENT MODULE DETAIL ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error: 'Gagal mengambil modul.',
      },
      { status: 500 },
    )
  }
}