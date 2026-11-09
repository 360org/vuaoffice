/**
 * Pure string MCP launcher configuration for shell UI & settings snippet.
 * Extracted to shared so renderer never imports from @genoffice/cli runtime.
 */
export interface McpLaunch {
  command: string
  args: string[]
  env?: Record<string, string>
}

const isWindowsPath = (p: string) => p.includes('\\')

/** The app's snippet: the bare name once genoffice is on the PATH, else the launcher itself. */
export function mcpLaunch(cli: {
  status: string
  launcherDir: string
  pathHint?: string
}): McpLaunch {
  const dir = cli.launcherDir
  if (isWindowsPath(dir)) return windowsAppLaunch(dir)
  const onPath = cli.status === 'present' && !cli.pathHint
  return { command: onPath ? 'genoffice' : `${dir}/genoffice`, args: ['mcp'] }
}

function windowsAppLaunch(dir: string): McpLaunch {
  return {
    command: `${dir}\\..\\..\\VuaOffice.exe`,
    args: [`${dir}\\genoffice.cjs`, 'mcp'],
    env: { ELECTRON_RUN_AS_NODE: '1' },
  }
}
