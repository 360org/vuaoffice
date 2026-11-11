import { describe, it, expect } from 'vitest'
import { getHardwareMachineId } from '../src/main/machine-id'

describe('Hardware Machine ID', () => {
  it('trả về chuỗi ID phần cứng hợp lệ, bất biến và không rỗng', () => {
    const id1 = getHardwareMachineId()
    const id2 = getHardwareMachineId()

    expect(id1).toBeDefined()
    expect(typeof id1).toBe('string')
    expect(id1.length).toBeGreaterThanOrEqual(16)
    // Phải bất biến giữa các lần gọi
    expect(id1).toBe(id2)
    // Phải là chữ thường chuẩn hóa
    expect(id1).toBe(id1.toLowerCase())
  })
})
