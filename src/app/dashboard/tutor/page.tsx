'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type TutorProfile = {
  id: string
  full_name: string
}

type TutorClass = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
}

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
}

type Enrollment = {
  id: string
  class_id: string
  student_id: string
  status: string
}

type ClassWithStudents = TutorClass & {
  students: Student[]
}

export default function TutorDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<TutorProfile | null>(null)
  const [classes, setClasses] = useState<ClassWithStudents[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTutorDashboard()
  }, [])

  async function loadTutorDashboard() {
    setLoading(true)
    setError('')

    try {
      // 1. Cek user yang sedang login
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      // 2. Ambil profile tutor
      const { data: tutorProfile, error: profileError } =
        await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .single()

      if (profileError) {
        throw new Error(profileError.message)
      }

      setProfile(tutorProfile)

      // 3. Ambil kelas milik tutor yang sedang login
      const { data: tutorClasses, error: classesError } =
        await supabase
          .from('classes')
          .select(`
            id,
            class_name,
            subject,
            description,
            schedule_day,
            schedule_start,
            schedule_end,
            status
          `)
          .eq('tutor_id', user.id)
          .eq('status', 'ACTIVE')
          .order('class_name')

      if (classesError) {
        throw new Error(classesError.message)
      }

      if (!tutorClasses || tutorClasses.length === 0) {
        setClasses([])
        return
      }

      // 4. Ambil enrollment dari kelas tutor
      const classIds = tutorClasses.map((item) => item.id)

      const { data: enrollments, error: enrollmentError } =
        await supabase
          .from('class_enrollments')
          .select('id, class_id, student_id, status')
          .in('class_id', classIds)
          .eq('status', 'ACTIVE')

      if (enrollmentError) {
        throw new Error(enrollmentError.message)
      }

      if (!enrollments || enrollments.length === 0) {
        setClasses(
          tutorClasses.map((item) => ({
            ...item,
            students: [],
          }))
        )
        return
      }

      // 5. Ambil student berdasarkan enrollment
      const studentIds = [
        ...new Set(enrollments.map((item) => item.student_id)),
      ]

      const { data: students, error: studentsError } =
        await supabase
          .from('students')
          .select(`
            id,
            student_name,
            grade_level,
            school_name
          `)
          .in('id', studentIds)
          .eq('status', 'ACTIVE')
          .order('student_name')

      if (studentsError) {
        throw new Error(studentsError.message)
      }

      // 6. Gabungkan kelas + murid
      const result: ClassWithStudents[] = tutorClasses.map((tutorClass) => {
        const classEnrollments = enrollments.filter(
          (enrollment) =>
            enrollment.class_id === tutorClass.id
        )

        const classStudents = classEnrollments
          .map((enrollment) =>
            students?.find(
              (student) =>
                student.id === enrollment.student_id
            )
          )
          .filter(Boolean) as Student[]

        return {
          ...tutorClass,
          students: classStudents,
        }
      })

      setClasses(result)
    } catch (err) {
      console.error('TUTOR DASHBOARD ERROR:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  const totalStudents = useMemo(() => {
    const studentIds = new Set<string>()

    classes.forEach((item) => {
      item.students.forEach((student) => {
        studentIds.add(student.id)
      })
    })

    return studentIds.size
  }, [classes])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="mb-4 h-8 w-64 rounded bg-slate-200" />
            <div className="h-4 w-80 rounded bg-slate-200" />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-bold text-red-700">
              Gagal memuat dashboard
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              onClick={loadTutorDashboard}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Tutor Dashboard
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Halo, {profile?.full_name} 👋
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola kelas dan perkembangan siswa Anda.
            </p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Kelas Aktif"
            value={classes.length}
            icon="📚"
          />

          <SummaryCard
            label="Total Siswa"
            value={totalStudents}
            icon="👨‍🎓"
          />

          <SummaryCard
            label="Status"
            value="Aktif"
            icon="🟢"
          />
        </section>

        {/* CLASS LIST */}
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Kelas Saya
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Daftar kelas dan siswa yang Anda ajar.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">📚</div>

              <h3 className="mt-3 font-semibold text-slate-900">
                Belum ada kelas aktif
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Anda belum memiliki kelas yang aktif.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {classes.map((item) => (
                <ClassCard
                  key={item.id}
                  tutorClass={item}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
          {icon}
        </div>
      </div>
    </div>
  )
}

function ClassCard({
  tutorClass,
}: {
  tutorClass: ClassWithStudents
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* CLASS HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">
              {tutorClass.subject}
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              {tutorClass.class_name}
            </h3>
          </div>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            ACTIVE
          </span>
        </div>

        {(tutorClass.schedule_day ||
          tutorClass.schedule_start) && (
          <div className="mt-4 text-sm text-white/90">
            🕐 {tutorClass.schedule_day ?? ''}{' '}
            {tutorClass.schedule_start ?? ''}
            {tutorClass.schedule_end
              ? ` - ${tutorClass.schedule_end}`
              : ''}
          </div>
        )}
      </div>

      {/* STUDENTS */}
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900">
              Siswa
            </h4>

            <p className="text-sm text-slate-500">
              {tutorClass.students.length} siswa aktif
            </p>
          </div>
        </div>

        {tutorClass.students.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            Belum ada siswa di kelas ini.
          </div>
        ) : (
          <div className="space-y-3">
            {tutorClass.students.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
                  👤
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {student.student_name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {student.grade_level ?? 'Kelas belum diatur'}
                    {student.school_name
                      ? ` • ${student.school_name}`
                      : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTION */}
        <button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Kelola Kelas →
        </button>
      </div>
    </div>
  )
}