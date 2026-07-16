/**
 * Load `ws` with native optional deps disabled.
 * Next/Vercel bundles can stub `bufferutil` as a non-functional object; then
 * client frames >32B crash with `t.unmask is not a function` and session.update
 * never reaches xAI (dialing hangs until ack timeout).
 */
process.env.WS_NO_BUFFER_UTIL = '1'
process.env.WS_NO_UTF_8_VALIDATE = '1'

// require (not import) so env is set before ws evaluates buffer-util.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebSocket = require('ws') as typeof import('ws')

export default WebSocket
export type { RawData } from 'ws'
