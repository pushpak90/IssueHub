import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image, Loader2 } from 'lucide-react'
import { userService } from '../../services/userService'
import { uploadImage } from '../../services/api'
import { getInitials } from '../../utils/helpers'
import toast from 'react-hot-toast'

/**
 * Smart textarea with:
 *  - @mention autocomplete (users)
 *  - Image paste from clipboard
 *  - Image drag-and-drop
 *  - Image file upload button
 *  - Inserted as ![image](url) markdown
 */
export default function MentionTextarea({
  value, onChange, placeholder, className = '', rows = 3
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Mention state
  const [showSugg,    setShowSugg]    = useState(false)
  const [query,       setQuery]       = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [activeIdx,   setActiveIdx]   = useState(0)

  // Image upload state
  const [uploading,   setUploading]   = useState(false)
  const [isDragging,  setIsDragging]  = useState(false)

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
    staleTime: 60000,
  })

  const suggestions = allUsers.filter(u => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    )
  }).slice(0, 7)

  // ── Insert text at cursor ────────────────────────────────────────────────
  const insertAtCursor = useCallback((insert, replaceFrom = null) => {
    const el = textareaRef.current
    const cursor = el?.selectionStart ?? value.length
    const before = replaceFrom !== null ? value.slice(0, replaceFrom) : value.slice(0, cursor)
    const after  = value.slice(cursor)
    const newText = before + insert + after
    onChange(newText)
    setTimeout(() => {
      const pos = before.length + insert.length
      el?.setSelectionRange(pos, pos)
      el?.focus()
    }, 0)
  }, [value, onChange])

  // ── Image upload handler ─────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be pasted/uploaded here')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploading(true)
    try {
      const data = await uploadImage(file)
      const md   = `![image](${data.url})`
      insertAtCursor(md)
      toast.success('Image uploaded')
    } catch (e) {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }, [insertAtCursor])

  // ── Paste handler (captures clipboard images) ────────────────────────────
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault()
        handleImageUpload(item.getAsFile())
        return
      }
    }
    // Otherwise let normal paste happen (text, @mentions etc.)
  }, [handleImageUpload])

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleImageUpload(file)
  }, [handleImageUpload])

  // ── @mention logic ───────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const text = e.target.value
    onChange(text)
    const cursor = e.target.selectionStart
    const before = text.slice(0, cursor)
    const atMatch = before.match(/@([\w.@+-]*)$/)
    if (atMatch) {
      setQuery(atMatch[1]); setMentionStart(cursor - atMatch[0].length)
      setShowSugg(true); setActiveIdx(0)
    } else {
      setShowSugg(false); setQuery('')
    }
  }, [onChange])

  const insertMention = useCallback((user) => {
    const tag = `@${user.username} `
    const cursor = textareaRef.current?.selectionStart ?? mentionStart + query.length + 1
    const before = value.slice(0, mentionStart)
    const after  = value.slice(cursor)
    onChange(before + tag + after)
    setShowSugg(false); setQuery('')
    setTimeout(() => {
      const pos = before.length + tag.length
      textareaRef.current?.setSelectionRange(pos, pos)
      textareaRef.current?.focus()
    }, 0)
  }, [value, mentionStart, query, onChange])

  const handleKeyDown = (e) => {
    if (!showSugg) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && suggestions.length > 0) { e.preventDefault(); insertMention(suggestions[activeIdx]) }
    else if (e.key === 'Escape') setShowSugg(false)
  }

  return (
    <div className="relative">
      {/* Drag-drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary-400 bg-primary-50/80 dark:bg-primary-900/20 pointer-events-none">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
            📎 Drop image to upload
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 mb-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-50"
          title="Upload image"
        >
          {uploading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
            : <><Image className="h-3.5 w-3.5" /> Image</>
          }
        </button>
        <span className="text-gray-300">·</span>
        <span className="text-[10px] text-gray-400">
          Paste image (Ctrl+V) or drag-drop · Type <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-mono">@</kbd> to mention
        </span>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }} />
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        rows={rows}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onBlur={() => { setTimeout(() => setShowSugg(false), 150) }}
        placeholder={placeholder}
        className={`input w-full resize-none ${isDragging ? 'border-primary-400 ring-1 ring-primary-400' : ''} ${className}`}
      />

      {/* @mention suggestions dropdown */}
      {showSugg && suggestions.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 z-50 w-72 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
          <div className="border-b border-gray-100 dark:border-gray-800 px-3 py-1.5">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
              Mention — ↑↓ navigate · Enter select · Esc close
            </p>
          </div>
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user) }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                idx === activeIdx
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                {getInitials(user.fullName || user.username)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                </p>
                <p className="text-xs text-gray-400 truncate">@{user.username} · {user.email}</p>
              </div>
              {idx === activeIdx && (
                <kbd className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-600 dark:bg-primary-900/30">↵</kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
