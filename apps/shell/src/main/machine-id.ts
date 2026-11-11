import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

let cachedMachineId: string | null = null

/**
 * Định danh phần cứng vật lý máy tính duy nhất (Hardware Machine ID).
 * - macOS: IOPlatformUUID (Apple Hardware UUID bất biến).
 * - Windows: MachineGuid trong Registry (hoặc Win32_ComputerSystemProduct UUID).
 * - Linux: /etc/machine-id hoặc /var/lib/dbus/machine-id.
 *
 * Kết quả được lưu vào ~/.vuaoffice/machine-id để đảm bảo vĩnh viễn không thay đổi
 * ngay cả khi người dùng cài lại ứng dụng hoặc xóa app data.
 */
export function getHardwareMachineId(): string {
  if (cachedMachineId) return cachedMachineId

  const homeDir = os.homedir()
  const dotDir = join(homeDir, '.vuaoffice')
  const machineIdFile = join(dotDir, 'machine-id')

  // 1. Kiểm tra cache toàn cục tại ~/.vuaoffice/machine-id
  try {
    if (existsSync(machineIdFile)) {
      const saved = readFileSync(machineIdFile, 'utf8').trim()
      if (saved && saved.length >= 16) {
        cachedMachineId = saved.toLowerCase()
        return cachedMachineId
      }
    }
  } catch {}

  // 2. Truy xuất định danh phần cứng theo hệ điều hành
  let hardwareId = ''
  const platform = process.platform

  try {
    if (platform === 'darwin') {
      try {
        const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { timeout: 2000, encoding: 'utf8' })
        const match = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i)
        if (match && match[1]) {
          hardwareId = match[1].trim()
        }
      } catch {
        const out = execSync('sysctl -n kern.uuid', { timeout: 2000, encoding: 'utf8' })
        if (out && out.trim()) {
          hardwareId = out.trim()
        }
      }
    } else if (platform === 'win32') {
      try {
        const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { timeout: 2000, encoding: 'utf8' })
        const match = out.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i)
        if (match && match[1]) {
          hardwareId = match[1].trim()
        }
      } catch {
        const out = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { timeout: 2000, encoding: 'utf8' })
        if (out && out.trim()) {
          hardwareId = out.trim()
        }
      }
    } else if (platform === 'linux') {
      for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        if (existsSync(p)) {
          const val = readFileSync(p, 'utf8').trim()
          if (val) {
            hardwareId = val
            break
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Hardware ID] Lỗi khi đọc định danh phần cứng OS:', err)
  }

  // 3. Dự phòng: Sinh định danh băm theo phần cứng nếu lệnh OS bị hạn chế
  if (!hardwareId || hardwareId.length < 8) {
    try {
      const net = JSON.stringify(os.networkInterfaces())
      const cpus = JSON.stringify(os.cpus().map((c) => c.model))
      const seed = `${os.hostname()}:${os.platform()}:${os.arch()}:${net}:${cpus}`
      hardwareId = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)
    } catch {
      hardwareId = crypto.randomUUID()
    }
  }

  hardwareId = hardwareId.toLowerCase()
  cachedMachineId = hardwareId

  // Lưu bền vững vào ~/.vuaoffice/machine-id
  try {
    if (!existsSync(dotDir)) {
      mkdirSync(dotDir, { recursive: true })
    }
    writeFileSync(machineIdFile, hardwareId, 'utf8')
  } catch {}

  return hardwareId
}
