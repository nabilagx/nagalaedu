import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Cek user login
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

    // 2. Pastikan user adalah Parent
    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role_id, full_name')
        .eq('id', user.id)
        .single()

    if (profileError) {
      console.error('PROFILE ERROR:', profileError)

      return NextResponse.json(
        { error: 'Gagal memuat profil pengguna.' },
        { status: 500 },
      )
    }

    if (profile.role_id !== 3) {
      return NextResponse.json(
        { error: 'Akses hanya untuk Parent.' },
        { status: 403 },
      )
    }

    // 3. Ambil anak milik parent yang sedang login
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
      return NextResponse.json({
        children: [],
        modules: [],
      })
    }

    const studentIds = students.map(
      (student) => student.id,
    )

    // 4. Ambil enrollment anak
    const {
      data: enrollments,
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

    if (enrollmentError) {
      console.error(
        'ENROLLMENT ERROR:',
        enrollmentError,
      )

      return NextResponse.json(
        { error: 'Gagal mengambil data kelas anak.' },
        { status: 500 },
      )
    }

    // 5. Hanya enrollment ACTIVE
    const activeEnrollments =
      (enrollments ?? []).filter(
        (item) => item.status === 'ACTIVE',
      )

    if (activeEnrollments.length === 0) {
      return NextResponse.json({
        children: students.map((student) => ({
          ...student,
          classes: [],
        })),
        modules: [],
      })
    }

    // 6. Ambil ID kelas unik
    const classIds = [
      ...new Set(
        activeEnrollments.map(
          (enrollment) => enrollment.class_id,
        ),
      ),
    ]

    // 7. Ambil data kelas
    const { data: classes, error: classError } =
      await supabase
        .from('classes')
        .select(`
          id,
          class_name,
          subject,
          description,
          status
        `)
        .in('id', classIds)

    if (classError) {
      console.error('CLASS ERROR:', classError)

      return NextResponse.json(
        { error: 'Gagal mengambil data kelas.' },
        { status: 500 },
      )
    }

    // 8. Ambil modul HANYA dari kelas anak
    //    PERHATIKAN: menggunakan file_url
    const {
      data: modules,
      error: moduleError,
    } = await supabase
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
      .in('class_id', classIds)
      .order('created_at', {
        ascending: false,
      })

    if (moduleError) {
      console.error(
        'MODULE ERROR:',
        moduleError,
      )

      return NextResponse.json(
        {
          error: 'Gagal mengambil data modul.',
          detail: moduleError.message,
        },
        { status: 500 },
      )
    }

    // 9. Gabungkan kelas ke masing-masing anak
    const children = students.map((student) => {
      const studentEnrollments =
        activeEnrollments.filter(
          (enrollment) =>
            enrollment.student_id === student.id,
        )

      const studentClassIds =
        studentEnrollments.map(
          (enrollment) => enrollment.class_id,
        )

      const studentClasses =
        (classes ?? []).filter((classItem) =>
          studentClassIds.includes(classItem.id),
        )

      return {
        ...student,
        classes: studentClasses,
      }
    })

    // 10. Tambahkan informasi kelas ke setiap modul
    const modulesWithClass = (modules ?? []).map(
      (module) => ({
        ...module,
        class:
          (classes ?? []).find(
            (classItem) =>
              classItem.id === module.class_id,
          ) ?? null,
      }),
    )

    return NextResponse.json({
      children,
      modules: modulesWithClass,
    })
  } catch (error) {
    console.error(
      'PARENT MODULES API ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error: 'Gagal mengambil data modul belajar.',
      },
      { status: 500 },
    )
  }
}