"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { GameEngine } from "@/lib/GameEngine";

const GameEngineContext = createContext<GameEngine | null>(null);

/**
 * Owns the single GameEngine instance for the tree.
 *
 * Kept outside <Canvas> so the engine survives canvas remounts and so DOM-side
 * UI (a future score readout, colour picker, mode switcher) can reach it too.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => new GameEngine(), []);

  useEffect(() => () => engine.dispose(), [engine]);

  // Dev-only handle for tuning zone trajectories and swing feel from the
  // console. The whole block is dead code in a production build.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    window.__punchingBag = engine;
    return () => {
      delete window.__punchingBag;
    };
  }, [engine]);

  return <GameEngineContext.Provider value={engine}>{children}</GameEngineContext.Provider>;
}

export function useGameEngine(): GameEngine {
  const engine = useContext(GameEngineContext);
  if (!engine) throw new Error("useGameEngine must be used inside <GameProvider>");
  return engine;
}

declare global {
  interface Window {
    __punchingBag?: GameEngine;
  }
}
