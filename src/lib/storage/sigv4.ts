import { createHash, createHmac } from 'node:crypto'

/**
 * Minimal AWS Signature Version 4 signer.
 *
 * Implemented directly rather than pulling in the AWS SDK: the S3 driver only
 * needs PUT / GET / HEAD / DELETE on a single object, and this keeps the server
 * bundle small while working unchanged against S3, Cloudflare R2, MinIO and
 * Backblaze B2.
 *
 * Verified against the canonical example in the AWS "Signature Version 4 test
 * suite" — see `sigv4.test.mjs`.
 */

export interface SignInput {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE'
  /** Full request URL including any query string. */
  url: string
  region: string
  service?: string
  accessKeyId: string
  secretAccessKey: string
  /** Extra headers to include in the signature (host is added automatically). */
  headers?: Record<string, string>
  /** Raw request body; hashed into the signature. */
  body?: Buffer | string
  /** Overrides "now" — used by the test vector. */
  date?: Date
  /** Pre-computed payload hash (e.g. UNSIGNED-PAYLOAD). */
  payloadHash?: string
}

const sha256Hex = (data: Buffer | string) =>
  createHash('sha256').update(data).digest('hex')

const hmac = (key: Buffer | string, data: string) =>
  createHmac('sha256', key).update(data, 'utf8').digest()

/** RFC 3986 encoding — AWS requires the stricter form for path segments. */
function uriEncode(value: string, encodeSlash: boolean): string {
  let out = ''
  for (const ch of value) {
    if (/[A-Za-z0-9_\-~.]/.test(ch)) {
      out += ch
    } else if (ch === '/') {
      out += encodeSlash ? '%2F' : '/'
    } else {
      out += Array.from(Buffer.from(ch, 'utf8'))
        .map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`)
        .join('')
    }
  }
  return out
}

export function signRequest(input: SignInput): Record<string, string> {
  const {
    method,
    region,
    service = 's3',
    accessKeyId,
    secretAccessKey,
    body = '',
    date = new Date(),
  } = input

  const url = new URL(input.url)
  const amzDate = date.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const shortDate = amzDate.slice(0, 8)
  const payloadHash = input.payloadHash ?? sha256Hex(body)

  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...Object.fromEntries(
      Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    ),
  }

  const signedHeaderNames = Object.keys(headers).sort()
  const canonicalHeaders = signedHeaderNames
    .map((k) => `${k}:${headers[k].trim().replace(/\s+/g, ' ')}\n`)
    .join('')
  const signedHeaders = signedHeaderNames.join(';')

  const canonicalUri = uriEncode(decodeURIComponent(url.pathname), false)
  const canonicalQuery = [...url.searchParams.entries()]
    .map(([k, v]) => [uriEncode(k, true), uriEncode(v, true)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${shortDate}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, shortDate), region), service),
    'aws4_request',
  )
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex')

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}
