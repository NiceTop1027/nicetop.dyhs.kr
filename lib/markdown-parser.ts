import DOMPurify from "isomorphic-dompurify"

// 최적화된 마크다운 파서 - 핵심 기능 중심
export const parseMarkdown = (markdown: string): string => {
  if (!markdown) return ""

  let html = markdown.trim()

  // 1. 코드 블록 처리 (먼저 처리하여 다른 파싱과 충돌 방지)
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = (lang || "text").toLowerCase()
    const codeContent = code.trim()
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`

    const langConfig = getLanguageConfig(language)

    codeBlocks.push(`<div class="relative my-8 group">
      <div class="bg-slate-900 rounded-t-lg px-4 py-3 flex justify-between items-center border-b border-slate-700">
        <div class="flex items-center gap-3">
          <div class="flex gap-2">
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span class="text-sm text-slate-300 font-medium">${language}</span>
        </div>
        <button onclick="copyCode(this)" data-code="${encodeURIComponent(codeContent)}" 
                class="text-sm text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-all duration-200">
          Copy
        </button>
      </div>
      <pre class="bg-slate-900 text-slate-100 p-4 rounded-b-lg overflow-x-auto"><code class="language-${language} text-sm font-mono">${highlightCode(codeContent, language)}</code></pre>
    </div>`)

    return placeholder
  })

  // 2. 인라인 코드 처리
  html = html.replace(/`([^`\n]+)`/g, (match, code) => {
    return `<code class="px-2 py-1 bg-slate-800 text-red-400 rounded font-mono text-sm">${escapeHtml(code)}</code>`
  })

  // 3. 이미지 처리
  html = html.replace(/!\[([^\]]*)\]$$([^)]+)$$/g, (match, alt, src) => {
    let imageSrc = src.trim()
    if (!imageSrc.startsWith("http://") && !imageSrc.startsWith("https://") && !imageSrc.startsWith("data:")) {
      if (imageSrc.startsWith("./")) {
        imageSrc = imageSrc.substring(2)
      }
      if (!imageSrc.startsWith("/")) {
        imageSrc = "/" + imageSrc
      }
    }

    return `<div class="my-8 text-center">
      <img src="${imageSrc}" alt="${alt || "이미지"}" class="max-w-full h-auto mx-auto rounded-lg shadow-lg" loading="lazy" />
      ${alt ? `<p class="mt-2 text-sm text-slate-400 italic">${alt}</p>` : ""}
    </div>`
  })

  // 4. 링크 처리
  html = html.replace(/\[([^\]]+)\]$$([^)]+)$$/g, (match, text, url) => {
    const cleanUrl = url.trim()
    const isExternal = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")
    const targetAttr = isExternal ? 'target="_blank" rel="noopener noreferrer"' : ""

    return `<a href="${cleanUrl}" ${targetAttr} class="text-blue-400 hover:text-blue-300 underline transition-colors duration-200">${text}</a>`
  })

  // 5. 자동 링크 처리
  html = html.replace(/(^|[^"'>=\]`*_~(])(https?:\/\/[^\s<>"'\]`*_~(]+)(?![^<]*<\/a>)/g, (match, prefix, url) => {
    return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline break-all">${url}</a>`
  })

  // 6. 헤딩 처리 (강화된 스타일링)
  html = html.replace(
    /^#{6}\s+(.+)$/gm,
    '<h6 class="text-base font-bold mt-6 mb-3 text-slate-400 uppercase tracking-wider">$1</h6>',
  )
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5 class="text-lg font-bold mt-8 mb-4 text-slate-300">$1</h5>')
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4 class="text-xl font-bold mt-10 mb-5 text-slate-200">$1</h4>')
  html = html.replace(
    /^#{3}\s+(.+)$/gm,
    '<h3 class="text-2xl font-bold mt-12 mb-6 text-white border-b border-slate-700 pb-2">$1</h3>',
  )
  html = html.replace(
    /^#{2}\s+(.+)$/gm,
    '<h2 class="text-3xl font-bold mt-16 mb-8 text-white border-b-2 border-slate-600 pb-3">$1</h2>',
  )
  html = html.replace(
    /^#{1}\s+(.+)$/gm,
    '<h1 class="text-4xl font-bold mt-20 mb-10 text-white border-b-4 border-slate-500 pb-4">$1</h1>',
  )

  // 7. 텍스트 스타일링 (볼드만 처리, 언더바와 이탤릭 제거)
  // 언더바(_) 처리 완전 제거, **만 굵음으로 처리
  html = html.replace(
    /\*\*\*(.+?)\*\*\*/g,
    '<strong class="font-black text-white bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-2 py-1 rounded border border-yellow-500/30">$1</strong>',
  )
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-bold text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-2 py-1 rounded border border-blue-500/30">$1</strong>',
  )
  // 이탤릭과 언더바 처리 제거 - 일반 텍스트로 표시
  html = html.replace(/~~(.+?)~~/g, '<del class="line-through text-slate-400 opacity-75">$1</del>')

  // 8. 하이라이트
  html = html.replace(
    /==(.+?)==/g,
    '<mark class="bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-semibold">$1</mark>',
  )

  // 9. 체크박스
  html = html.replace(
    /^\s*-\s+\[x\]\s+(.+)$/gm,
    '<div class="flex items-center gap-3 my-2"><svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg><span class="line-through text-green-400">$1</span></div>',
  )
  html = html.replace(
    /^\s*-\s+\[\s\]\s+(.+)$/gm,
    '<div class="flex items-center gap-3 my-2"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"></circle></svg><span class="text-white">$1</span></div>',
  )

  // 10. 인용구
  html = html.replace(
    /^>\s+(.+)$/gm,
    '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-500/10 italic text-slate-300">$1</blockquote>',
  )

  // 11. 경고 박스
  html = html.replace(
    /^!\s*\[!NOTE\]\s*(.+)$/gm,
    '<div class="p-4 my-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r"><div class="flex items-center gap-2 mb-2"><svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg><strong class="text-blue-300">참고</strong></div><p class="text-blue-200">$1</p></div>',
  )
  html = html.replace(
    /^!\s*\[!WARNING\]\s*(.+)$/gm,
    '<div class="p-4 my-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r"><div class="flex items-center gap-2 mb-2"><svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg><strong class="text-yellow-300">주의</strong></div><p class="text-yellow-200">$1</p></div>',
  )
  html = html.replace(
    /^!\s*\[!DANGER\]\s*(.+)$/gm,
    '<div class="p-4 my-4 bg-red-500/10 border-l-4 border-red-500 rounded-r"><div class="flex items-center gap-2 mb-2"><svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg><strong class="text-red-300">위험</strong></div><p class="text-red-200">$1</p></div>',
  )

  // 12. 수평선
  html = html.replace(
    /^---+$/gm,
    '<hr class="border-0 h-1 bg-gradient-to-r from-transparent via-slate-500 to-transparent my-8 rounded">',
  )

  // 13. 목록 처리
  html = processLists(html)

  // 14. 테이블 처리
  html = processTables(html)

  // 15. 단락 처리
  html = processParagraphs(html)

  // 16. 코드 블록 복원
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block)
  })

  // 17. HTML 정화
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "del",
      "mark",
      "sup",
      "sub",
      "kbd",
      "a",
      "img",
      "blockquote",
      "hr",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "table",
      "tbody",
      "thead",
      "tr",
      "td",
      "th",
      "div",
      "span",
      "input",
      "svg",
      "path",
      "button",
      "circle",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "class",
      "loading",
      "type",
      "checked",
      "disabled",
      "onclick",
      "data-code",
      "fill",
      "stroke",
      "viewBox",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
      "fill-rule",
      "clip-rule",
      "cx",
      "cy",
      "r",
    ],
  })
}

// 언어별 설정
function getLanguageConfig(language: string) {
  const configs: Record<string, any> = {
    javascript: { name: "JavaScript", color: "text-yellow-400" },
    typescript: { name: "TypeScript", color: "text-blue-400" },
    python: { name: "Python", color: "text-green-400" },
    java: { name: "Java", color: "text-red-400" },
    html: { name: "HTML", color: "text-orange-400" },
    css: { name: "CSS", color: "text-purple-400" },
    default: { name: "Code", color: "text-gray-400" },
  }
  return configs[language] || configs.default
}

// 목록 처리
function processLists(html: string): string {
  const lines = html.split("\n")
  const result: string[] = []
  let inUnorderedList = false
  let inOrderedList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)

    if (unorderedMatch) {
      const content = unorderedMatch[2]
      if (!inUnorderedList) {
        if (inOrderedList) {
          result.push("</ol>")
          inOrderedList = false
        }
        result.push('<ul class="space-y-2 my-4 ml-6">')
        inUnorderedList = true
      }
      result.push(
        `<li class="flex items-start gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0"></span><span class="text-white">${content}</span></li>`,
      )
    } else if (orderedMatch) {
      const content = orderedMatch[2]
      if (!inOrderedList) {
        if (inUnorderedList) {
          result.push("</ul>")
          inUnorderedList = false
        }
        result.push('<ol class="space-y-2 my-4 ml-6">')
        inOrderedList = true
      }
      const itemNumber = result.filter((r) => r.includes('<li class="flex items-start gap-3">')).length + 1
      result.push(
        `<li class="flex items-start gap-3"><span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">${itemNumber}</span><span class="text-white">${content}</span></li>`,
      )
    } else {
      if (inUnorderedList) {
        result.push("</ul>")
        inUnorderedList = false
      }
      if (inOrderedList) {
        result.push("</ol>")
        inOrderedList = false
      }
      result.push(line)
    }
  }

  if (inUnorderedList) result.push("</ul>")
  if (inOrderedList) result.push("</ol>")

  return result.join("\n")
}

// 테이블 처리
function processTables(html: string): string {
  const lines = html.split("\n")
  const result: string[] = []
  let inTable = false
  let tableRows: string[] = []
  let isHeaderRow = true

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.includes("|") && line.split("|").length > 2) {
      if (!inTable) {
        inTable = true
        tableRows = []
        isHeaderRow = true
      }

      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell !== "")

      if (cells.every((cell) => /^-+$/.test(cell))) {
        isHeaderRow = false
        continue
      }

      const cellTag = isHeaderRow ? "th" : "td"
      const cellClass = isHeaderRow
        ? "border border-slate-600 px-4 py-2 bg-slate-800 font-bold text-white"
        : "border border-slate-600 px-4 py-2 text-white"

      const cellsHtml = cells.map((cell) => `<${cellTag} class="${cellClass}">${cell}</${cellTag}>`).join("")
      tableRows.push(`<tr>${cellsHtml}</tr>`)

      if (isHeaderRow) {
        isHeaderRow = false
      }
    } else {
      if (inTable) {
        const tableHtml = `<div class="overflow-x-auto my-6 rounded-lg border border-slate-600"><table class="w-full border-collapse bg-slate-900">${tableRows.join("")}</table></div>`
        result.push(tableHtml)
        inTable = false
        tableRows = []
      }
      result.push(line)
    }
  }

  if (inTable && tableRows.length > 0) {
    const tableHtml = `<div class="overflow-x-auto my-6 rounded-lg border border-slate-600"><table class="w-full border-collapse bg-slate-900">${tableRows.join("")}</table></div>`
    result.push(tableHtml)
  }

  return result.join("\n")
}

// 단락 처리
function processParagraphs(html: string): string {
  const paragraphs = html.split("\n\n")
  return paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return ""

      if (trimmed.match(/^<(h[1-6]|ul|ol|blockquote|pre|div|hr|table)/)) {
        return trimmed
      }

      const lines = trimmed.split("\n").filter((line) => line.trim())
      if (lines.length === 1) {
        return `<p class="mb-4 text-white leading-relaxed text-base">${lines[0]}</p>`
      } else {
        return `<p class="mb-4 text-white leading-relaxed text-base">${lines.join("<br>")}</p>`
      }
    })
    .join("\n")
}

// HTML 이스케이프
const escapeHtml = (text: string): string => {
  const htmlEscapes: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return text.replace(/[&<>"']/g, (match) => htmlEscapes[match])
}

// 간단한 구문 강조
const highlightCode = (code: string, language: string): string => {
  let highlighted = escapeHtml(code)

  // 주석 처리
  if (["javascript", "typescript", "java", "cpp", "csharp"].includes(language)) {
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-green-400 italic">$1</span>')
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-green-400 italic">$1</span>')
  } else if (["python", "bash", "ruby"].includes(language)) {
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-green-400 italic">$1</span>')
  }

  // 문자열 처리
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-yellow-300">$1</span>')
  highlighted = highlighted.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-yellow-300">$1</span>')

  // 키워드 처리 (간단한 버전)
  const keywords = {
    javascript: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "import",
      "export",
    ],
    typescript: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "interface",
      "type",
    ],
    python: ["def", "class", "import", "return", "if", "else", "for", "while", "try", "except"],
    java: ["public", "private", "class", "interface", "return", "if", "else", "for", "while"],
  }

  const langKeywords = keywords[language as keyof typeof keywords] || []
  langKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "g")
    highlighted = highlighted.replace(regex, `<span class="text-purple-400 font-semibold">${keyword}</span>`)
  })

  // 숫자 처리
  highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="text-orange-400">$&</span>')

  return highlighted
}

// 코드 복사 스크립트
export const generateCopyScript = (): string => {
  return `
    window.copyCode = function(button) {
      const code = decodeURIComponent(button.dataset.code);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          showCopySuccess(button);
        }).catch(() => {
          fallbackCopy(code, button);
        });
      } else {
        fallbackCopy(code, button);
      }
    }

    function fallbackCopy(text, button) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showCopySuccess(button);
        } else {
          showCopyError(button);
        }
      } catch (err) {
        showCopyError(button);
      }
      
      document.body.removeChild(textArea);
    }

    function showCopySuccess(button) {
      const originalText = button.textContent;
      button.textContent = '복사됨!';
      button.style.backgroundColor = '#10b981';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
      }, 2000);
    }

    function showCopyError(button) {
      const originalText = button.textContent;
      button.textContent = '복사 실패';
      button.style.backgroundColor = '#ef4444';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
      }, 2000);
    }
  `
}
