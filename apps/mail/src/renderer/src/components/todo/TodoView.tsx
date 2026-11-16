import React, { useState } from 'react'
import {
  IconCheckSquare,
  IconStar,
  IconClock,
  IconCheckCircle,
  IconTrash,
  IconCalendar,
  IconFileText,
  IconPlus,
} from '../common/MailIcons'

export interface MailTask {
  id: string
  title: string
  dueDate?: string
  priority: 'high' | 'normal' | 'low'
  isCompleted: boolean
  category: 'work' | 'personal' | 'important'
  notes?: string
}

const INITIAL_TASKS: MailTask[] = [
  {
    id: 'task_1',
    title: 'Kiểm tra & duyệt bản phát hành GenOffice Suite v0.6.6',
    dueDate: '2026-08-16',
    priority: 'high',
    isCompleted: false,
    category: 'important',
    notes: 'Rà soát tính tương thích của SQLite Mail Engine và giao diện Fluent UI 3 cột.',
  },
  {
    id: 'task_2',
    title: 'Chuẩn bị tài liệu hướng dẫn sử dụng tính năng Import/Export .pst',
    dueDate: '2026-08-18',
    priority: 'normal',
    isCompleted: false,
    category: 'work',
    notes: 'Tài liệu hướng dẫn PO & Khách hàng chuyển đổi dữ liệu từ Microsoft Outlook sang GenOffice Mail.',
  },
  {
    id: 'task_3',
    title: 'Tối ưu hoá hiệu năng truy vấn danh bạ People & Lịch Calendar',
    dueDate: '2026-08-20',
    priority: 'normal',
    isCompleted: true,
    category: 'work',
    notes: 'Đã hoàn thành cấu trúc dữ liệu và tích hợp vào AppRail của GenOffice Mail.',
  },
  {
    id: 'task_4',
    title: 'Họp rà soát quy trình bảo mật và mã hoá CSDL Cục bộ',
    dueDate: '2026-08-22',
    priority: 'low',
    isCompleted: false,
    category: 'personal',
    notes: 'Trao đổi với đội ngũ kỹ thuật 360 CORP về kế hoạch nâng cấp.',
  },
]

export const TodoView: React.FC = () => {
  const [tasks, setTasks] = useState<MailTask[]>(INITIAL_TASKS)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(INITIAL_TASKS[0].id)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'important'>('all')
  const [newTitle, setNewTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending' && t.isCompleted) return false
    if (filter === 'completed' && !t.isCompleted) return false
    if (filter === 'important' && t.priority !== 'high' && t.category !== 'important') return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
    }
    return true
  })

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    )
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const newTask: MailTask = {
      id: `task_${Date.now()}`,
      title: newTitle.trim(),
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'normal',
      isCompleted: false,
      category: 'work',
      notes: '',
    }
    setTasks((prev) => [newTask, ...prev])
    setSelectedTaskId(newTask.id)
    setNewTitle('')
  }

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (selectedTaskId === id) {
      setSelectedTaskId(null)
    }
  }

  const handleUpdateNotes = (notes: string) => {
    if (!selectedTaskId) return
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTaskId ? { ...t, notes } : t))
    )
  }

  const handleTogglePriority = () => {
    if (!selectedTaskId) return
    setTasks((prev) =>
      prev.map((t) =>
        t.id === selectedTaskId
          ? { ...t, priority: t.priority === 'high' ? 'normal' : 'high' }
          : t
      )
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', backgroundColor: 'var(--surface, #ffffff)' }}>
      {/* Category Sidebar */}
      <div
        style={{
          width: '230px',
          borderRight: '1px solid var(--border, #e3e6ea)',
          backgroundColor: 'var(--surface-subtle, #f6f7f9)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 10px',
          gap: '6px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted, #878e96)',
            padding: '4px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          To Do & Danh mục
        </div>

        <div
          onClick={() => setFilter('all')}
          style={{
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: filter === 'all' ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'transparent',
            color: filter === 'all' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
            fontWeight: filter === 'all' ? 600 : 400,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCheckSquare size={15} color="var(--mail-primary-blue, #0077cd)" />
            <span>Tất cả công việc</span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>{tasks.length}</span>
        </div>

        <div
          onClick={() => setFilter('important')}
          style={{
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: filter === 'important' ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'transparent',
            color: filter === 'important' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
            fontWeight: filter === 'important' ? 600 : 400,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconStar size={15} active />
            <span>Quan trọng & Khẩn</span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>
            {tasks.filter((t) => t.priority === 'high' || t.category === 'important').length}
          </span>
        </div>

        <div
          onClick={() => setFilter('pending')}
          style={{
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: filter === 'pending' ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'transparent',
            color: filter === 'pending' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
            fontWeight: filter === 'pending' ? 600 : 400,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconClock size={15} color="var(--text-secondary, #606366)" />
            <span>Đang thực hiện</span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>
            {tasks.filter((t) => !t.isCompleted).length}
          </span>
        </div>

        <div
          onClick={() => setFilter('completed')}
          style={{
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: filter === 'completed' ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'transparent',
            color: filter === 'completed' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
            fontWeight: filter === 'completed' ? 600 : 400,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCheckCircle size={15} color="var(--mail-brand-green, #00ce2c)" />
            <span>Đã hoàn thành</span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>
            {tasks.filter((t) => t.isCompleted).length}
          </span>
        </div>
      </div>

      {/* Task List Column (Fluid Resizable) */}
      <div
        style={{
          width: '360px',
          minWidth: '280px',
          borderRight: '1px solid var(--border, #e3e6ea)',
          backgroundColor: 'var(--surface, #ffffff)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Add Task Input Form */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border, #e3e6ea)', backgroundColor: 'var(--surface, #ffffff)' }}>
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="+ Thêm công việc mới (Nhấn Enter)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border, #e3e6ea)',
                background: 'var(--surface-subtle, #f6f7f9)',
                color: 'var(--text-primary, #232425)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              style={{
                backgroundColor: newTitle.trim() ? 'var(--mail-primary-blue, #0077cd)' : 'var(--surface-subtle, #f6f7f9)',
                color: newTitle.trim() ? '#fff' : 'var(--text-muted, #878e96)',
                border: 'none',
                borderRadius: '4px',
                padding: '0 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: newTitle.trim() ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IconPlus size={13} />
              <span>Thêm</span>
            </button>
          </form>
        </div>

        {/* Search inside tasks */}
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-subtle, #efefef)' }}>
          <input
            type="text"
            placeholder="Lọc danh sách công việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border, #e3e6ea)',
              background: 'var(--surface, #ffffff)',
              color: 'var(--text-primary, #232425)',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Task Items List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredTasks.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted, #878e96)', fontSize: '13px' }}>
              Không có công việc nào trong mục này
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTaskId(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle, #efefef)',
                  backgroundColor: selectedTaskId === t.id ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'transparent',
                  borderLeft: selectedTaskId === t.id ? '3px solid var(--mail-primary-blue, #0077cd)' : '3px solid transparent',
                  transition: 'background 0.12s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={t.isCompleted}
                  onClick={(e) => handleToggleComplete(t.id, e)}
                  onChange={() => {}}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: t.isCompleted ? 400 : 600,
                      color: t.isCompleted ? 'var(--text-muted, #878e96)' : 'var(--text-primary, #232425)',
                      textDecoration: t.isCompleted ? 'line-through' : 'none',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                    }}
                  >
                    {t.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted, #878e96)' }}>
                    {t.dueDate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <IconCalendar size={11} /> {t.dueDate}
                      </span>
                    )}
                    {t.priority === 'high' && (
                      <span style={{ color: 'var(--danger, #d13438)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <IconStar size={11} active /> Khẩn cấp
                      </span>
                    )}
                    {t.notes && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <IconFileText size={11} /> Có ghi chú
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Details Pane (Responsive 100% Fluid Width) */}
      <div style={{ flex: 1, backgroundColor: 'var(--surface, #ffffff)', padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {selectedTask ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderBottom: '1px solid var(--border, #e3e6ea)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={selectedTask.isCompleted}
                  onClick={(e) => handleToggleComplete(selectedTask.id, e)}
                  onChange={() => {}}
                  style={{ marginTop: '6px', width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '20px',
                      fontWeight: 600,
                      color: 'var(--text-primary, #232425)',
                      textDecoration: selectedTask.isCompleted ? 'line-through' : 'none',
                      lineHeight: '1.4',
                    }}
                  >
                    {selectedTask.title}
                  </h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted, #878e96)' }}>
                    Hạn chót: <span style={{ fontWeight: 500, color: 'var(--text-primary, #232425)' }}>{selectedTask.dueDate || 'Chưa đặt ngày'}</span> • Trạng thái:{' '}
                    <span style={{ fontWeight: 600, color: selectedTask.isCompleted ? 'var(--mail-brand-green, #00ce2c)' : 'var(--mail-primary-blue, #0077cd)' }}>
                      {selectedTask.isCompleted ? 'Đã hoàn tất' : 'Đang xử lý'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleTogglePriority}
                  style={{
                    background: selectedTask.priority === 'high' ? 'rgba(209,52,56,0.1)' : 'transparent',
                    border: '1px solid var(--border, #e3e6ea)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: selectedTask.priority === 'high' ? 'var(--danger, #d13438)' : 'var(--text-primary, #232425)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconStar size={13} active={selectedTask.priority === 'high'} />
                  <span>{selectedTask.priority === 'high' ? 'Khẩn cấp' : 'Đánh dấu khẩn'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border, #e3e6ea)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: 'var(--danger, #d13438)',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconTrash size={13} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>

            {/* Notes Section Responsive Full Width */}
            <div
              style={{
                backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                borderRadius: '8px',
                padding: '18px 20px',
                border: '1px solid var(--border, #e3e6ea)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconFileText size={14} color="var(--mail-primary-blue, #0077cd)" />
                <span>Chi tiết & Ghi chú công việc:</span>
              </div>
              <textarea
                rows={10}
                value={selectedTask.notes || ''}
                onChange={(e) => handleUpdateNotes(e.target.value)}
                placeholder="Nhập ghi chú chi tiết cho công việc này..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #e3e6ea)',
                  backgroundColor: 'var(--surface, #ffffff)',
                  color: 'var(--text-primary, #232425)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted, #878e96)' }}>
            <IconCheckSquare size={48} color="var(--border-strong, #d0d4d9)" />
            <div style={{ marginTop: '12px', fontSize: '14px' }}>Chọn một công việc từ danh sách để xem chi tiết</div>
          </div>
        )}
      </div>
    </div>
  )
}

