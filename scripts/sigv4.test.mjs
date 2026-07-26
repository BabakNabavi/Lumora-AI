/**
 * Verifies the hand-rolled SigV4 signer against the canonical example published
 * by AWS ("GET Object" in the Signature Version 4 examples).
 *
 *   node scripts/sigv4.test.mjs
 */

import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const source = readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'storage', 'sigv4.ts'),
  'utf8',
)

// Strip the TypeScript-only constructs so the module can be evaluated directly.
const js = source
  .replace(/^import .*$/gm, '')
  .replace(/export interface SignInput \{[\s\S]*?\n\}/m, '')
  .replace(/: SignInput/g, '')
  .replace(/: Record<string, string>/g, '')
  .replace(/: Buffer \| string/g, '')
  .replace(/: string/g, '')
  .replace(/: boolean/g, '')
  .replace(/\bexport\s+/g, '')
  .replace(/ as const/g, '')
  .replace(/\[\.\.\.url\.searchParams\.entries\(\)\]/g, '[...url.searchParams.entries()]')

const factory = new Function(
  'createHash',
  'createHmac',
  'Buffer',
  'URL',
  `${js}; return { signRequest }`,
)
const { signRequest } = factory(createHash, createHmac, Buffer, URL)

const headers = signRequest({
  method: 'GET',
  url: 'https://examplebucket.s3.amazonaws.com/test.txt',
  region: 'us-east-1',
  service: 's3',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  headers: { range: 'bytes=0-9' },
  body: '',
  date: new Date('2013-05-24T00:00:00Z'),
})

const EMPTY_SHA =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
assert.equal(headers['x-amz-content-sha256'], EMPTY_SHA, 'payload hash')
assert.equal(headers['x-amz-date'], '20130524T000000Z', 'amz date')

const expected =
  'AWS4-HMAC-SHA256 ' +
  'Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
  'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, ' +
  'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'

assert.equal(headers.authorization, expected, 'authorization header')

console.log('✓ SigV4 signer matches the AWS reference vector')
