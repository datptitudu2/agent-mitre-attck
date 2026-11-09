import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AttackDomain } from '@/lib/types'
import { useAuthStore } from '@/stores/useAuthStore'

export interface BookmarkRecord {
  id: string
  user_id: string
  domain: AttackDomain
  attack_id: string
  note: string
  created_at: string
}

export interface NoteRecord {
  id: string
  user_id: string
  attack_id: string
  body_md: string
  updated_at: string
}

export interface CoverageLayerTechnique {
  techniqueID: string
  score: number
  comment?: string
  color?: string
  tactic?: string
}

export interface CoverageLayerRecord {
  id: string
  user_id: string
  name: string
  description: string
  domain: AttackDomain
  techniques: CoverageLayerTechnique[]
  shared: boolean
  updated_at: string
}

export function useBookmarks() {
  const user = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['bookmarks', user?.id],
    enabled: Boolean(user && supabase),
    queryFn: async () => {
      if (!supabase || !user) return [] as BookmarkRecord[]
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as BookmarkRecord[]
    },
  })

  const toggleBookmark = useMutation({
    mutationFn: async (payload: {
      attackId: string
      domain: AttackDomain
      existingId?: string
    }) => {
      if (!supabase || !user) throw new Error('Chưa đăng nhập')
      if (payload.existingId) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', payload.existingId)
        if (error) throw error
        return { action: 'removed' as const }
      }
      const { error } = await supabase.from('bookmarks').upsert(
        {
          user_id: user.id,
          domain: payload.domain,
          attack_id: payload.attackId,
          note: '',
        },
        { onConflict: 'user_id,domain,attack_id' },
      )
      if (error) throw error
      return { action: 'added' as const }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks', user?.id] })
    },
  })

  return { ...query, bookmarks: query.data ?? [], toggleBookmark }
}

export function useTechniqueNote(attackId: string | null) {
  const user = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['note', user?.id, attackId],
    enabled: Boolean(user && supabase && attackId),
    queryFn: async () => {
      if (!supabase || !user || !attackId) return null
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('attack_id', attackId)
        .maybeSingle()
      if (error) throw error
      return (data as NoteRecord | null) ?? null
    },
  })

  const saveNote = useMutation({
    mutationFn: async (bodyMd: string) => {
      if (!supabase || !user || !attackId) throw new Error('Chưa đăng nhập')
      const { error } = await supabase.from('notes').upsert(
        {
          user_id: user.id,
          attack_id: attackId,
          body_md: bodyMd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,attack_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['note', user?.id, attackId] })
    },
  })

  return { note: query.data ?? null, isLoading: query.isLoading, saveNote }
}

export function useLessonProgress() {
  const user = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['progress', user?.id],
    enabled: Boolean(user && supabase),
    queryFn: async () => {
      if (!supabase || !user) return [] as Array<{ lesson_slug: string; completed_at: string }>
      const { data, error } = await supabase
        .from('progress')
        .select('lesson_slug, completed_at')
        .eq('user_id', user.id)
      if (error) throw error
      return data ?? []
    },
  })

  const markCompleted = useMutation({
    mutationFn: async (lessonSlug: string) => {
      if (!supabase || !user) throw new Error('Chưa đăng nhập')
      const { error } = await supabase.from('progress').upsert(
        {
          user_id: user.id,
          lesson_slug: lessonSlug,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_slug' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['progress', user?.id] })
    },
  })

  const completedSlugs = new Set((query.data ?? []).map((r) => r.lesson_slug))
  return { ...query, completedSlugs, markCompleted }
}

export function useCoverageLayers(domain?: AttackDomain) {
  const user = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['coverage_layers', user?.id, domain ?? 'all'],
    enabled: Boolean(user && supabase),
    queryFn: async () => {
      if (!supabase || !user) return [] as CoverageLayerRecord[]
      let req = supabase
        .from('coverage_layers')
        .select('*')
        .order('updated_at', { ascending: false })
      if (domain) {
        req = req.eq('domain', domain)
      }
      const { data, error } = await req
      if (error) throw error
      return (data ?? []) as CoverageLayerRecord[]
    },
  })

  const saveLayer = useMutation({
    mutationFn: async (payload: {
      id?: string
      name: string
      description: string
      domain: AttackDomain
      techniques: CoverageLayerTechnique[]
      shared: boolean
    }) => {
      if (!supabase || !user) throw new Error('Chưa đăng nhập')
      const row = {
        ...(payload.id ? { id: payload.id } : {}),
        user_id: user.id,
        name: payload.name,
        description: payload.description,
        domain: payload.domain,
        techniques: payload.techniques,
        shared: payload.shared,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('coverage_layers')
        .upsert(row)
        .select('*')
        .single()
      if (error) throw error
      return data as CoverageLayerRecord
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['coverage_layers'] })
    },
  })

  const deleteLayer = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase || !user) throw new Error('Chưa đăng nhập')
      const { error } = await supabase.from('coverage_layers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['coverage_layers'] })
    },
  })

  return { layers: query.data ?? [], isLoading: query.isLoading, saveLayer, deleteLayer }
}
