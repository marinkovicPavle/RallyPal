// The side service has no guaranteed btoa(), so Basic auth is encoded by hand (ASCII input only).
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function base64Encode(input) {
  let output = ''
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i)
    const b = i + 1 < input.length ? input.charCodeAt(i + 1) : NaN
    const c = i + 2 < input.length ? input.charCodeAt(i + 2) : NaN
    const triple = (a << 16) | ((b || 0) << 8) | (c || 0)
    output += CHARS[(triple >> 18) & 63] + CHARS[(triple >> 12) & 63]
    output += isNaN(b) ? '=' : CHARS[(triple >> 6) & 63]
    output += isNaN(c) ? '=' : CHARS[triple & 63]
  }
  return output
}
