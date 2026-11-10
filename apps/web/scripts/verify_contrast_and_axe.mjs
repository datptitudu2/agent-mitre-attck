/**
 * Công cụ tự động tính toán ma trận tương phản WCAG 2.1 cho toàn bộ cặp màu Token (Dark & Light)
 * và chạy kiểm toán axe-core trực tiếp trên Chromium headless.
 *
 * Cách chạy:
 *   node apps/web/scripts/verify_contrast_and_axe.mjs
 *   node apps/web/scripts/verify_contrast_and_axe.mjs --url http://127.0.0.1:5173/styleguide
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIR = path.resolve(__dirname, '..')
const requireFromWeb = createRequire(path.join(WEB_DIR, 'package.json'))

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

export const DESIGN_TOKENS = {
  dark: {
    surfaces: {
      'ink-950': '#0A0C0B',
      'ink-900': '#101311',
      'ink-850': '#141816',
      'ink-800': '#171B19',
      'ink-700': '#222724',
    },
    foregrounds: {
      'bone-100': '#ECE8DE',
      'bone-300': '#B9B5A9',
      'bone-500': '#8F8C82',
      attack: '#FF5A36',
      defend: '#6FCFB2',
      caution: '#F2B84B',
    },
  },
  light: {
    surfaces: {
      'paper-950': '#F3EFE6',
      'paper-900': '#EEE9DF',
      'paper-850': '#E9E3D7',
      'paper-800': '#E4DED1',
      'paper-700': '#DFD8C8',
    },
    foregrounds: {
      'bone-100': '#141412',
      'bone-300': '#3E3D38',
      'bone-500': '#5A584F',
      attack: '#B02E15',
      defend: '#14634B',
      caution: '#7A4D03',
    },
  },
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim()
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function relativeLuminance([r, g, b]) {
  const srgb = [r, g, b].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexToRgb(hexA))
  const l2 = relativeLuminance(hexToRgb(hexB))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function computeMatrix() {
  const rows = []
  let failuresOnPrimarySurfaces = 0

  for (const [themeName, palette] of Object.entries(DESIGN_TOKENS)) {
    for (const [fgName, fgHex] of Object.entries(palette.foregrounds)) {
      const ratios = {}
      for (const [bgName, bgHex] of Object.entries(palette.surfaces)) {
        const ratio = Number(contrastRatio(fgHex, bgHex).toFixed(2))
        ratios[bgName] = ratio
        // Kiểm tra nghiêm ngặt chuẩn WCAG AA (>= 4.5:1) trên TẤT CẢ 5 tầng bề mặt (950 -> 700)
        if (ratio < 4.5) {
          failuresOnPrimarySurfaces++
        }
      }
      rows.push({ theme: themeName, fgName, fgHex, ratios })
    }
  }
  return { rows, failuresOnPrimarySurfaces }
}

function buildSpecimenHtml() {
  const renderThemeBlock = (themeName, palette) => {
    const cards = Object.entries(palette.surfaces)
      .map(([bgName, bgHex]) => {
        const lines = Object.entries(palette.foregrounds)
          .map(
            ([fgName, fgHex]) =>
              `<p style="color:${fgHex};margin:4px 0;font-size:14px;">[${fgName} ${fgHex}] trên [${bgName} ${bgHex}] — Phát hiện &amp; Đánh cắp thông tin xác thực</p>`,
          )
          .join('\n')
        return `<section aria-label="${themeName}-${bgName}" style="background:${bgHex};padding:16px;margin-bottom:12px;border:1px solid rgba(128,128,128,0.25);">
          <h2 style="color:${palette.foregrounds['bone-100']};font-size:16px;margin:0 0 8px 0;">${themeName.toUpperCase()} // ${bgName} (${bgHex})</h2>
          ${lines}
          <div style="margin-top:8px;display:flex;gap:12px;">
            <span style="color:${palette.foregrounds.attack};font-family:monospace;font-size:12px;">▲ ATTACKER // HÀNH VI XÂM NHẬP [VÍ DỤ: T0000]</span>
            <span style="color:${palette.foregrounds.defend};font-family:monospace;font-size:12px;">❖ DEFENDER // PHÁT HIỆN &amp; GIẢM THIỂU [VÍ DỤ: DET-000]</span>
          </div>
        </section>`
      })
      .join('\n')
    return cards
  }

  return `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8" /><title>ATT&amp;CK Lab Token Contrast &amp; Axe Audit</title></head>
<body style="margin:0;padding:24px;background:#0A0C0B;font-family:system-ui,sans-serif;">
  <main id="main-content">
    <h1 style="color:#ECE8DE;font-size:20px;">Kiểm toán Tương phản WCAG 2.1 &amp; Axe-Core — ATT&amp;CK Lab</h1>
    ${renderThemeBlock('dark', DESIGN_TOKENS.dark)}
    ${renderThemeBlock('light', DESIGN_TOKENS.light)}
  </main>
</body>
</html>`
}

async function runAxeAudit(targetUrl) {
  const puppeteer = requireFromWeb('puppeteer-core')
  const axeSource = fs.readFileSync(requireFromWeb.resolve('axe-core/axe.min.js'), 'utf-8')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 },
  })

  try {
    const page = await browser.newPage()
    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: 'networkidle2' })
    } else {
      await page.setContent(buildSpecimenHtml(), { waitUntil: 'load' })
    }
    await page.addScriptTag({ content: axeSource })
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })
    })
    return {
      passes: results.passes.length,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })),
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const urlFlagIdx = process.argv.indexOf('--url')
  const targetUrl = urlFlagIdx >= 0 ? process.argv[urlFlagIdx + 1] : null

  const { rows, failuresOnPrimarySurfaces } = computeMatrix()
  console.log('=== WCAG 2.1 CONTRAST MATRIX (ALL TOKEN PAIRS) ===')
  for (const r of rows) {
    const pairs = Object.entries(r.ratios)
      .map(([bg, val]) => `${bg}=${val}:1`)
      .join(' | ')
    console.log(`[${r.theme.toUpperCase()}] ${r.fgName.padEnd(9)} (${r.fgHex}) -> ${pairs}`)
  }

  const axeSummary = await runAxeAudit(targetUrl)
  console.log('\n=== AXE-CORE WCAG 2.1 AA AUDIT ===')
  console.log(JSON.stringify(axeSummary, null, 2))

  if (failuresOnPrimarySurfaces > 0) {
    console.error(`FAILED: ${failuresOnPrimarySurfaces} primary surface token pairs below 4.5:1`)
    process.exit(1)
  }
  if (axeSummary.violations.length > 0) {
    console.error(`FAILED: ${axeSummary.violations.length} axe-core violations found`)
    process.exit(1)
  }
  console.log('\nALL CONTRAST PAIRS (>= 4.5:1) & AXE-CORE CHECKS PASSED!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
