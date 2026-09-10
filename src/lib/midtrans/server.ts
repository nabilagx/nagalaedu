import crypto from 'crypto'

const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY

const IS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === 'true'

export const MIDTRANS_API_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com'

if (!MIDTRANS_SERVER_KEY) {
  throw new Error(
    'MIDTRANS_SERVER_KEY belum dikonfigurasi.'
  )
}

export function createMidtransAuthHeader() {
  return (
    'Basic ' +
    Buffer.from(
      `${MIDTRANS_SERVER_KEY}:`
    ).toString('base64')
  )
}

export function verifyMidtransSignature({
  orderId,
  statusCode,
  grossAmount,
  signatureKey,
}: {
  orderId: string
  statusCode: string
  grossAmount: string
  signatureKey: string
}) {
  const raw =
    orderId +
    statusCode +
    grossAmount +
    MIDTRANS_SERVER_KEY

  const expected = crypto
    .createHash('sha512')
    .update(raw)
    .digest('hex')

  if (expected.length !== signatureKey.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureKey)
  )
}