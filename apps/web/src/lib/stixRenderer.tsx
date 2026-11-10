import React, { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

export interface ParsedStixResult {
  content: React.ReactNode
  citations: { index: number; name: string }[]
}

/**
 * Parses MITRE ATT&CK STIX 2.1 markdown-like procedure & description texts:
 * 1. Splits text into proper paragraphs by double newlines (\n\n)
 * 2. Converts [text](url) -> sanitized external links opening in new tab
 * 3. Converts (Citation: Name) -> superscript footnotes [1], [2]
 * 4. Converts <code>inline</code> -> styled code tags
 * 5. Extracts citation references for bibliography listing
 */
export function renderStixText(text: string): ParsedStixResult {
  if (!text) {
    return { content: null, citations: [] }
  }

  const citationsMap = new Map<string, number>()
  const citationsList: { index: number; name: string }[] = []

  // Bước 1: Trích xuất và lập danh mục các Citation (Citation: Name)
  const citationRegex = /\(Citation:\s*([^)]+)\)/g
  let citMatch: RegExpExecArray | null
  while ((citMatch = citationRegex.exec(text)) !== null) {
    const rawName = citMatch[1].trim()
    if (!citationsMap.has(rawName)) {
      const idx = citationsList.length + 1
      citationsMap.set(rawName, idx)
      citationsList.push({ index: idx, name: rawName })
    }
  }

  // Bước 2: Tách các đoạn văn bản (paragraphs) theo dòng trống
  const paragraphs = text.split(/\r?\n\r?\n+/)
  const combinedRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\(Citation:\s*([^)]+)\)|<code>(.*?)<\/code>/g

  const renderedParagraphs = paragraphs
    .map((para, pIdx) => {
      const trimmed = para.trim()
      if (!trimmed) return null

      const nodes: React.ReactNode[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      combinedRegex.lastIndex = 0

      while ((match = combinedRegex.exec(trimmed)) !== null) {
        const [fullMatch, linkText, linkUrl, citationName, codeContent] = match
        const matchIndex = match.index

        if (matchIndex > lastIndex) {
          nodes.push(trimmed.slice(lastIndex, matchIndex))
        }

        if (linkText && linkUrl) {
          nodes.push(
            <a
              key={`link-${pIdx}-${matchIndex}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bone-100 underline decoration-line-strong hover:text-attack hover:decoration-attack transition-colors font-medium inline-flex items-center gap-0.5"
            >
              <span>{linkText}</span>
              <ExternalLink className="h-2.5 w-2.5 text-bone-500 inline" />
            </a>,
          )
        } else if (citationName) {
          const cleanName = citationName.trim()
          const citNum = citationsMap.get(cleanName) ?? '?'
          nodes.push(
            <sup
              key={`cit-${pIdx}-${matchIndex}`}
              title={`Nguồn trích dẫn: ${cleanName}`}
              className="ml-0.5 font-mono text-[10px] text-defend font-bold cursor-help select-none"
            >
              [{citNum}]
            </sup>,
          )
        } else if (codeContent !== undefined) {
          nodes.push(
            <code
              key={`code-${pIdx}-${matchIndex}`}
              className="font-mono text-[11px] text-attack bg-surface px-1.5 py-0.5 border border-line rounded-xs mx-0.5"
            >
              {codeContent}
            </code>,
          )
        }

        lastIndex = matchIndex + fullMatch.length
      }

      if (lastIndex < trimmed.length) {
        nodes.push(trimmed.slice(lastIndex))
      }

      return (
        <p key={`para-${pIdx}`} className="leading-relaxed mb-3 last:mb-0 text-xs sm:text-[13px] text-bone-300">
          {nodes}
        </p>
      )
    })
    .filter(Boolean)

  return {
    content: <div className="space-y-3">{renderedParagraphs}</div>,
    citations: citationsList,
  }
}

/**
 * Component hiển thị nguyên văn MITRE ATT&CK:
 * - Có chế độ thu gọn (mặc định 6 dòng)
 * - Tự động hiển thị danh mục các nguồn trích dẫn footnote [1], [2] ở cuối bài
 */
export function StixArticleViewer({
  text,
  defaultExpanded = false,
}: {
  text: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const parsed = renderStixText(text)

  if (!text) {
    return <div className="font-mono text-xs text-bone-500 italic">Không có nội dung mô tả STIX.</div>
  }

  return (
    <div className="space-y-3">
      {/* Vùng văn bản phân đoạn */}
      <div
        className={
          expanded
            ? 'space-y-3'
            : 'line-clamp-6 space-y-3 overflow-hidden relative'
        }
      >
        {parsed.content}
        {!expanded && (
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
        )}
      </div>

      {/* Nút bấm Mở rộng / Thu gọn */}
      <div className="flex items-center justify-between border-t border-line/60 pt-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 text-bone-300 hover:text-bone-100 border border-line px-2.5 py-1 rounded-xs transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 text-attack" />
              <span>Thu gọn văn bản</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-attack" />
              <span>
                Mở rộng toàn văn ({parsed.citations.length} nguồn trích dẫn)
              </span>
            </>
          )}
        </button>

        {parsed.citations.length > 0 && (
          <span className="text-[11px] text-bone-500">
            {parsed.citations.length} tài liệu trích dẫn STIX 2.1
          </span>
        )}
      </div>

      {/* Danh mục tài liệu tham khảo (Footnotes) khi mở rộng */}
      {expanded && parsed.citations.length > 0 && (
        <div className="border-t border-line pt-3 mt-4 space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-bone-400 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-defend" />
            <span>DANH MỤC TÀI LIỆU TRÍCH DẪN (STIX CITATIONS):</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1 font-mono text-[11px] text-bone-400">
            {parsed.citations.map((c) => (
              <li key={c.index} className="leading-snug">
                <span className="text-defend mr-1 font-bold">[{c.index}]</span>
                <span className="text-bone-300">{c.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
