import { create } from 'zustand'
import type { AttackDomain } from '@/lib/types'

interface SelectedTechniqueRef {
  attackId: string
  domain?: AttackDomain
}

interface UiState {
  selectedTechnique: SelectedTechniqueRef | null
  commandPaletteOpen: boolean
  openTechnique: (attackId: string, domain?: AttackDomain) => void
  closeTechnique: () => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedTechnique: null,
  commandPaletteOpen: false,
  openTechnique: (attackId, domain) =>
    set({ selectedTechnique: { attackId, domain } }),
  closeTechnique: () => set({ selectedTechnique: null }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}))

if (typeof window !== 'undefined') {
  ;(window as unknown as { __UI_STORE__?: typeof useUiStore }).__UI_STORE__ = useUiStore
}

