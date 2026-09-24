import re, os, sys

# =====================================================================
# 1. apps/shell/src/main/index.ts
# =====================================================================
p_index = "apps/shell/src/main/index.ts"
with open(p_index, "r", encoding="utf-8") as f:
    c = f.read()

# 1a. Thêm DROP_OPEN_CHANNEL vào import @genoffice/electron-utils
if "DROP_OPEN_CHANNEL," not in c:
    c = c.replace(
        "installRendererProtocol,\n} from '@genoffice/electron-utils'",
        "installRendererProtocol,\n  DROP_OPEN_CHANNEL,\n} from '@genoffice/electron-utils'"
    )

# 1b. Thêm removeStarredFiles vào import docs-main
if "removeStarredFiles," not in c:
    c = c.replace(
        "  removeRecentFiles,\n  replaceRecentFile,",
        "  removeRecentFiles,\n  removeStarredFiles,\n  replaceRecentFile,"
    )

# 1c. Thêm hàm showAppWarning
if "function showAppWarning" not in c:
    warning_func = """
function showAppWarning(message: string): void {
  const options = { type: 'warning' as const, message }
  if (shellWindow) {
    shellWindow.show()
    shellWindow.focus()
    void dialog.showMessageBox(shellWindow, options)
  } else {
    void dialog.showMessageBox(options)
  }
}
"""
    c = c.replace(
        "const droppedFilesDeps = () => ({",
        warning_func + "\nconst droppedFilesDeps = () => ({"
    )

# 1d. Thay thế checkForUpdatesManual() -> checkForUpdatesNow()
c = c.replace("checkForUpdatesManual()", "checkForUpdatesNow()")

# 1e. Sửa handler newPdf
target_new_pdf = """  ipcMain.handle(HOME_CHANNELS.newPdf, (_event, opts?: NewFileOpts) => {
    if (opts?.projectId && opts.projectId !== 'default') {
      pendingNewFileProject.set('pdf', opts.projectId)
    }
    rememberPendingDir('pdf', opts)
    tabManager?.openNewTab('pdf')
  })"""

rep_new_pdf = """  ipcMain.handle(HOME_CHANNELS.newPdf, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('pdf', opts)
    void newPdfTab()
  })"""
if target_new_pdf in c:
    c = c.replace(target_new_pdf, rep_new_pdf)

# 1f. Thêm các key vi thiếu trong tm của shell index.ts
vi_missing_shell = """    menuExportHtml: 'Xuất HTML…',
    menuExportImages: 'Xuất hình ảnh…',
    dlgAddFolderRoot: 'Thêm thư mục',
    errFolderRootUnusable: 'Thư mục không thể sử dụng',
    menuOpenInNewWindow: 'Mở trong cửa sổ mới',"""

if "menuExportHtml:" not in c:
    c = c.replace(
        "    errUnsupportedExt: 'Chưa hỗ trợ định dạng .{ext}',\n",
        f"    errUnsupportedExt: 'Chưa hỗ trợ định dạng .{{ext}}',\n{vi_missing_shell}\n"
    )

with open(p_index, "w", encoding="utf-8") as f:
    f.write(c)
print("1. apps/shell/src/main/index.ts updated cleanly")

# =====================================================================
# 2. apps/shell/src/renderer/src/Home.tsx
# =====================================================================
p_home = "apps/shell/src/renderer/src/Home.tsx"
with open(p_home, "r", encoding="utf-8") as f:
    c = f.read()

# 2a. Thêm DropToOpenOverlay component trước export function Home()
overlay_code = """function DropToOpenOverlay(): ReactElement | null {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let depth = 0
    const hasFiles = (ev: DragEvent): boolean => ev.dataTransfer?.types.includes('Files') ?? false
    const onDragEnter = (ev: DragEvent) => {
      if (!hasFiles(ev)) return
      depth += 1
      setVisible(true)
    }
    const onDragLeave = (ev: DragEvent) => {
      if (!hasFiles(ev)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setVisible(false)
    }
    const onHide = () => {
      depth = 0
      setVisible(false)
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onHide)
    window.addEventListener('blur', onHide)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onHide)
      window.removeEventListener('blur', onHide)
    }
  }, [])
  const { t } = useI18n()
  if (!visible) return null
  return (
    <div className="home-drop-overlay" aria-hidden="true">
      <div className="home-drop-card">
        <div className="home-drop-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3v12m0-12l4 4m-4-4L8 7m13 8v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="home-drop-title">{t('dropToOpenTitle')}</div>
      </div>
    </div>
  )
}
"""

if "function DropToOpenOverlay" not in c:
    c = c.replace(
        "// ── Main component ──────────────────────────────────────\n\nexport function Home() {",
        overlay_code + "\n// ── Main component ──────────────────────────────────────\n\nexport function Home() {"
    )

# 2b. Thêm các state confirmMissing và project an toàn vào Home()
home_states = """  const [confirmMissing, setConfirmMissing] = useState<RecentEntry | null>(null)
  const hasProjectApi = () =>
    typeof window !== 'undefined' &&
    'aiOfficeProject' in window &&
    (window as any).aiOfficeProject != null
  const projectMode = hasProjectApi()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectTick, setProjectTick] = useState(0)"""

if "const [confirmMissing, setConfirmMissing]" not in c:
    c = c.replace(
        "  const [cloudMode, setCloudMode] = useState(false)\n",
        "  const [cloudMode, setCloudMode] = useState(false)\n" + home_states + "\n"
    )

# 2c. Sửa gọi API aiOfficeProject trong useEffect và các hàm
c = c.replace(
    "    const api = window.aiOfficeProject!\n    void api.listFiles(selectedProjectId).then(async (paths) => {",
    "    const api = (window as any).aiOfficeProject\n    if (!api) return\n    void api.listFiles(selectedProjectId).then(async (paths: string[]) => {"
)
c = c.replace("window.aiOfficeProject?", "(window as any).aiOfficeProject?")

with open(p_home, "w", encoding="utf-8") as f:
    f.write(c)
print("2. apps/shell/src/renderer/src/Home.tsx updated cleanly")

# =====================================================================
# 3. apps/shell/src/main/mcp/tools/open-documents-tools.ts
# =====================================================================
p_mcp = "apps/shell/src/main/mcp/tools/open-documents-tools.ts"
with open(p_mcp, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "const FAMILY_BY_KIND: Record<Exclude<TabKind, 'home'>, EditorFamily> = {",
    "const FAMILY_BY_KIND: Record<Exclude<TabKind, 'home' | 'mail'>, EditorFamily> = {"
)
c = c.replace(
    "return FAMILY_BY_KIND[kind]",
    "return (kind in FAMILY_BY_KIND ? FAMILY_BY_KIND[kind as Exclude<TabKind, 'home' | 'mail'>] : undefined) as EditorFamily"
)

with open(p_mcp, "w", encoding="utf-8") as f:
    f.write(c)
print("3. apps/shell/src/main/mcp/tools/open-documents-tools.ts updated")

# =====================================================================
# 4. apps/docs/src/main/docs-main.ts
# =====================================================================
p_docs = "apps/docs/src/main/docs-main.ts"
with open(p_docs, "r", encoding="utf-8") as f:
    c = f.read()
if "dlgPickExportDir:" not in c[c.find("  vi: {"):]:
    c = c.replace(
        "    dlgInsertLink: 'Siêu liên kết…',\n",
        "    dlgInsertLink: 'Siêu liên kết…',\n    dlgPickExportDir: 'Chọn thư mục xuất',\n    menuExportImages: 'Xuất hình ảnh…',\n"
    )
    with open(p_docs, "w", encoding="utf-8") as f:
        f.write(c)
    print("4. apps/docs/src/main/docs-main.ts updated")

# =====================================================================
# 5. apps/markdown/src/main/markdown-main.ts
# =====================================================================
p_md = "apps/markdown/src/main/markdown-main.ts"
with open(p_md, "r", encoding="utf-8") as f:
    c = f.read()
if "dlgSaveImage:" not in c[c.find("  vi: {"):]:
    c = c.replace(
        "    dlgPickImage: 'Chọn hình ảnh',\n",
        "    dlgPickImage: 'Chọn hình ảnh',\n    dlgSaveImage: 'Lưu hình ảnh',\n"
    )
    with open(p_md, "w", encoding="utf-8") as f:
        f.write(c)
    print("5. apps/markdown/src/main/markdown-main.ts updated")

# =====================================================================
# 6. apps/pdf/src/main/pdf-main.ts
# =====================================================================
p_pdf = "apps/pdf/src/main/pdf-main.ts"
with open(p_pdf, "r", encoding="utf-8") as f:
    c = f.read()
if "dlgRedactCopy:" not in c[c.find("  vi: {"):]:
    c = c.replace(
        "    filterPdf: 'Tài liệu PDF',\n",
        "    filterPdf: 'Tài liệu PDF',\n    dlgRedactCopy: 'Lưu bản sao che khuất thành',\n"
    )
    with open(p_pdf, "w", encoding="utf-8") as f:
        f.write(c)
    print("6. apps/pdf/src/main/pdf-main.ts updated")

# =====================================================================
# 7. apps/sheets/src/main/sheets-main.ts
# =====================================================================
p_sheets = "apps/sheets/src/main/sheets-main.ts"
with open(p_sheets, "r", encoding="utf-8") as f:
    c = f.read()
if "menuPrint:" not in c[c.find("  vi: {"):]:
    c = c.replace(
        "    menuExportPdf: 'Xuất PDF…',\n",
        "    menuExportPdf: 'Xuất PDF…',\n    menuPrint: 'In…',\n"
    )
    with open(p_sheets, "w", encoding="utf-8") as f:
        f.write(c)
    print("7. apps/sheets/src/main/sheets-main.ts updated")

# =====================================================================
# 8. apps/slides/src/main/i18n-main.ts
# =====================================================================
p_slides = "apps/slides/src/main/i18n-main.ts"
with open(p_slides, "r", encoding="utf-8") as f:
    c = f.read()
if "dlgSavePicture:" not in c[c.find("  vi: {"):]:
    c = c.replace(
        "    dlgReplacePicture: 'Thay thế hình ảnh',\n",
        "    dlgReplacePicture: 'Thay thế hình ảnh',\n    dlgSavePicture: 'Lưu hình ảnh',\n"
    )
    with open(p_slides, "w", encoding="utf-8") as f:
        f.write(c)
    print("8. apps/slides/src/main/i18n-main.ts updated")

# =====================================================================
# 9. apps/shell/src/main/updater.ts
# =====================================================================
p_upd = "apps/shell/src/main/updater.ts"
with open(p_upd, "r", encoding="utf-8") as f:
    c = f.read()
if "updUpToDate:" not in c[c.find("  vi: {"):]:
    c = c.replace(
        "    updOpenDownload: 'Mở trang tải xuống',\n",
        "    updOpenDownload: 'Mở trang tải xuống',\n    updUpToDate: 'Bạn đang dùng phiên bản mới nhất ({version}).',\n    updCheckFailed: 'Không thể kiểm tra cập nhật. Vui lòng kiểm tra kết nối mạng và thử lại.',\n"
    )
    with open(p_upd, "w", encoding="utf-8") as f:
        f.write(c)
    print("9. apps/shell/src/main/updater.ts updated")

print("All fixes applied successfully!")
