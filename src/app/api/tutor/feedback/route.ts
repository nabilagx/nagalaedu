import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type TutorClass = {
  id: string
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
}

type Enrollment = {
  id: string
  class_id: string
  student_id: string
  status: string
}

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null
}

type Grade = {
  id: string
  enrollment_id: string
  subject: string | null
  assessment_name: string | null
  score: number | null
  feedback_notes: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // =========================================================
    // 1. AUTH
    // =========================================================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    // =========================================================
    // 2. PROFILE
    // =========================================================
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, role_id, full_name")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "Profile tidak ditemukan",
        },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        {
          error: "Akses hanya untuk tutor",
        },
        { status: 403 }
      )
    }

    // =========================================================
    // 3. AMBIL SEMUA KELAS MILIK TUTOR
    // =========================================================
    const { data: classesData, error: classesError } =
      await supabase
        .from("classes")
        .select(
          `
          id,
          class_name,
          subject,
          schedule_day,
          schedule_start,
          schedule_end,
          status
          `
        )
        .eq("tutor_id", user.id)
        .order("class_name", {
          ascending: true,
        })

    if (classesError) {
      console.error(
        "Tutor feedback classes error:",
        classesError
      )

      return NextResponse.json(
        {
          error: "Gagal mengambil data kelas",
        },
        { status: 500 }
      )
    }

    const classes = (classesData ?? []) as TutorClass[]

    // =========================================================
    // 4. JIKA BELUM ADA KELAS
    // =========================================================
    if (classes.length === 0) {
      return NextResponse.json({
        tutor: {
          id: user.id,
          full_name: profile.full_name,
        },

        summary: {
          total_feedback: 0,
          total_students: 0,
          average_score: 0,
        },

        classes: [],
        enrollments: [],
        feedback: [],
      })
    }

    const classIds = classes.map(
      (item) => item.id
    )

    // =========================================================
    // 5. AMBIL ACTIVE ENROLLMENT
    // =========================================================
    const {
      data: enrollmentsData,
      error: enrollmentsError,
    } = await supabase
      .from("class_enrollments")
      .select(
        `
        id,
        class_id,
        student_id,
        status
        `
      )
      .in("class_id", classIds)
      .eq("status", "ACTIVE")

    if (enrollmentsError) {
      console.error(
        "Tutor feedback enrollments error:",
        enrollmentsError
      )

      return NextResponse.json(
        {
          error: "Gagal mengambil data siswa",
        },
        { status: 500 }
      )
    }

    const enrollments =
      (enrollmentsData ?? []) as Enrollment[]

    const enrollmentIds = enrollments.map(
      (item) => item.id
    )

    const studentIds = [
      ...new Set(
        enrollments.map(
          (item) => item.student_id
        )
      ),
    ]

    // =========================================================
    // 6. AMBIL SISWA
    // =========================================================
    let students: Student[] = []

    if (studentIds.length > 0) {
      const {
        data: studentsData,
        error: studentsError,
      } = await supabase
        .from("students")
        .select(
          `
          id,
          student_name,
          grade_level,
          school_name,
          status
          `
        )
        .in("id", studentIds)

      if (studentsError) {
        console.error(
          "Tutor feedback students error:",
          studentsError
        )

        return NextResponse.json(
          {
            error: "Gagal mengambil data siswa",
          },
          { status: 500 }
        )
      }

      students =
        (studentsData ?? []) as Student[]
    }

    // =========================================================
    // 7. MAP
    // =========================================================
    const classMap = new Map(
      classes.map((item) => [
        item.id,
        item,
      ])
    )

    const studentMap = new Map(
      students.map((item) => [
        item.id,
        item,
      ])
    )

    // =========================================================
    // 8. ENROLLMENT OPTIONS
    //
    // Data ini dipakai halaman Tambah Feedback.
    // Subject berasal dari classes.subject.
    // =========================================================
    const enrollmentOptions = enrollments
      .map((enrollment) => {
        const student = studentMap.get(
          enrollment.student_id
        )

        const classInfo = classMap.get(
          enrollment.class_id
        )

        if (!student || !classInfo) {
          return null
        }

        return {
          enrollment_id: enrollment.id,

          student_id: student.id,
          student_name: student.student_name,
          grade_level: student.grade_level,
          school_name: student.school_name,
          student_status: student.status,

          class_id: classInfo.id,
          class_name: classInfo.class_name,
          class_subject: classInfo.subject,

          schedule_day:
            classInfo.schedule_day,

          schedule_start:
            classInfo.schedule_start,

          schedule_end:
            classInfo.schedule_end,
        }
      })
      .filter(
        (
          item
        ): item is NonNullable<typeof item> =>
          item !== null
      )

    // =========================================================
    // 9. AMBIL GRADES YANG SUDAH MEMILIKI FEEDBACK
    // =========================================================
    let grades: Grade[] = []

    if (enrollmentIds.length > 0) {
      const {
        data: gradesData,
        error: gradesError,
      } = await supabase
        .from("grades")
        .select(
          `
          id,
          enrollment_id,
          subject,
          assessment_name,
          score,
          feedback_notes,
          created_at,
          updated_at
          `
        )
        .in(
          "enrollment_id",
          enrollmentIds
        )
        .not(
          "feedback_notes",
          "is",
          null
        )
        .order("updated_at", {
          ascending: false,
        })

      if (gradesError) {
        console.error(
          "Tutor feedback grades error:",
          gradesError
        )

        return NextResponse.json(
          {
            error:
              "Gagal mengambil data feedback",
          },
          { status: 500 }
        )
      }

      grades =
        (gradesData ?? []) as Grade[]
    }

    // =========================================================
    // 10. BUILD FEEDBACK
    // =========================================================
    const feedback = grades
      .map((grade) => {
        const enrollment =
          enrollments.find(
            (item) =>
              item.id ===
              grade.enrollment_id
          )

        if (!enrollment) {
          return null
        }

        const student =
          studentMap.get(
            enrollment.student_id
          )

        const classInfo =
          classMap.get(
            enrollment.class_id
          )

        if (!student || !classInfo) {
          return null
        }

        return {
          id: grade.id,
          enrollment_id:
            grade.enrollment_id,

          student_id: student.id,
          student_name:
            student.student_name,
          grade_level:
            student.grade_level,
          school_name:
            student.school_name,

          class_id: classInfo.id,
          class_name:
            classInfo.class_name,
          class_subject:
            classInfo.subject,

          subject: grade.subject,
          assessment_name:
            grade.assessment_name,
          score: grade.score,
          feedback_notes:
            grade.feedback_notes,

          created_at:
            grade.created_at,
          updated_at:
            grade.updated_at,
        }
      })
      .filter(
        (
          item
        ): item is NonNullable<typeof item> =>
          item !== null
      )

    // =========================================================
    // 11. SUMMARY
    // =========================================================
    const validScores = grades
      .map((grade) => grade.score)
      .filter(
        (score): score is number =>
          typeof score === "number"
      )

    const averageScore =
      validScores.length > 0
        ? Math.round(
            (validScores.reduce(
              (total, score) =>
                total + score,
              0
            ) /
              validScores.length) *
              10
          ) / 10
        : 0

    // =========================================================
    // 12. RESPONSE
    // =========================================================
    return NextResponse.json({
      tutor: {
        id: user.id,
        full_name: profile.full_name,
      },

      summary: {
        total_feedback:
          feedback.length,

        total_students:
          students.length,

        average_score:
          averageScore,
      },

      classes,

      // Untuk halaman Tambah Feedback
      enrollments:
        enrollmentOptions,

      // Feedback yang sudah ada
      feedback,
    })
  } catch (error) {
    console.error(
      "Tutor feedback GET error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan pada server",
      },
      { status: 500 }
    )
  }
}

// =============================================================
// POST — TAMBAH NILAI + FEEDBACK
//
// Subject TIDAK diterima dari frontend.
//
// Subject diambil berdasarkan:
// enrollment_id
//      ↓
// class_enrollments.class_id
//      ↓
// classes.subject
// =============================================================

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient()

    // =========================================================
    // 1. AUTH
    // =========================================================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    // =========================================================
    // 2. PROFILE
    // =========================================================
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, role_id, full_name"
      )
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            "Profile tidak ditemukan",
        },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        {
          error:
            "Akses hanya untuk tutor",
        },
        { status: 403 }
      )
    }

    // =========================================================
    // 3. BODY
    // =========================================================
    const body = await request.json()

    const enrollmentId =
      typeof body.enrollment_id ===
      "string"
        ? body.enrollment_id.trim()
        : ""

    const assessmentName =
      typeof body.assessment_name ===
      "string"
        ? body.assessment_name.trim()
        : ""

    const feedbackNotes =
      typeof body.feedback_notes ===
      "string"
        ? body.feedback_notes.trim()
        : ""

    const score = Number(
      body.score
    )

    // =========================================================
    // 4. VALIDATION
    // =========================================================
    if (!enrollmentId) {
      return NextResponse.json(
        {
          error:
            "Siswa wajib dipilih",
        },
        { status: 400 }
      )
    }

    if (!assessmentName) {
      return NextResponse.json(
        {
          error:
            "Nama penilaian wajib diisi",
        },
        { status: 400 }
      )
    }

    if (!Number.isFinite(score)) {
      return NextResponse.json(
        {
          error:
            "Nilai harus berupa angka",
        },
        { status: 400 }
      )
    }

    if (
      score < 0 ||
      score > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Nilai harus berada di antara 0 sampai 100",
        },
        { status: 400 }
      )
    }

    if (!feedbackNotes) {
      return NextResponse.json(
        {
          error:
            "Feedback wajib diisi",
        },
        { status: 400 }
      )
    }

    // =========================================================
    // 5. VALIDASI ENROLLMENT + CLASS
    // =========================================================
    const {
      data: enrollment,
      error: enrollmentError,
    } = await supabase
      .from("class_enrollments")
      .select(
        `
        id,
        class_id,
        student_id,
        status,
        classes!inner (
          id,
          tutor_id,
          class_name,
          subject,
          status
        )
        `
      )
      .eq(
        "id",
        enrollmentId
      )
      .eq(
        "status",
        "ACTIVE"
      )
      .single()

    if (
      enrollmentError ||
      !enrollment
    ) {
      console.error(
        "Tutor feedback enrollment validation error:",
        enrollmentError
      )

      return NextResponse.json(
        {
          error:
            "Enrollment siswa tidak ditemukan",
        },
        { status: 404 }
      )
    }

    // Supabase bisa mengembalikan relation
    // sebagai object atau array.
    const classInfo =
      Array.isArray(
        enrollment.classes
      )
        ? enrollment.classes[0]
        : enrollment.classes

    if (!classInfo) {
      return NextResponse.json(
        {
          error:
            "Kelas siswa tidak ditemukan",
        },
        { status: 404 }
      )
    }

    // =========================================================
    // 6. PASTIKAN KELAS MILIK TUTOR
    // =========================================================
    if (
      classInfo.tutor_id !== user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Anda tidak memiliki akses ke siswa ini",
        },
        { status: 403 }
      )
    }

    // =========================================================
    // 7. SUBJECT DARI KELAS
    // =========================================================
    const subject =
      classInfo.subject?.trim()

    if (!subject) {
      return NextResponse.json(
        {
          error:
            "Mata pelajaran pada kelas belum tersedia",
        },
        { status: 400 }
      )
    }

    // =========================================================
    // 8. INSERT KE GRADES
    // =========================================================
    const {
      data: createdGrade,
      error: insertError,
    } = await supabase
      .from("grades")
      .insert({
        enrollment_id:
          enrollment.id,

        // Subject dari classes.subject
        subject,

        assessment_name:
          assessmentName,

        score,

        feedback_notes:
          feedbackNotes,
      })
      .select(
        `
        id,
        enrollment_id,
        subject,
        assessment_name,
        score,
        feedback_notes,
        created_at,
        updated_at
        `
      )
      .single()

    if (insertError) {
      console.error(
        "Tutor feedback insert error:",
        insertError
      )

      return NextResponse.json(
        {
          error:
            insertError.message ||
            "Gagal menyimpan feedback",
        },
        { status: 500 }
      )
    }

    // =========================================================
    // 9. SUCCESS
    // =========================================================
    return NextResponse.json(
      {
        message:
          "Feedback berhasil ditambahkan",

        grade: createdGrade,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "Tutor feedback POST error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan pada server",
      },
      { status: 500 }
    )
  }
}