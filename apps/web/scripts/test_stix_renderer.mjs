import assert from 'node:assert'
import React from 'react'

// Pure regex test logic mirroring renderStixText in stixRenderer.tsx
function parseStix(text) {
  if (!text) return { textNodes: [], citations: [] }

  const citationsMap = new Map()
  const citationsList = []
  const citationRegex = /\(Citation:\s*([^)]+)\)/g
  let citMatch
  while ((citMatch = citationRegex.exec(text)) !== null) {
    const rawName = citMatch[1].trim()
    if (!citationsMap.has(rawName)) {
      const idx = citationsList.length + 1
      citationsMap.set(rawName, idx)
      citationsList.push({ index: idx, name: rawName })
    }
  }

  const combinedRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\(Citation:\s*([^)]+)\)|<code>(.*?)<\/code>/g
  const tokens = []
  let lastIndex = 0
  let match

  while ((match = combinedRegex.exec(text)) !== null) {
    const [fullMatch, linkText, linkUrl, citationName, codeContent] = match
    const matchIndex = match.index

    if (matchIndex > lastIndex) {
      tokens.push({ type: 'text', val: text.slice(lastIndex, matchIndex) })
    }

    if (linkText && linkUrl) {
      tokens.push({ type: 'link', text: linkText, url: linkUrl })
    } else if (citationName) {
      tokens.push({ type: 'citation', num: citationsMap.get(citationName.trim()), name: citationName.trim() })
    } else if (codeContent !== undefined) {
      tokens.push({ type: 'code', val: codeContent })
    }
    lastIndex = matchIndex + fullMatch.length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', val: text.slice(lastIndex) })
  }

  return { tokens, citations: citationsList }
}

// Test Case 1: Đoạn văn thực tế từ SolarWinds STIX 2.1
const solarWindsRaw = `During the [SolarWinds Compromise](https://attack.mitre.org/campaigns/C0024), [APT29](https://attack.mitre.org/groups/G0016) gained initial network access via a trojanized update of SolarWinds Orion software.(Citation: FireEye SUNBURST Backdoor December 2020)(Citation: Cybersecurity Advisory SVR TTP May 2021)`

const res1 = parseStix(solarWindsRaw)
console.log('--- Test 1: SolarWinds Procedure Parsing ---')
assert.strictEqual(res1.citations.length, 2, 'Must extract exactly 2 unique citations')
assert.strictEqual(res1.citations[0].name, 'FireEye SUNBURST Backdoor December 2020')
assert.strictEqual(res1.citations[1].name, 'Cybersecurity Advisory SVR TTP May 2021')

const links = res1.tokens.filter(t => t.type === 'link')
assert.strictEqual(links.length, 2, 'Must extract exactly 2 markdown links')
assert.strictEqual(links[0].text, 'SolarWinds Compromise')
assert.strictEqual(links[0].url, 'https://attack.mitre.org/campaigns/C0024')
assert.strictEqual(links[1].text, 'APT29')

// Test Case 2: Code tag inline và trích dẫn lặp lại
const codeAndDupCitation = `Adversary ran <code>powershell.exe -enc ...</code> to decode.(Citation: FireEye SUNBURST Backdoor December 2020)`
const res2 = parseStix(codeAndDupCitation)
console.log('--- Test 2: Code tag and duplicate citation ---')
const codeTokens = res2.tokens.filter(t => t.type === 'code')
assert.strictEqual(codeTokens.length, 1)
assert.strictEqual(codeTokens[0].val, 'powershell.exe -enc ...')
assert.strictEqual(res2.citations[0].index, 1)

console.log('ALL STIX PARSER UNIT TESTS PASSED!')

