// components/CombatComponent.tsx
"use client";
import "../app/globals.css";
import React, { useState, useEffect } from "react";

// D&D 스타일 주사위 함수
function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}
function rollD20(): number {
  return rollDice(20);
}

interface CombatProps {
  playerHp: number;
  setPlayerHp: (newHp: number) => void;
  enemyLevel: number;
  playerLevel: number;
  buffStats: Record<string, number>;
  dangerLevel: string;
  energy: number;
  setEnergy: (energy: number) => void;
  onVictory: () => void;
  onEnd: (result: "승리" | "패배") => void;
}

export function CombatComponent({
  playerHp,
  setPlayerHp,
  enemyLevel,
  playerLevel,
  buffStats,
  dangerLevel,
  energy,
  setEnergy,
  onVictory,
  onEnd,
}: CombatProps) {
  const baseHp = 20;
  const hpPerLevel = 5;
  // ▶ 초기화된 적 HP
  const [enemyHp, setEnemyHp] = useState(
    () => baseHp + enemyLevel * hpPerLevel
  );

  // ▶ enemyLevel이 바뀔 때마다 HP 리셋
  useEffect(() => {
    setEnemyHp(baseHp + enemyLevel * hpPerLevel);
  }, [enemyLevel]);

  const difficulty = {
    low: { ac: 12, atk: 3, dmg: 6 },
    medium: { ac: 13, atk: 5, dmg: 8 },
    high: { ac: 14, atk: 7, dmg: 10 },
  } as const;
  const tuning =
    difficulty[(dangerLevel as keyof typeof difficulty) || "medium"] || difficulty.medium;

  const enemyAC = tuning.ac + Math.floor(enemyLevel / 2);
  const enemyAtkBonus = tuning.atk + Math.floor(enemyLevel / 2);
  const enemyDmgDie = tuning.dmg;

  const strength = 10 + playerLevel * 2 + (buffStats.strength || 0);
  const dexterity = 10 + playerLevel * 1 + (buffStats.dexterity || 0);
  const constitution = 10 + playerLevel * 3 + (buffStats.constitution || 0);
  const strMod = Math.floor((strength - 10) / 2);
  const conMod = Math.floor((constitution - 10) / 4);

  const [isRolling, setIsRolling] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerDamage, setPlayerDamage] = useState<number | null>(null);
  const [enemyDamage, setEnemyDamage] = useState<number | null>(null);
  const [combatNotice, setCombatNotice] = useState<string>("");
  const attackCost = 10;

  const playerAttack = () => {
    if (energy < attackCost) {
      setCombatNotice("에너지가 부족합니다. 재정비가 필요합니다.");
      return;
    }
    setEnergy(Math.max(0, energy - attackCost));
    const roll = rollD20(),
      total = roll + 5;
    if (total >= enemyAC) {
      const dmg = Math.max(1, rollDice(8) + strMod);
      setEnemyHp((h) => {
        const newHp = h - dmg;
        setEnemyDamage(dmg);
        setEnemyHit(true);
        setTimeout(() => {
          setEnemyHit(false);
          setEnemyDamage(null);
        }, 800);
        if (newHp <= 0) {
          onVictory();
          onEnd("승리");
        }
        return newHp;
      });
    }
  };

  const enemyAttack = () => {
    const roll = rollD20(),
      total = roll + enemyAtkBonus;
    if (total >= 15) {
      const dmg = Math.max(1, rollDice(enemyDmgDie) - conMod);
      const newHp = playerHp - dmg;
      setPlayerHp(newHp);
      setPlayerDamage(dmg);
      setPlayerHit(true);
      setTimeout(() => {
        setPlayerHit(false);
        setPlayerDamage(null);
      }, 800);
      if (newHp <= 0) {
        onEnd("패배");
      }
    }
  };

  const handleAttackClick = () => {
    if (isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      playerAttack();
      setIsRolling(false);
      setTimeout(() => {
        if (enemyHp > 0 && playerHp > 0) {
          enemyAttack();
        }
      }, 500);
    }, 1000);
  };

  const handleRefocus = () => {
    if (isRolling) return;
    const recoveredEnergy = Math.min(120, energy + 18);
    setEnergy(recoveredEnergy);
    setCombatNotice("숨을 고르고 힘을 비축했습니다.");
    setTimeout(() => {
      if (enemyHp > 0 && playerHp > 0) {
        enemyAttack();
      }
    }, 400);
  };

  return (
    <div className="w-full max-w-md mx-auto retro-frame rounded-2xl p-5 text-gray-100">
      <div className="relative flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase text-pink-200/70 font-tech">battle status</p>
          <h2 className="text-xl font-bold text-pink-200 neon-title font-arcade">⚔️ 전투 개시</h2>
        </div>
        <span className="px-3 py-1 rounded-lg bg-rose-900/50 border border-pink-400/40 text-xs font-tech">
          {dangerLevel || "Unknown"}
        </span>
        <div className="scanline-overlay" aria-hidden></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="relative p-3 rounded-xl bg-slate-900/60 border border-cyan-400/20 shadow-inner">
          <p
            className={`text-sm font-semibold flex items-center gap-2 ${
              playerHit ? "text-red-200 hit-flash hit-shake" : "text-cyan-100"
            }`}
          >
            <span className="text-lg">🛡️</span> HP {playerHp > 0 ? playerHp : 0}
          </p>
          {playerDamage !== null && (
            <span className="absolute -top-4 left-3 text-xs text-red-200 drop-shadow damage-float font-tech">
              -{playerDamage}
            </span>
          )}
        </div>
        <div className="relative p-3 rounded-xl bg-slate-900/60 border border-amber-400/20 shadow-inner text-right">
          <p
            className={`text-sm font-semibold flex items-center justify-end gap-2 ${
              enemyHit ? "text-red-200 hit-flash hit-shake" : "text-amber-100"
            }`}
          >
            ☠️ HP {enemyHp > 0 ? enemyHp : 0}
          </p>
          {enemyDamage !== null && (
            <span className="absolute -top-4 right-3 text-xs text-orange-200 drop-shadow damage-float font-tech">
              -{enemyDamage}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-xs font-tech uppercase tracking-wide">
        <div className="p-2 rounded-lg bg-slate-900/40 border border-cyan-400/20 text-center">
          <p className="text-cyan-300">STR</p>
          <p className="text-sm font-semibold">{strength}</p>
          <p className="text-[10px] text-cyan-200/70">+{strMod}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/40 border border-emerald-400/20 text-center">
          <p className="text-emerald-300">DEX</p>
          <p className="text-sm font-semibold">{dexterity}</p>
          <p className="text-[10px] text-emerald-200/70">agility</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/40 border border-amber-400/20 text-center">
          <p className="text-amber-300">CON</p>
          <p className="text-sm font-semibold">{constitution}</p>
          <p className="text-[10px] text-amber-200/70">guard</p>
        </div>
      </div>

      <div className="mb-4 text-sm">
        <div className="flex justify-between mb-1 text-cyan-100 font-tech uppercase">
          <span>전투 에너지</span>
          <span>
            {energy} / 120 <span className="text-[10px] text-cyan-200/60">(공격 시 -10)</span>
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-cyan-400/30">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400 rounded-full"
            style={{ width: `${Math.min(100, (energy / 120) * 100)}%` }}
          ></div>
        </div>
        <p className="text-[11px] text-cyan-100/70 mt-2 font-tech">
          난이도: {dangerLevel || "알 수 없음"} · 적 AC {enemyAC} · 공격보너스 +{enemyAtkBonus}
        </p>
      </div>

      {isRolling && (
        <div className="flex justify-center mb-4">
          <div className="relative w-20 h-20 rounded-full dice-orb flex items-center justify-center animate-spin">
            <span className="text-4xl">🎲</span>
            <span className="scanline-overlay" aria-hidden></span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleAttackClick}
          disabled={playerHp <= 0 || enemyHp <= 0 || isRolling || energy < attackCost}
          className="w-full py-3 rounded-xl font-arcade text-sm bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400 text-black shadow-lg shadow-rose-900/40 border border-rose-200/40 disabled:opacity-50 disabled:grayscale"
        >
          공격 {`(d20+5, dmg d8+${strMod})`}
        </button>
        <button
          onClick={handleRefocus}
          disabled={playerHp <= 0 || enemyHp <= 0 || isRolling}
          className="w-full py-3 rounded-xl font-tech bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-400 text-slate-950 shadow-lg shadow-sky-900/30 border border-cyan-200/40 disabled:opacity-50 disabled:grayscale"
        >
          재정비하여 에너지 회복
        </button>
      </div>

      {combatNotice && (
        <p className="mt-3 text-center text-xs text-amber-200 font-tech">{combatNotice}</p>
      )}
    </div>
  );
}
