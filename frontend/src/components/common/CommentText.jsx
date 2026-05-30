/**
 * Renders comment/description text with:
 * - @mentions highlighted in blue
 * - ![image](url) rendered as actual <img> tags
 */
export default function CommentText({ text }) {
  if (!text) return null

  // Split text into segments: images, mentions, plain text
  // Regex: first match ![alt](url) images, then @mentions
  const segments = []
  const imageRegex  = /!\[([^\]]*)\]\(([^)]+)\)/g
  const mentionRegex = /@([\w.@+-]+)/g

  let lastIndex = 0
  const combined = /!\[([^\]]*)\]\(([^)]+)\)|@([\w.@+-]+)/g
  let match

  while ((match = combined.exec(text)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    if (match[0].startsWith('![')) {
      // Image
      segments.push({ type: 'image', alt: match[1], url: match[2] })
    } else {
      // Mention
      segments.push({ type: 'mention', value: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (seg.type === 'image') {
          // Resolve relative URLs
          const src = seg.url.startsWith('/') ? BASE.replace('/api', '') + seg.url : seg.url
          return (
            <span key={i} className="block my-2">
              <a href={src} target="_blank" rel="noopener noreferrer">
                <img
                  src={src}
                  alt={seg.alt || 'image'}
                  className="max-w-full rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </a>
            </span>
          )
        }
        if (seg.type === 'mention') {
          return (
            <span key={i}
              className="text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20 rounded px-0.5">
              {seg.value}
            </span>
          )
        }
        return <span key={i}>{seg.value}</span>
      })}
    </span>
  )
}
