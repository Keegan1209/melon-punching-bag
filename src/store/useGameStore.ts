import { create } from "zustand";

/**
 * UI-facing state only.
 *
 * Anything that changes every frame -- glove pose, bag angle -- lives in refs
 * inside the render loop, never here. This store exists for state a React
 * component would actually want to read, and as the hook a future score,
 * combo or timer mode would build on.
 */
interface GameState {
  punchCount: number;
  lastZoneId: string | null;
  registerPunch: (zoneId: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  punchCount: 0,
  lastZoneId: null,
  registerPunch: (zoneId) =>
    set((state) => ({ punchCount: state.punchCount + 1, lastZoneId: zoneId })),
  reset: () => set({ punchCount: 0, lastZoneId: null }),
}));
