import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { TechniqueDetail } from '@/lib/types'

interface TranslateApiResponse {
  translations: string[]
  cached_count: number
}

export function useTechniqueTranslation(detail: TechniqueDetail | undefined) {
  const [isTranslated, setIsTranslated] = useState(false)

  // Tập hợp toàn bộ các chuỗi tiếng Anh cần dịch từ detail
  const textsToTranslate = useMemo(() => {
    if (!detail) return []
    const list: string[] = []

    if (detail.description) list.push(detail.description)

    for (const det of detail.detection_strategies) {
      if (det.name) list.push(det.name)
      for (const an of det.analytics) {
        if (an.name) list.push(an.name)
        if (an.description) list.push(an.description)
        for (const me of an.mutable_elements) {
          if (me.description) list.push(me.description)
        }
      }
    }

    for (const m of detail.mitigations) {
      if (m.name) list.push(m.name)
      if (m.description) list.push(m.description)
    }

    const procs = [
      ...detail.procedures.campaigns,
      ...detail.procedures.groups,
      ...detail.procedures.software,
    ]
    for (const p of procs.slice(0, 30)) {
      if (p.description) list.push(p.description)
    }

    return Array.from(new Set(list))
  }, [detail])

  const { data: translationMap, isFetching: isTranslating } = useQuery({
    queryKey: ['translate-technique', detail?.attack_id, textsToTranslate.length],
    enabled: isTranslated && textsToTranslate.length > 0,
    staleTime: Infinity, // Lưu trữ vô hạn trong phiên
    queryFn: async () => {
      const res = await apiFetch<TranslateApiResponse>('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: textsToTranslate, target_lang: 'vi' }),
      })
      const map = new Map<string, string>()
      textsToTranslate.forEach((original, idx) => {
        if (res.translations[idx]) {
          map.set(original, res.translations[idx])
        }
      })
      return map
    },
  })

  const t = (text: string | undefined): string => {
    if (!text) return ''
    if (!isTranslated || !translationMap) return text
    const trimmed = text.trim()
    return translationMap.get(trimmed) || translationMap.get(text) || text
  }

  const toggleTranslate = () => setIsTranslated((v) => !v)

  return {
    isTranslated,
    isTranslating,
    toggleTranslate,
    t,
  }
}

