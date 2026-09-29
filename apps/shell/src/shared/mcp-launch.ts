/**
 * How an MCP client starts the MCP server. Shared by the app's Settings snippet
 * and CLI install so the two cannot drift. Clients spawn without a
 * shell, so on Windows neither genoffice.cmd nor `cmd /c` is safe (a path with
 * a space splits); the entry does what genoffice.cmd does instead: the app
 * binary as Node on the bundled CLI. Pure string code: the renderer imports it safely.
 */
export interface McpLaunch {
  command: string
  args: string[]
  env?: Record<string, string>
}

const isWindowsPath = (p: string) => p.includes('\\')

/** The app's snippet: the bare name once genoffice is on the PATH, else the launcher itself. */
export function mcpLaunch(cli: { status: string; launcherDir: string }): McpLaunch {
  const dir = cli.launcherDir
  if (isWindowsPath(dir)) return windowsAppLaunch(dir)
  return { command: cli.status === 'present' ? 'vuaoffice' : `${dir}/vuaoffice`, args: ['mcp'] }
}

function windowsAppLaunch(dir: string): McpLaunch {
  return {
    command: `${dir}\\..\\..\\VuaOffice.exe`,
    args: [`${dir}\\vuaoffice.cjs`, 'mcp'],
    env: { ELECTRON_RUN_AS_NODE: '1' },
  }
}
