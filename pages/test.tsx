// pages/test.tsx
"use client";
import "../app/globals.css";
import React, { useState } from "react";
import { CombatComponent } from "@/components/CombatComponent";

// ▶ Buff 타입 정의
interface Buff {
  target: "hp" | "strength" | "dexterity" | "constitution";
  amount: number;
}

// ▶ API 응답 타입 정의
interface ResBody {
  story?: string;
  choices?: string[];
  isCombat?: boolean;
  dangerLevel?: string;
  enemyLevel?: number;
  buffs?: Buff[];
  error?: string;
}

export default function TestPage() {
  // ▶ 캐릭터 상태
  const [name, setName] = useState("");
  const [gender, setGender] = useState("모름");
  const [age, setAge] = useState(18);
  const [race, setRace] = useState("인간");

  // ▶ 플레이어 상태
  const [playerHp, setPlayerHp] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);

  // ▶ Buff 상태 (전투용)
  const [buffs, setBuffs] = useState<Record<string, number>>({
    hp: 0,
    strength: 0,
    dexterity: 0,
    constitution: 0,
  });

  // ▶ 스토리/플로우 상태
  const [background, setBackground] = useState("");
  const [history, setHistory] = useState<string[]>(["시작"]);
  const [story, setStory] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const [isCombat, setIsCombat] = useState(false);
  const [pendingCombat, setPendingCombat] = useState(false);
  const [dangerLevel, setDangerLevel] = useState("");
  const [enemyLevel, setEnemyLevel] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // ▶ AI 호출 공통 함수
  const callStory = async (
    choice: string,
    combatResult?: '승리'| '패배') => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background, history, choice, combatResult }),
      });
      const data = (await res.json()) as ResBody;
      if (data.error) throw new Error(data.error);

      // 기본 플로우
      setStory(data.story ?? "");
      setChoices(data.choices ?? []);
      if (data.isCombat) {
        setPendingCombat(true);
        setIsCombat(false);
      } else {
        setPendingCombat(false);
        setIsCombat(false);
      }
      const dl = data.dangerLevel ?? "";
      setDangerLevel(dl);
      const base = playerLevel;
      let adj = data.enemyLevel ?? base;
      switch (dl) {
        case "low":
          adj = base;
          break;
        case "medium":
          adj = base + 1;
          break;
        case "high":
          adj = base + 2;
          break;
        default:
          adj = data.enemyLevel ?? base;
      }
      setEnemyLevel(adj);

      // 추가 Buffs
      if (data.buffs) {
        data.buffs.forEach((b) => {
          if (b.target === "hp") {
            setPlayerHp((h) => h + b.amount);
          } else {
            setBuffs((prev) => ({
              ...prev,
              [b.target]: (prev[b.target] || 0) + b.amount,
            }));
          }
        });
      }

      // 히스토리 업데이트
      setHistory((h) => [...h, `선택: ${choice}`, `이야기: ${data.story}`]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ▶ 게임 시작
  const handleStart = () => {
    setBackground(
      `당신의 이름은 ${name}이며, ${age}살 ${gender} ${race}입니다. 여정이 시작됩니다.`
    );
    callStory("");
    setHasStarted(true);
  };

  // ▶ 전투 종료 콜백
  const handleCombatEnd = (result: "승리" | "패배") => {
    setIsCombat(false);
    if (result === "패배"){setGameOver(true);}
    else{
      setPendingCombat(false);
      callStory("",result);
    } 
  };

  // ▶ 다시 시작
  const handleRestart = () => {
    setPlayerHp(100);
    setPlayerLevel(1);
    setBuffs({ hp: 0, strength: 0, dexterity: 0, constitution: 0 });
    setBackground("");
    setHistory(["시작"]);
    setStory("");
    setChoices([]);
    setDangerLevel("");
    setEnemyLevel(1);
    setIsCombat(false);
    setError("");
    setHasStarted(false);
    setGameOver(false);
  };

  // ▶ 캐릭터 생성 화면
  if (!hasStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-yellow-200 p-4">
        <h1 className="text-4xl mb-6">모험가 생성</h1>
        <input
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-2 w-64 p-2 bg-gray-800 rounded"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="mb-2 w-64 p-2 bg-gray-800 rounded"
        >
          <option>모름</option>
          <option>남성</option>
          <option>여성</option>
          <option>기타</option>
        </select>
        <input
          type="number"
          min={1}
          value={age}
          onChange={(e) => setAge(+e.target.value)}
          className="mb-2 w-64 p-2 bg-gray-800 rounded"
        />
        <input
          placeholder="종족"
          value={race}
          onChange={(e) => setRace(e.target.value)}
          className="mb-4 w-64 p-2 bg-gray-800 rounded"
        />
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-yellow-600 rounded"
          disabled={!name || loading}
        >
          {loading ? "로딩 중…" : "모험 시작"}
        </button>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  // ▶ Game Over 화면
  if (gameOver || playerHp <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-red-500 p-4">
        <h1 className="text-5xl mb-6">Game Over</h1>
        <button
          onClick={handleRestart}
          className="px-6 py-3 bg-yellow-600 rounded text-black"
        >
          다시 시작하기
        </button>
      </div>
    );
  }

  // ▶ 메인 게임 UI
  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-900 to-black text-yellow-200">
      <h1 className="text-3xl mb-6 text-center">모험 진행 중</h1>

      {/* ▶ 플레이어 상태 */}
      <div className="max-w-md mx-auto flex justify-between mb-4">
        <span>HP: {playerHp}</span>
        <span>Lv: {playerLevel}</span>
      </div>

      {/* ▶ 위험도 & 스토리 */}
      <div className="max-w-md mx-auto mb-4 p-2 bg-gray-800 rounded">
        <p>
          버프:&nbsp;
          {Object.entries(buffs)
            .filter(([, v]) => v > 0)
            .map(([key, v]) => `${key}+${v}`)
            .join(", ") || "없음"}
        </p>
      </div>

      <div className="max-w-md mx-auto mb-4 p-2 bg-gray-800 rounded">
        <p>위험도: {dangerLevel}</p>
      </div>

      <div className="max-w-md mx-auto mb-6 p-4 bg-gray-800 rounded whitespace-pre-wrap">
        {loading ? (
          <p className="text-center text-yellow-400">로딩 중…</p>
        ) : (
          <p>{story}</p>
        )}
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* ▶ 전투 또는 선택지 */}
      {isCombat ? (
        <div className="w-full flex justify-center">
          <CombatComponent
            key={enemyLevel}
            playerHp={playerHp}
            setPlayerHp={setPlayerHp}
            enemyLevel={enemyLevel}
            playerLevel={playerLevel}
            buffStats={buffs}
            onVictory={() => setPlayerLevel((l) => l + 1)}
            onEnd={handleCombatEnd}
          />
        </div>
      ) : (
        <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
{choices.map((opt, i) => (
           <button
             key={i}
             onClick={() => {
               if (pendingCombat) {
                 setPendingCombat(false);
                 setIsCombat(true);
               } else {
                 callStory(opt);
               }
             }}
             disabled={loading}
             className="px-4 py-2 bg-yellow-600 rounded"
           >
             {opt}
           </button>
         ))}
        </div>
      )}
    </div>
  );
}
