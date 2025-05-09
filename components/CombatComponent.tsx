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
  setPlayerHp: React.Dispatch<React.SetStateAction<number>>;
  enemyLevel: number;
  playerLevel: number;
  buffStats: Record<string, number>;
  onVictory: () => void;
  onEnd: (result: "승리" | "패배") => void;
}

export function CombatComponent({
  playerHp,
  setPlayerHp,
  enemyLevel,
  playerLevel,
  buffStats,
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

  const enemyAC = 13;
  const enemyAtkBonus = 4;
  const enemyDmgDie = 6;

  const strength = 10 + playerLevel * 2 + (buffStats.strength || 0);
  const dexterity = 10 + playerLevel * 1 + (buffStats.dexterity || 0);
  const constitution = 10 + playerLevel * 3 + (buffStats.constitution || 0);
  const strMod = Math.floor((strength - 10) / 2);
  const conMod = Math.floor((constitution - 10) / 4);

  const [isRolling, setIsRolling] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);

  const playerAttack = () => {
    const roll = rollD20(),
      total = roll + 5;
    if (total >= enemyAC) {
      const dmg = Math.max(1, rollDice(8) + strMod);
      setEnemyHp((h) => {
        const newHp = h - dmg;
        setEnemyHit(true);
        setTimeout(() => setEnemyHit(false), 300);
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
      setPlayerHp((h) => {
        const newHp = h - dmg;
        setPlayerHit(true);
        setTimeout(() => setPlayerHit(false), 300);
        if (newHp <= 0) {
          onEnd("패배");
        }
        return newHp;
      });
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

  return (
      <div className="w-full max-w-md p-4 bg-gray-800 rounded-lg shadow-inner mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-red-400">⚔️ 전투!</h2>
        <div className="flex justify-between mb-4 text-gray-200">
          <p className={playerHit ? "text-red-400 animate-pulse" : ""}>
            💖 {playerHp > 0 ? playerHp : 0}
          </p>
          <p className={enemyHit ? "text-red-400 animate-pulse" : ""}>
            ☠️ {enemyHp > 0 ? enemyHp : 0}
          </p>
        </div>
        <div className="mb-4 flex justify-between text-sm text-gray-200">
          <span>
            STR: {strength} (+{strMod})
          </span>
          <span>DEX: {dexterity}</span>
          <span>CON: {constitution}</span>
        </div>
        {isRolling && (
          <div className="flex justify-center mb-4">
            <div className="text-6xl animate-spin">🎲</div>
          </div>
        )}
        <button
          onClick={handleAttackClick}
          disabled={playerHp <= 0 || enemyHp <= 0 || isRolling}
          className="w-full py-2 bg-red-600 hover:bg-red-500 active:translate-y-0.5 rounded-lg font-semibold text-white"
        >
          공격 (d20+5, dmg d8+{strMod})
        </button>
      </div>
  );
}
