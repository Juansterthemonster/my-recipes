// Fetches a public web page for the recipe importer, with the protections a "fetch any URL" feature needs:
//   • http/https on the normal ports only, no credentials, no IP-address hosts
//   • the address the connection actually uses is checked (private, loopback, link-local, etc. are refused),
//     so a hostname that points at an internal address, or DNS tricks, can't reach our network
//   • redirects are followed by hand (max 4) and every hop goes through the same checks
//   • time limit, size limit (also after decompression), HTML content only

import https from 'node:https'
import http from 'node:http'
import dns from 'node:dns'
import net from 'node:net'
import zlib from 'node:zlib'

export class FetchError extends Error {
  constructor(code, message) { super(message || code); this.code = code }
}

const MAX_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 4

export function isPrivateAddress(ip) {
  const fam = net.isIP(ip)
  if (fam === 4) {
    const [a, b, c] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)          // carrier-grade NAT
      || (a === 169 && b === 254)                    // link-local, cloud metadata
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0 && c === 0)
      || (a === 198 && (b === 18 || b === 19))
  }
  if (fam === 6) {
    const x = ip.toLowerCase()
    if (x === '::' || x === '::1') return true
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    if (x.startsWith('::ffff:') || x.startsWith('64:ff9b:')) return true
    return /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith('ff') || x.startsWith('2001:db8')
  }
  return true
}

// Used by the socket itself, so the address that is checked is the address that is connected to
function guardedLookup(hostname, options, cb) {
  dns.lookup(hostname, { all: true }, (err, addrs) => {
    if (err) return cb(err)
    const ok = addrs.filter(a => !isPrivateAddress(a.address))
    if (!ok.length || ok.length !== addrs.length) return cb(new FetchError('blocked_address'))
    if (options?.all) return cb(null, ok)
    cb(null, ok[0].address, ok[0].family)
  })
}

export function checkUrl(raw) {
  let u
  try { u = new URL(String(raw).trim()) } catch { throw new FetchError('invalid_url') }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new FetchError('invalid_url')
  if (u.username || u.password) throw new FetchError('invalid_url')
  if (u.port && u.port !== '80' && u.port !== '443') throw new FetchError('invalid_url')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) || !host.includes('.')) throw new FetchError('invalid_url')   // no IP literals, no bare hosts
  return u
}

function decoder(res) {
  const enc = String(res.headers['content-encoding'] || '').toLowerCase()
  if (enc === 'gzip' || enc === 'x-gzip') return zlib.createGunzip()
  if (enc === 'deflate') return zlib.createInflate()
  if (enc === 'br') return zlib.createBrotliDecompress()
  return null
}

function requestOnce(u) {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.request(u, {
      method: 'GET', lookup: guardedLookup, timeout: TIMEOUT_MS,
      headers: {
        // Sent on behalf of a signed-in person who pasted this link, like their own browser opening it.
        // Many recipe sites turn away requests that don't look like a browser.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Upgrade-Insecure-Requests': '1',
      },
    }, res => {
      const status = res.statusCode || 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume(); resolve({ redirect: new URL(res.headers.location, u).toString() }); return
      }
      if (status < 200 || status >= 300) { res.resume(); reject(new FetchError('http_' + status)); return }
      const type = String(res.headers['content-type'] || '')
      if (type && !/html|xml/i.test(type)) { res.resume(); reject(new FetchError('not_html')); return }
      const charset = type.match(/charset=([\w-]+)/i)?.[1] || 'utf-8'
      const chunks = []; let size = 0
      const stream = decoder(res)
      const src = stream ? res.pipe(stream) : res
      if (stream) stream.on('error', () => reject(new FetchError('fetch_failed')))
      src.on('data', c => {
        size += c.length
        if (size > MAX_BYTES) { req.destroy(); reject(new FetchError('too_large')); return }
        chunks.push(c)
      })
      src.on('end', () => {
        let html
        try { html = new TextDecoder(charset).decode(Buffer.concat(chunks)) } catch { html = Buffer.concat(chunks).toString('utf8') }
        resolve({ html, url: u.toString() })
      })
    })
    req.on('timeout', () => { req.destroy(); reject(new FetchError('timeout')) })
    req.on('error', e => reject(e instanceof FetchError ? e : new FetchError(e?.code === 'blocked_address' ? 'blocked_address' : 'fetch_failed')))
    req.end()
  })
}

export async function fetchPage(raw) {
  let u = checkUrl(raw)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const r = await requestOnce(u)
    if (r.html != null) return r
    u = checkUrl(r.redirect)
  }
  throw new FetchError('too_many_redirects')
}
