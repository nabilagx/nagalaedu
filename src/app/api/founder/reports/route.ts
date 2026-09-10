import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import {
  requireFounder,
} from "@/lib/auth/requireFounder"

import {
  createAdminClient,
} from "@/lib/supabase/admin"

const MONTH_REGEX = /^\d{4}-\d{2}$/

function safeNumber(
  value: number | null | undefined,
) {
  return Number(value) || 0
}

function average(
  values: number[],
) {
  if (!values.length) return 0

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  )
}

function formatRupiah(
  value: number | null | undefined,
) {
  return `Rp ${new Intl.NumberFormat(
    "id-ID",
  ).format(safeNumber(value))}`
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  )
}

function formatMonth(
  month: string,
) {
  const date = new Date(
    `${month}-01T00:00:00`,
  )

  if (Number.isNaN(date.getTime())) {
    return month
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    },
  )
}

function csvEscape(
  value: unknown,
) {
  const stringValue = String(
    value ?? "",
  )

  return `"${stringValue.replace(
    /"/g,
    '""',
  )}"`
}

function normalizePaymentType(
  value: string | null | undefined,
) {
  if (!value) return "Tidak diketahui"

  const normalized =
    value.toLowerCase()

  const labels: Record<
    string,
    string
  > = {
    bank_transfer:
      "Bank Transfer",
    bca_va:
      "BCA Virtual Account",
    bni_va:
      "BNI Virtual Account",
    bri_va:
      "BRI Virtual Account",
    mandiri_va:
      "Mandiri Virtual Account",
    gopay:
      "GoPay",
    qris:
      "QRIS",
    shopeepay:
      "ShopeePay",
    credit_card:
      "Credit Card",
    cstore:
      "Convenience Store",
  }

  return (
    labels[normalized] ||
    value
  )
}

async function buildReport(
  month: string,
) {
  const admin =
    createAdminClient()

  /*
   * =========================================================
   * STUDENTS
   * =========================================================
   */

  const {
    data: students,
    error: studentsError,
  } = await admin
    .from("students")
    .select(
      `
        id,
        student_name,
        grade_level,
        school_name,
        phone_number,
        status
      `,
    )
    .order(
      "student_name",
      {
        ascending: true,
      },
    )

  if (studentsError) {
    console.error(
      "Students error:",
      studentsError,
    )

    throw new Error(
      "Gagal mengambil data siswa.",
    )
  }

  /*
   * =========================================================
   * CLASSES
   * =========================================================
   */

  const {
    data: classes,
    error: classesError,
  } = await admin
    .from("classes")
    .select(
      `
        id,
        class_name,
        subject,
        status
      `,
    )
    .order(
      "class_name",
      {
        ascending: true,
      },
    )

  if (classesError) {
    console.error(
      "Classes error:",
      classesError,
    )

    throw new Error(
      "Gagal mengambil data kelas.",
    )
  }

  /*
   * =========================================================
   * ENROLLMENTS
   * =========================================================
   */

  const {
    data: enrollments,
    error: enrollmentsError,
  } = await admin
    .from("class_enrollments")
    .select(
      `
        id,
        class_id,
        student_id,
        status
      `,
    )

  if (enrollmentsError) {
    console.error(
      "Enrollments error:",
      enrollmentsError,
    )

    throw new Error(
      "Gagal mengambil data enrollment.",
    )
  }

  const enrollmentIds =
    (enrollments || []).map(
      (item) => item.id,
    )

  /*
   * =========================================================
   * ATTENDANCE
   * =========================================================
   */

  let attendance: Array<{
    enrollment_id: string
    status: string
  }> = []

  if (enrollmentIds.length) {
    const {
      data,
      error,
    } = await admin
      .from("student_attendance")
      .select(
        `
          enrollment_id,
          status
        `,
      )
      .in(
        "enrollment_id",
        enrollmentIds,
      )

    if (error) {
      console.error(
        "Attendance error:",
        error,
      )

      throw new Error(
        "Gagal mengambil data kehadiran.",
      )
    }

    attendance =
      data || []
  }

  /*
   * =========================================================
   * GRADES
   * =========================================================
   */

  let grades: Array<{
    enrollment_id: string
    subject: string
    score: number
  }> = []

  if (enrollmentIds.length) {
    const {
      data,
      error,
    } = await admin
      .from("grades")
      .select(
        `
          enrollment_id,
          subject,
          score
        `,
      )
      .in(
        "enrollment_id",
        enrollmentIds,
      )

    if (error) {
      console.error(
        "Grades error:",
        error,
      )

      throw new Error(
        "Gagal mengambil data nilai.",
      )
    }

    grades =
      data || []
  }

  /*
   * =========================================================
   * FINANCE — SPP BILLS
   * =========================================================
   */

  const [
    year,
    monthNumber,
  ] = month
    .split("-")
    .map(Number)

  const nextMonthDate =
    new Date(
      year,
      monthNumber,
      1,
    )

  const nextMonthPeriod =
    `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1,
    ).padStart(2, "0")}-01`

  const {
    data: bills,
    error: billsError,
  } = await admin
    .from("spp_bills")
    .select(
      `
        id,
        student_id,
        order_id,
        month_period,
        amount,
        payment_status,
        paid_at
      `,
    )
    .gte(
      "month_period",
      `${month}-01`,
    )
    .lt(
      "month_period",
      nextMonthPeriod,
    )

  if (billsError) {
    console.error(
      "Bills error:",
      billsError,
    )

    throw new Error(
      "Gagal mengambil data tagihan.",
    )
  }

  /*
   * =========================================================
   * TRANSACTIONS
   * =========================================================
   */

  const billIds =
    (bills || []).map(
      (bill) => bill.id,
    )

  let transactions: Array<{
    id: string
    spp_bill_id: string
    transaction_id: string | null
    transaction_status: string | null
    payment_type: string | null
    gross_amount: number
    transaction_time: string | null
    settlement_time: string | null
    signature_verified: boolean | null
  }> = []

  if (billIds.length) {
    const {
      data,
      error,
    } = await admin
      .from("payment_transactions")
      .select(
        `
          id,
          spp_bill_id,
          transaction_id,
          transaction_status,
          payment_type,
          gross_amount,
          transaction_time,
          settlement_time,
          signature_verified
        `,
      )
      .in(
        "spp_bill_id",
        billIds,
      )
      .order(
        "transaction_time",
        {
          ascending: false,
        },
      )

    if (error) {
      console.error(
        "Transactions error:",
        error,
      )

      throw new Error(
        "Gagal mengambil data transaksi.",
      )
    }

    transactions =
      data || []
  }

  /*
   * =========================================================
   * MAPS
   * =========================================================
   */

  const studentMap =
    new Map(
      (students || []).map(
        (student) => [
          student.id,
          student,
        ],
      ),
    )

  const classMap =
    new Map(
      (classes || []).map(
        (item) => [
          item.id,
          item,
        ],
      ),
    )

  const enrollmentMap =
    new Map(
      (enrollments || []).map(
        (item) => [
          item.id,
          item,
        ],
      ),
    )

  /*
   * =========================================================
   * ACADEMIC SUMMARY
   * =========================================================
   */

  const totalStudents =
    students?.length || 0

  const activeStudents =
    (students || []).filter(
      (student) =>
        String(
          student.status,
        ).toUpperCase() ===
        "ACTIVE",
    ).length

  const inactiveStudents =
    totalStudents -
    activeStudents

  const totalClasses =
    classes?.length || 0

  const totalEnrollments =
    (enrollments || []).filter(
      (item) =>
        String(
          item.status,
        ).toUpperCase() ===
        "ACTIVE",
    ).length

  const allScores =
    grades
      .map((item) =>
        Number(item.score),
      )
      .filter(
        (score) =>
          Number.isFinite(score),
      )

  const averageGrade =
    average(allScores)

  /*
   * =========================================================
   * ATTENDANCE SUMMARY
   * =========================================================
   */

  let hadir = 0
  let izin = 0
  let sakit = 0
  let alpha = 0

  for (const item of attendance) {
    const status =
      String(
        item.status || "",
      ).toUpperCase()

    if (status === "HADIR") {
      hadir++
    } else if (
      status === "IZIN"
    ) {
      izin++
    } else if (
      status === "SAKIT"
    ) {
      sakit++
    } else if (
      status === "ALPHA"
    ) {
      alpha++
    }
  }

  const totalAttendance =
    attendance.length

  const attendanceRate =
    totalAttendance > 0
      ? (hadir /
          totalAttendance) *
        100
      : 0

  /*
   * =========================================================
   * STUDENT PERFORMANCE
   * =========================================================
   */

  const studentPerformance =
    new Map<
      string,
      {
        attendanceTotal: number
        attendanceHadir: number
        alpha: number
        scores: number[]
      }
    >()

  for (const enrollment of
    enrollments || []) {
    const existing =
      studentPerformance.get(
        enrollment.student_id,
      ) || {
        attendanceTotal: 0,
        attendanceHadir: 0,
        alpha: 0,
        scores: [],
      }

    const enrollmentAttendance =
      attendance.filter(
        (item) =>
          item.enrollment_id ===
          enrollment.id,
      )

    for (const item of
      enrollmentAttendance) {
      existing.attendanceTotal++

      const status =
        String(
          item.status || "",
        ).toUpperCase()

      if (status === "HADIR") {
        existing.attendanceHadir++
      }

      if (status === "ALPHA") {
        existing.alpha++
      }
    }

    const enrollmentGrades =
      grades.filter(
        (item) =>
          item.enrollment_id ===
          enrollment.id,
      )

    for (const item of
      enrollmentGrades) {
      const score =
        Number(item.score)

      if (
        Number.isFinite(score)
      ) {
        existing.scores.push(
          score,
        )
      }
    }

    studentPerformance.set(
      enrollment.student_id,
      existing,
    )
  }

  let studentsNeedAttention = 0

  for (const value of
    studentPerformance.values()) {
    const studentAttendance =
      value.attendanceTotal >
      0
        ? (value.attendanceHadir /
            value.attendanceTotal) *
          100
        : 100

    const studentAverage =
      average(value.scores)

    if (
      studentAttendance < 80 ||
      studentAverage < 70 ||
      value.alpha > 0
    ) {
      studentsNeedAttention++
    }
  }

  /*
   * =========================================================
   * CLASS PERFORMANCE
   * =========================================================
   */

  const classReports =
    (classes || []).map(
      (classItem) => {
        const classEnrollments =
          (enrollments || []).filter(
            (item) =>
              item.class_id ===
              classItem.id,
          )

        const classEnrollmentIds =
          classEnrollments.map(
            (item) => item.id,
          )

        const classAttendance =
          attendance.filter(
            (item) =>
              classEnrollmentIds.includes(
                item.enrollment_id,
              ),
          )

        const classHadir =
          classAttendance.filter(
            (item) =>
              String(
                item.status ||
                  "",
              ).toUpperCase() ===
              "HADIR",
          ).length

        const classAttendanceRate =
          classAttendance.length >
          0
            ? (classHadir /
                classAttendance.length) *
              100
            : 0

        const classScores =
          grades
            .filter(
              (item) =>
                classEnrollmentIds.includes(
                  item.enrollment_id,
                ),
            )
            .map((item) =>
              Number(item.score),
            )
            .filter(
              (score) =>
                Number.isFinite(
                  score,
                ),
            )

        return {
          id: classItem.id,
          className:
            classItem.class_name ||
            "-",
          subject:
            classItem.subject ||
            "-",
          status:
            classItem.status ||
            "-",
          studentCount:
            classEnrollments.filter(
              (item) =>
                String(
                  item.status,
                ).toUpperCase() ===
                "ACTIVE",
            ).length,
          attendanceRate:
            classAttendanceRate,
          averageScore:
            average(classScores),
        }
      },
    )

  /*
   * =========================================================
   * FINANCE SUMMARY
   * =========================================================
   */

  const billList =
    bills || []

  const totalBills =
    billList.length

  const paidBills =
    billList.filter(
      (bill) =>
        String(
          bill.payment_status,
        ).toUpperCase() ===
        "PAID",
    ).length

  const pendingBills =
    billList.filter(
      (bill) =>
        String(
          bill.payment_status,
        ).toUpperCase() ===
        "PENDING",
    ).length

  const failedBills =
    billList.filter(
      (bill) =>
        String(
          bill.payment_status,
        ).toUpperCase() ===
        "FAILED",
    ).length

  const expiredBills =
    billList.filter(
      (bill) =>
        String(
          bill.payment_status,
        ).toUpperCase() ===
        "EXPIRED",
    ).length

  const cancelledBills =
    billList.filter(
      (bill) =>
        String(
          bill.payment_status,
        ).toUpperCase() ===
        "CANCELLED",
    ).length

  const totalBilled =
    billList.reduce(
      (sum, bill) =>
        sum +
        safeNumber(
          bill.amount,
        ),
      0,
    )

  const totalPaid =
    billList
      .filter(
        (bill) =>
          String(
            bill.payment_status,
          ).toUpperCase() ===
          "PAID",
      )
      .reduce(
        (sum, bill) =>
          sum +
          safeNumber(
            bill.amount,
          ),
        0,
      )

  const totalUnpaid =
    Math.max(
      0,
      totalBilled -
        totalPaid,
    )

  /*
   * =========================================================
   * TRANSACTION SUMMARY
   * =========================================================
   */

  const transactionList =
    transactions || []

  const successfulTransactions =
    transactionList.filter(
      (item) => {
        const status =
          String(
            item.transaction_status ||
              "",
          ).toLowerCase()

        return (
          status ===
            "settlement" ||
          status ===
            "capture"
        )
      },
    )

  const failedTransactions =
    transactionList.filter(
      (item) =>
        [
          "deny",
          "cancel",
          "failure",
        ].includes(
          String(
            item.transaction_status ||
              "",
          ).toLowerCase(),
        ),
    )

  const pendingTransactions =
    transactionList.filter(
      (item) =>
        [
          "pending",
        ].includes(
          String(
            item.transaction_status ||
              "",
          ).toLowerCase(),
        ),
    )

  const totalTransactionAmount =
    successfulTransactions.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.gross_amount,
        ),
      0,
    )

  /*
   * =========================================================
   * PAYMENT METHODS
   * =========================================================
   */

  const paymentMethodMap =
    new Map<
      string,
      {
        payment_type: string
        transaction_count: number
        total_amount: number
      }
    >()

  for (const transaction of
    successfulTransactions) {
    const paymentType =
      normalizePaymentType(
        transaction.payment_type,
      )

    const existing =
      paymentMethodMap.get(
        paymentType,
      ) || {
        payment_type:
          paymentType,
        transaction_count: 0,
        total_amount: 0,
      }

    existing.transaction_count++
    existing.total_amount +=
      safeNumber(
        transaction.gross_amount,
      )

    paymentMethodMap.set(
      paymentType,
      existing,
    )
  }

  const paymentMethods =
    Array.from(
      paymentMethodMap.values(),
    ).sort(
      (a, b) =>
        b.total_amount -
        a.total_amount,
    )

  /*
   * =========================================================
   * STUDENT FINANCE
   * =========================================================
   */

  const studentFinance =
    billList
      .map((bill) => {
        const student =
          studentMap.get(
            bill.student_id,
          )

        if (!student) {
          return null
        }

        return {
          student_id:
            student.id,
          student_name:
            student.student_name,
          grade_level:
            student.grade_level,
          school_name:
            student.school_name,
          payment_status:
            bill.payment_status,
          amount:
            safeNumber(
              bill.amount,
            ),
          paid_at:
            bill.paid_at,
        }
      })
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => Boolean(item),
      )

  return {
    period: month,

    academic: {
      total_students:
        totalStudents,
      active_students:
        activeStudents,
      inactive_students:
        inactiveStudents,
      total_classes:
        totalClasses,
      total_enrollments:
        totalEnrollments,
      total_tutors: undefined,
      total_parents: undefined,
      total_founders: undefined,
      average_grade:
        averageGrade,
      attendance_rate:
        attendanceRate,
      students_need_attention:
        studentsNeedAttention,
    },

    attendance: {
      total_records:
        totalAttendance,
      hadir,
      izin,
      sakit,
      alpha,
      attendance_rate:
        attendanceRate,
    },

    finance: {
      total_bills:
        totalBills,
      paid_bills:
        paidBills,
      pending_bills:
        pendingBills,
      failed_bills:
        failedBills,
      expired_bills:
        expiredBills,
      cancelled_bills:
        cancelledBills,
      total_billed:
        totalBilled,
      total_paid:
        totalPaid,
      total_unpaid:
        totalUnpaid,
    },

    transactions: {
      total_transactions:
        transactionList.length,
      successful_transactions:
        successfulTransactions.length,
      failed_transactions:
        failedTransactions.length,
      pending_transactions:
        pendingTransactions.length,
      total_amount:
        totalTransactionAmount,
    },

    payment_methods:
      paymentMethods,

    classes:
      classReports,

    student_finance:
      studentFinance,
  }
}

/*
 * =========================================================
 * PDF HELPERS
 * =========================================================
 */

type PdfContext = {
  pdf: PDFDocument
  page: ReturnType<
    PDFDocument["addPage"]
  >
  font: Awaited<
    ReturnType<
      PDFDocument["embedFont"]
    >
  >
  boldFont: Awaited<
    ReturnType<
      PDFDocument["embedFont"]
    >
  >
  y: number
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

const MARGIN = 42

function drawText(
  ctx: PdfContext,
  text: string,
  x: number,
  y: number,
  size = 9,
  bold = false,
) {
  ctx.page.drawText(
    text,
    {
      x,
      y,
      size,
      font: bold
        ? ctx.boldFont
        : ctx.font,
      color: rgb(
        0.12,
        0.12,
        0.12,
      ),
    },
  )
}

function drawLine(
  ctx: PdfContext,
  y: number,
) {
  ctx.page.drawLine({
    start: {
      x: MARGIN,
      y,
    },
    end: {
      x:
        PAGE_WIDTH -
        MARGIN,
      y,
    },
    thickness: 0.7,
    color: rgb(
      0.82,
      0.82,
      0.82,
    ),
  })
}

function drawSectionTitle(
  ctx: PdfContext,
  title: string,
) {
  ensureSpace(
    ctx,
    45,
  )

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width:
      PAGE_WIDTH -
      MARGIN * 2,
    height: 24,
    color: rgb(
      0.96,
      0.96,
      0.96,
    ),
  })

  drawText(
    ctx,
    title,
    MARGIN + 8,
    ctx.y + 3,
    11,
    true,
  )

  ctx.y -= 34
}

function ensureSpace(
  ctx: PdfContext,
  requiredHeight: number,
) {
  if (
    ctx.y -
      requiredHeight <
    48
  ) {
    ctx.page =
      ctx.pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ])

    ctx.y =
      PAGE_HEIGHT -
      50

    drawFooter(
      ctx,
    )
  }
}

function drawFooter(
  ctx: PdfContext,
) {
  ctx.page.drawLine({
    start: {
      x: MARGIN,
      y: 32,
    },
    end: {
      x:
        PAGE_WIDTH -
        MARGIN,
      y: 32,
    },
    thickness: 0.5,
    color: rgb(
      0.82,
      0.82,
      0.82,
    ),
  })

  drawText(
    ctx,
    "NAGALA EDUCATION",
    MARGIN,
    19,
    7,
    true,
  )

  drawText(
    ctx,
    "Laporan internal sistem",
    PAGE_WIDTH -
      MARGIN -
      105,
    19,
    7,
    false,
  )
}

function drawMetric(
  ctx: PdfContext,
  title: string,
  value: string,
  x: number,
  width: number,
) {
  ensureSpace(
    ctx,
    62,
  )

  ctx.page.drawRectangle({
    x,
    y: ctx.y - 42,
    width,
    height: 50,
    borderWidth: 0.7,
    borderColor: rgb(
      0.85,
      0.85,
      0.85,
    ),
    color: rgb(
      0.985,
      0.985,
      0.985,
    ),
  })

  drawText(
    ctx,
    title,
    x + 8,
    ctx.y - 7,
    7.5,
    false,
  )

  drawText(
    ctx,
    value,
    x + 8,
    ctx.y - 27,
    12,
    true,
  )
}

function drawTableRow(
  ctx: PdfContext,
  values: string[],
  widths: number[],
  bold = false,
  header = false,
) {
  const rowHeight = 22

  ensureSpace(
    ctx,
    rowHeight + 5,
  )

  let x = MARGIN

  if (header) {
    ctx.page.drawRectangle({
      x: MARGIN,
      y:
        ctx.y -
        rowHeight +
        4,
      width:
        widths.reduce(
          (sum, width) =>
            sum + width,
          0,
        ),
      height: rowHeight,
      color: rgb(
        0.94,
        0.94,
        0.94,
      ),
    })
  }

  values.forEach(
    (value, index) => {
      drawText(
        ctx,
        truncate(
          value,
          Math.max(
            8,
            Math.floor(
              widths[index] /
                4.1,
            ),
          ),
        ),
        x + 5,
        ctx.y - 11,
        7.5,
        bold || header,
      )

      x += widths[index]
    },
  )

  ctx.y -= rowHeight

  if (!header) {
    drawLine(
      ctx,
      ctx.y + 3,
    )
  }
}

function truncate(
  text: string,
  maxLength: number,
) {
  if (
    text.length <=
    maxLength
  ) {
    return text
  }

  return (
    text.slice(
      0,
      Math.max(
        1,
        maxLength - 3,
      ),
    ) + "..."
  )
}

/*
 * =========================================================
 * GENERATE PDF
 * =========================================================
 */

async function generatePDF(
  report: Awaited<
    ReturnType<
      typeof buildReport
    >
  >,
) {
  const pdf =
    await PDFDocument.create()

  const font =
    await pdf.embedFont(
      StandardFonts.Helvetica,
    )

  const boldFont =
    await pdf.embedFont(
      StandardFonts.HelveticaBold,
    )

  const firstPage =
    pdf.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ])

  const ctx: PdfContext = {
    pdf,
    page: firstPage,
    font,
    boldFont,
    y:
      PAGE_HEIGHT -
      48,
  }

  /*
   * HEADER
   */

  drawText(
    ctx,
    "NAGALA EDUCATION",
    MARGIN,
    ctx.y,
    18,
    true,
  )

  ctx.y -= 23

  drawText(
    ctx,
    "LAPORAN BULANAN",
    MARGIN,
    ctx.y,
    13,
    true,
  )

  ctx.y -= 17

  drawText(
    ctx,
    `Periode ${formatMonth(
      report.period,
    )}`,
    MARGIN,
    ctx.y,
    9,
  )

  drawLine(
    ctx,
    ctx.y - 12,
  )

  ctx.y -= 32

  /*
   * RINGKASAN UTAMA
   */

  drawSectionTitle(
    ctx,
    "1. Ringkasan Utama",
  )

  const gap = 10

  const metricWidth =
    (PAGE_WIDTH -
      MARGIN * 2 -
      gap * 3) /
    4

  drawMetric(
    ctx,
    "Total Siswa",
    String(
      report.academic
        .total_students,
    ),
    MARGIN,
    metricWidth,
  )

  drawMetric(
    ctx,
    "Rata-rata Nilai",
    report.academic.average_grade.toFixed(
      1,
    ),
    MARGIN +
      (metricWidth +
        gap),
    metricWidth,
  )

  drawMetric(
    ctx,
    "Kehadiran",
    `${report.academic.attendance_rate.toFixed(
      1,
    )}%`,
    MARGIN +
      (metricWidth +
        gap) *
        2,
    metricWidth,
  )

  drawMetric(
    ctx,
    "Pendapatan",
    formatRupiah(
      report.finance.total_paid,
    ),
    MARGIN +
      (metricWidth +
        gap) *
        3,
    metricWidth,
  )

  ctx.y -= 68

  /*
   * AKADEMIK
   */

  drawSectionTitle(
    ctx,
    "2. Rekap Akademik",
  )

  const academicRows = [
    [
      "Total siswa",
      String(
        report.academic
          .total_students,
      ),
    ],
    [
      "Siswa aktif",
      String(
        report.academic
          .active_students,
      ),
    ],
    [
      "Siswa tidak aktif",
      String(
        report.academic
          .inactive_students,
      ),
    ],
    [
      "Total kelas",
      String(
        report.academic
          .total_classes,
      ),
    ],
    [
      "Total enrollment aktif",
      String(
        report.academic
          .total_enrollments,
      ),
    ],
    [
      "Rata-rata nilai",
      report.academic.average_grade.toFixed(
        1,
      ),
    ],
    [
      "Siswa perlu perhatian",
      String(
        report.academic
          .students_need_attention,
      ),
    ],
  ]

  for (const row of academicRows) {
    ensureSpace(
      ctx,
      22,
    )

    drawText(
      ctx,
      row[0],
      MARGIN,
      ctx.y,
      8.5,
      false,
    )

    drawText(
      ctx,
      row[1],
      MARGIN + 230,
      ctx.y,
      8.5,
      true,
    )

    ctx.y -= 20

    drawLine(
      ctx,
      ctx.y + 5,
    )
  }

  /*
   * KEHADIRAN
   */

  drawSectionTitle(
    ctx,
    "3. Rekap Kehadiran",
  )

  const attendanceRows = [
    [
      "Total catatan",
      String(
        report.attendance
          .total_records,
      ),
    ],
    [
      "Hadir",
      String(
        report.attendance
          .hadir,
      ),
    ],
    [
      "Izin",
      String(
        report.attendance
          .izin,
      ),
    ],
    [
      "Sakit",
      String(
        report.attendance
          .sakit,
      ),
    ],
    [
      "Alpha",
      String(
        report.attendance
          .alpha,
      ),
    ],
    [
      "Tingkat kehadiran",
      `${report.attendance.attendance_rate.toFixed(
        1,
      )}%`,
    ],
  ]

  for (const row of attendanceRows) {
    ensureSpace(
      ctx,
      22,
    )

    drawText(
      ctx,
      row[0],
      MARGIN,
      ctx.y,
      8.5,
    )

    drawText(
      ctx,
      row[1],
      MARGIN + 230,
      ctx.y,
      8.5,
      true,
    )

    ctx.y -= 20

    drawLine(
      ctx,
      ctx.y + 5,
    )
  }

  /*
   * FINANCE
   */

  drawSectionTitle(
    ctx,
    "4. Rekap Keuangan",
  )

  const financeRows = [
    [
      "Total tagihan",
      String(
        report.finance
          .total_bills,
      ),
    ],
    [
      "Tagihan lunas",
      String(
        report.finance
          .paid_bills,
      ),
    ],
    [
      "Tagihan pending",
      String(
        report.finance
          .pending_bills,
      ),
    ],
    [
      "Tagihan gagal",
      String(
        report.finance
          .failed_bills,
      ),
    ],
    [
      "Total nominal tagihan",
      formatRupiah(
        report.finance
          .total_billed,
      ),
    ],
    [
      "Total pembayaran diterima",
      formatRupiah(
        report.finance
          .total_paid,
      ),
    ],
    [
      "Total belum lunas",
      formatRupiah(
        report.finance
          .total_unpaid,
      ),
    ],
  ]

  for (const row of financeRows) {
    ensureSpace(
      ctx,
      22,
    )

    drawText(
      ctx,
      row[0],
      MARGIN,
      ctx.y,
      8.5,
    )

    drawText(
      ctx,
      row[1],
      MARGIN + 230,
      ctx.y,
      8.5,
      true,
    )

    ctx.y -= 20

    drawLine(
      ctx,
      ctx.y + 5,
    )
  }

  /*
   * TRANSACTIONS
   */

  drawSectionTitle(
    ctx,
    "5. Rekap Transaksi",
  )

  const transactionRows = [
    [
      "Total transaksi",
      String(
        report.transactions
          .total_transactions,
      ),
    ],
    [
      "Transaksi berhasil",
      String(
        report.transactions
          .successful_transactions,
      ),
    ],
    [
      "Transaksi gagal",
      String(
        report.transactions
          .failed_transactions,
      ),
    ],
    [
      "Transaksi pending",
      String(
        report.transactions
          .pending_transactions,
      ),
    ],
    [
      "Total nilai transaksi",
      formatRupiah(
        report.transactions
          .total_amount,
      ),
    ],
  ]

  for (const row of transactionRows) {
    ensureSpace(
      ctx,
      22,
    )

    drawText(
      ctx,
      row[0],
      MARGIN,
      ctx.y,
      8.5,
    )

    drawText(
      ctx,
      row[1],
      MARGIN + 230,
      ctx.y,
      8.5,
      true,
    )

    ctx.y -= 20

    drawLine(
      ctx,
      ctx.y + 5,
    )
  }

  /*
   * PAYMENT METHODS
   */

  if (
    report.payment_methods
      .length
  ) {
    drawSectionTitle(
      ctx,
      "6. Metode Pembayaran",
    )

    const widths = [
      220,
      100,
      150,
    ]

    drawTableRow(
      ctx,
      [
        "Metode",
        "Transaksi",
        "Total",
      ],
      widths,
      true,
      true,
    )

    for (const item of
      report.payment_methods) {
      drawTableRow(
        ctx,
        [
          item.payment_type,
          String(
            item.transaction_count,
          ),
          formatRupiah(
            item.total_amount,
          ),
        ],
        widths,
      )
    }
  }

  /*
   * CLASS PERFORMANCE
   */

  if (
    report.classes.length
  ) {
    drawSectionTitle(
      ctx,
      "7. Performa Kelas",
    )

    const widths = [
      120,
      115,
      65,
      55,
      90,
      70,
    ]

    drawTableRow(
      ctx,
      [
        "Kelas",
        "Mata Pelajaran",
        "Status",
        "Siswa",
        "Kehadiran",
        "Rata-rata",
      ],
      widths,
      true,
      true,
    )

    for (const item of
      report.classes) {
      drawTableRow(
        ctx,
        [
          item.className,
          item.subject,
          item.status,
          String(
            item.studentCount,
          ),
          `${item.attendanceRate.toFixed(
            1,
          )}%`,
          item.averageScore.toFixed(
            1,
          ),
        ],
        widths,
      )
    }
  }

  /*
   * STUDENT FINANCE
   */

  if (
    report.student_finance
      .length
  ) {
    drawSectionTitle(
      ctx,
      "8. Status Pembayaran Siswa",
    )

    const widths = [
      145,
      65,
      120,
      75,
      95,
    ]

    drawTableRow(
      ctx,
      [
        "Siswa",
        "Jenjang",
        "Sekolah",
        "Status",
        "Nominal",
      ],
      widths,
      true,
      true,
    )

    for (const item of
      report.student_finance) {
      drawTableRow(
        ctx,
        [
          item.student_name,
          item.grade_level,
          item.school_name,
          item.payment_status,
          formatRupiah(
            item.amount,
          ),
        ],
        widths,
      )
    }
  }

  /*
   * CLOSING
   */

  ensureSpace(
    ctx,
    80,
  )

  ctx.y -= 12

  drawLine(
    ctx,
    ctx.y,
  )

  ctx.y -= 25

  drawText(
    ctx,
    "Catatan",
    MARGIN,
    ctx.y,
    9,
    true,
  )

  ctx.y -= 16

  drawText(
    ctx,
    "Laporan ini dibuat secara otomatis oleh sistem NAGALA Education.",
    MARGIN,
    ctx.y,
    8,
  )

  ctx.y -= 13

  drawText(
    ctx,
    "Data akademik menggunakan data akademik yang tersimpan.",
    MARGIN,
    ctx.y,
    8,
  )

  ctx.y -= 13

  drawText(
    ctx,
    "Data keuangan dan transaksi mengikuti periode laporan yang dipilih.",
    MARGIN,
    ctx.y,
    8,
  )

  /*
   * FOOTER DI SEMUA HALAMAN
   */

  const pages =
    pdf.getPages()

  pages.forEach(
    (page) => {
      const footerCtx: PdfContext = {
        pdf,
        page,
        font,
        boldFont,
        y: 0,
      }

      drawFooter(
        footerCtx,
      )
    },
  )

  /*
   * PAGE NUMBER
   */

  pages.forEach(
    (page, index) => {
      page.drawText(
        `Halaman ${
          index + 1
        } / ${pages.length}`,
        {
          x:
            PAGE_WIDTH -
            MARGIN -
            75,
          y: 19,
          size: 7,
          font,
          color: rgb(
            0.35,
            0.35,
            0.35,
          ),
        },
      )
    },
  )

  return pdf.save()
}

/*
 * =========================================================
 * CSV
 * =========================================================
 */

function generateCSV(
  report: Awaited<
    ReturnType<
      typeof buildReport
    >
  >,
) {
  const rows: string[][] = []

  rows.push([
    "NAGALA EDUCATION - LAPORAN BULANAN",
  ])

  rows.push([
    `Periode: ${formatMonth(
      report.period,
    )}`,
  ])

  rows.push([])

  rows.push([
    "RINGKASAN AKADEMIK",
  ])

  rows.push([
    "Metric",
    "Nilai",
  ])

  rows.push([
    "Total Siswa",
    String(
      report.academic
        .total_students,
    ),
  ])

  rows.push([
    "Siswa Aktif",
    String(
      report.academic
        .active_students,
    ),
  ])

  rows.push([
    "Siswa Tidak Aktif",
    String(
      report.academic
        .inactive_students,
    ),
  ])

  rows.push([
    "Total Kelas",
    String(
      report.academic
        .total_classes,
    ),
  ])

  rows.push([
    "Rata-rata Nilai",
    report.academic.average_grade.toFixed(
      1,
    ),
  ])

  rows.push([
    "Kehadiran",
    `${report.academic.attendance_rate.toFixed(
      1,
    )}%`,
  ])

  rows.push([
    "Siswa Perlu Perhatian",
    String(
      report.academic
        .students_need_attention,
    ),
  ])

  rows.push([])

  rows.push([
    "KEHADIRAN",
  ])

  rows.push([
    "Metric",
    "Nilai",
  ])

  rows.push([
    "Total",
    String(
      report.attendance
        .total_records,
    ),
  ])

  rows.push([
    "Hadir",
    String(
      report.attendance
        .hadir,
    ),
  ])

  rows.push([
    "Izin",
    String(
      report.attendance
        .izin,
    ),
  ])

  rows.push([
    "Sakit",
    String(
      report.attendance
        .sakit,
    ),
  ])

  rows.push([
    "Alpha",
    String(
      report.attendance
        .alpha,
    ),
  ])

  rows.push([
    "Tingkat Kehadiran",
    `${report.attendance.attendance_rate.toFixed(
      1,
    )}%`,
  ])

  rows.push([])

  rows.push([
    "KEUANGAN",
  ])

  rows.push([
    "Metric",
    "Nilai",
  ])

  rows.push([
    "Total Tagihan",
    String(
      report.finance
        .total_bills,
    ),
  ])

  rows.push([
    "Lunas",
    String(
      report.finance
        .paid_bills,
    ),
  ])

  rows.push([
    "Pending",
    String(
      report.finance
        .pending_bills,
    ),
  ])

  rows.push([
    "Gagal",
    String(
      report.finance
        .failed_bills,
    ),
  ])

  rows.push([
    "Total Ditagihkan",
    formatRupiah(
      report.finance
        .total_billed,
    ),
  ])

  rows.push([
    "Total Dibayar",
    formatRupiah(
      report.finance
        .total_paid,
    ),
  ])

  rows.push([
    "Total Belum Lunas",
    formatRupiah(
      report.finance
        .total_unpaid,
    ),
  ])

  rows.push([])

  rows.push([
    "TRANSAKSI",
  ])

  rows.push([
    "Metric",
    "Nilai",
  ])

  rows.push([
    "Total Transaksi",
    String(
      report.transactions
        .total_transactions,
    ),
  ])

  rows.push([
    "Berhasil",
    String(
      report.transactions
        .successful_transactions,
    ),
  ])

  rows.push([
    "Gagal",
    String(
      report.transactions
        .failed_transactions,
    ),
  ])

  rows.push([
    "Pending",
    String(
      report.transactions
        .pending_transactions,
    ),
  ])

  rows.push([
    "Total Nilai",
    formatRupiah(
      report.transactions
        .total_amount,
    ),
  ])

  rows.push([])

  rows.push([
    "PERFORMA KELAS",
  ])

  rows.push([
    "Kelas",
    "Mata Pelajaran",
    "Status",
    "Siswa",
    "Kehadiran",
    "Rata-rata",
  ])

  for (const item of
    report.classes) {
    rows.push([
      item.className,
      item.subject,
      item.status,
      String(
        item.studentCount,
      ),
      `${item.attendanceRate.toFixed(
        1,
      )}%`,
      item.averageScore.toFixed(
        1,
      ),
    ])
  }

  rows.push([])

  rows.push([
    "STATUS PEMBAYARAN SISWA",
  ])

  rows.push([
    "Siswa",
    "Jenjang",
    "Sekolah",
    "Status",
    "Nominal",
    "Tanggal Bayar",
  ])

  for (const item of
    report.student_finance) {
    rows.push([
      item.student_name,
      item.grade_level,
      item.school_name,
      item.payment_status,
      formatRupiah(
        item.amount,
      ),
      formatDate(
        item.paid_at,
      ),
    ])
  }

  return rows
    .map((row) =>
      row
        .map(csvEscape)
        .join(","),
    )
    .join("\n")
}

/*
 * =========================================================
 * GET
 * =========================================================
 */

export async function GET(
  request: NextRequest,
) {
  try {
    const auth =
      await requireFounder()

    if (
      auth instanceof NextResponse
    ) {
      return auth
    }

    const { searchParams } =
      new URL(
        request.url,
      )

    const month =
      searchParams.get(
        "month",
      ) || ""

    const exportType =
      searchParams.get(
        "export",
      )

    if (
      !MONTH_REGEX.test(month)
    ) {
      return NextResponse.json(
        {
          message:
            "Format periode tidak valid. Gunakan YYYY-MM.",
        },
        {
          status: 400,
        },
      )
    }

    const report =
      await buildReport(
        month,
      )

    /*
     * =====================================================
     * PDF
     * =====================================================
     */

    if (
      exportType === "pdf"
    ) {
      const pdfBytes =
        await generatePDF(
          report,
        )

      const filename =
        `laporan-nagala-${month}.pdf`

      return new NextResponse(
        Buffer.from(pdfBytes),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              `attachment; filename="${filename}"`,

            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      )
    }

    /*
     * =====================================================
     * CSV
     * =====================================================
     */

    if (
      exportType === "csv"
    ) {
      const csv =
        generateCSV(
          report,
        )

      const filename =
        `laporan-nagala-${month}.csv`

      return new NextResponse(
        `\uFEFF${csv}`,
        {
          status: 200,
          headers: {
            "Content-Type":
              "text/csv; charset=utf-8",

            "Content-Disposition":
              `attachment; filename="${filename}"`,

            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      )
    }

    /*
     * =====================================================
     * JSON
     * =====================================================
     */

    return NextResponse.json(
      report,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error(
      "Founder reports error:",
      error,
    )

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data laporan.",
      },
      {
        status: 500,
      },
    )
  }
}