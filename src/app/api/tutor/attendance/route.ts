import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // =========================
    // AUTH
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // =========================
    // ROLE CHECK
    // =========================
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, full_name, role_id")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile tidak ditemukan" },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // =========================
    // GET TUTOR CLASSES
    // =========================
    const { data: classes, error: classesError } =
      await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          subject,
          schedule_day,
          schedule_start,
          schedule_end,
          status
        `)
        .eq("tutor_id", user.id)
        .order("created_at", {
          ascending: false,
        })

    if (classesError) {
      console.error(
        "GET ATTENDANCE CLASSES ERROR:",
        classesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data kelas" },
        { status: 500 }
      )
    }

    const classList = classes ?? []

    if (classList.length === 0) {
      return NextResponse.json({
        tutor: {
          id: profile.id,
          full_name: profile.full_name,
        },
        summary: {
          total_students: 0,
          total_attendance: 0,
          present_attendance: 0,
          attendance_percentage: 0,
        },
        classes: [],
      })
    }

    const classIds = classList.map(
      (item) => item.id
    )

    // =========================
    // GET ACTIVE ENROLLMENTS
    // =========================
    const { data: enrollments, error: enrollmentError } =
      await supabase
        .from("class_enrollments")
        .select(`
          id,
          class_id,
          student_id,
          status
        `)
        .in("class_id", classIds)
        .eq("status", "ACTIVE")

    if (enrollmentError) {
      console.error(
        "GET ATTENDANCE ENROLLMENTS ERROR:",
        enrollmentError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data pendaftaran siswa",
        },
        { status: 500 }
      )
    }

    const enrollmentList = enrollments ?? []

    if (enrollmentList.length === 0) {
      return NextResponse.json({
        tutor: {
          id: profile.id,
          full_name: profile.full_name,
        },
        summary: {
          total_students: 0,
          total_attendance: 0,
          present_attendance: 0,
          attendance_percentage: 0,
        },
        classes: classList.map((classItem) => ({
          id: classItem.id,
          class_name: classItem.class_name,
          subject: classItem.subject,
          schedule_day: classItem.schedule_day,
          schedule_start:
            classItem.schedule_start,
          schedule_end:
            classItem.schedule_end,
          status: classItem.status,
          student_count: 0,
          total_attendance: 0,
          present_attendance: 0,
          attendance_percentage: 0,
        })),
      })
    }

    const enrollmentIds =
      enrollmentList.map(
        (item) => item.id
      )

    const studentIds = [
      ...new Set(
        enrollmentList.map(
          (item) => item.student_id
        )
      ),
    ]

    // =========================
    // GET STUDENTS
    // =========================
    const { data: students, error: studentsError } =
      await supabase
        .from("students")
        .select(`
          id,
          student_name,
          grade_level,
          school_name,
          status
        `)
        .in("id", studentIds)

    if (studentsError) {
      console.error(
        "GET ATTENDANCE STUDENTS ERROR:",
        studentsError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data siswa" },
        { status: 500 }
      )
    }

    const studentList = students ?? []

    // =========================
    // GET ATTENDANCE
    // =========================
    const { data: attendance, error: attendanceError } =
      await supabase
        .from("student_attendance")
        .select(`
          enrollment_id,
          status
        `)
        .in("enrollment_id", enrollmentIds)

    if (attendanceError) {
      console.error(
        "GET ATTENDANCE ERROR:",
        attendanceError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data kehadiran",
        },
        { status: 500 }
      )
    }

    const attendanceList = attendance ?? []

    // =========================
    // CLASS SUMMARY
    // =========================
    const formattedClasses = classList.map(
      (classItem) => {
        const classEnrollments =
          enrollmentList.filter(
            (enrollment) =>
              enrollment.class_id ===
              classItem.id
          )

        const classEnrollmentIds =
          classEnrollments.map(
            (enrollment) =>
              enrollment.id
          )

        const classAttendance =
          attendanceList.filter(
            (item) =>
              classEnrollmentIds.includes(
                item.enrollment_id
              )
          )

        const totalAttendance =
          classAttendance.length

        const presentAttendance =
          classAttendance.filter(
            (item) =>
              item.status === "HADIR"
          ).length

        const attendancePercentage =
          totalAttendance > 0
            ? Math.round(
                (presentAttendance /
                  totalAttendance) *
                  100
              )
            : 0

        return {
          id: classItem.id,
          class_name:
            classItem.class_name,
          subject: classItem.subject,
          schedule_day:
            classItem.schedule_day,
          schedule_start:
            classItem.schedule_start,
          schedule_end:
            classItem.schedule_end,
          status: classItem.status,
          student_count:
            classEnrollments.length,
          total_attendance:
            totalAttendance,
          present_attendance:
            presentAttendance,
          attendance_percentage:
            attendancePercentage,
        }
      }
    )

    // =========================
    // STUDENT SUMMARY
    // =========================
    const formattedStudents =
      studentList.map((student) => {
        const studentEnrollments =
          enrollmentList.filter(
            (enrollment) =>
              enrollment.student_id ===
              student.id
          )

        const studentEnrollmentIds =
          studentEnrollments.map(
            (enrollment) =>
              enrollment.id
          )

        const studentAttendance =
          attendanceList.filter(
            (item) =>
              studentEnrollmentIds.includes(
                item.enrollment_id
              )
          )

        const totalAttendance =
          studentAttendance.length

        const presentAttendance =
          studentAttendance.filter(
            (item) =>
              item.status === "HADIR"
          ).length

        const attendancePercentage =
          totalAttendance > 0
            ? Math.round(
                (presentAttendance /
                  totalAttendance) *
                  100
              )
            : 0

        return {
          id: student.id,
          student_name:
            student.student_name,
          grade_level:
            student.grade_level,
          school_name:
            student.school_name,
          status: student.status,
          class_count:
            studentEnrollments.length,
          total_attendance:
            totalAttendance,
          present_attendance:
            presentAttendance,
          attendance_percentage:
            attendancePercentage,
        }
      })

    formattedStudents.sort((a, b) =>
      a.student_name.localeCompare(
        b.student_name,
        "id"
      )
    )

    // =========================
    // OVERALL SUMMARY
    // =========================
    const totalAttendance =
      attendanceList.length

    const presentAttendance =
      attendanceList.filter(
        (item) =>
          item.status === "HADIR"
      ).length

    const attendancePercentage =
      totalAttendance > 0
        ? Math.round(
            (presentAttendance /
              totalAttendance) *
              100
          )
        : 0

    return NextResponse.json({
      tutor: {
        id: profile.id,
        full_name: profile.full_name,
      },

      summary: {
        total_students:
          studentList.length,
        total_attendance:
          totalAttendance,
        present_attendance:
          presentAttendance,
        attendance_percentage:
          attendancePercentage,
      },

      classes: formattedClasses,

      students: formattedStudents,
    })
  } catch (error) {
    console.error(
      "TUTOR ATTENDANCE API ERROR:",
      error
    )

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    )
  }
}