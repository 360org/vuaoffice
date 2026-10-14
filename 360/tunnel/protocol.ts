/**
 * VuaOffice Egress Tunnel — Binary Protocol Framing.
 *
 * 100% Node.js standard library (Zero 3rd-party dependencies).
 * Lives under 360/tunnel/ (protected by .gitattributes merge=ours).
 *
 * Frame Format:
 * [1 byte: Type] [4 bytes: Stream ID (UInt32BE)] [4 bytes: Payload Length (UInt32BE)] [Payload]
 */

export const FrameType = {
  CONNECT: 1,    // Request to open TCP connection to destination { host: string, port: number }
  DATA: 2,       // Raw data chunk for streamId
  CLOSE: 3,      // Close streamId
  CONNECTED: 4,  // Connection established successfully
  ERROR: 5,      // Connection failed or rejected by security gate
  PING: 6,       // Heartbeat ping
  PONG: 7,       // Heartbeat pong
} as const

export type FrameType = (typeof FrameType)[keyof typeof FrameType]

export const HEADER_SIZE = 9 // 1 + 4 + 4

export interface ConnectPayload {
  host: string
  port: number
}

/**
 * Creates a binary frame buffer from type, streamId, and optional payload.
 */
export function encodeFrame(
  type: FrameType,
  streamId: number,
  payload: Buffer = Buffer.alloc(0),
): Buffer {
  const header = Buffer.alloc(HEADER_SIZE)
  header[0] = type
  header.writeUInt32BE(streamId, 1)
  header.writeUInt32BE(payload.length, 5)
  return payload.length > 0 ? Buffer.concat([header, payload]) : header
}

export type FrameHandler = (type: FrameType, streamId: number, payload: Buffer) => void

/**
 * Stream frame parser that handles chunk boundaries, fragmentation and assembly.
 */
export function createFrameParser(onFrame: FrameHandler): (chunk: Buffer) => void {
  let accumulator = Buffer.alloc(0)

  return (chunk: Buffer) => {
    accumulator = Buffer.concat([accumulator, chunk])

    while (accumulator.length >= HEADER_SIZE) {
      const payloadLength = accumulator.readUInt32BE(5)
      const totalFrameSize = HEADER_SIZE + payloadLength

      if (accumulator.length < totalFrameSize) {
        // Incomplete frame, wait for more data
        break
      }

      const type = accumulator[0] as FrameType
      const streamId = accumulator.readUInt32BE(1)
      const payload = accumulator.subarray(HEADER_SIZE, totalFrameSize)

      onFrame(type, streamId, payload)

      accumulator = accumulator.subarray(totalFrameSize)
    }
  }
}
