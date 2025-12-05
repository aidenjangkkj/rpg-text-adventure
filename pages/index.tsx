// pages/test.tsx
"use client";
import "../app/globals.css";
import React, { useState, useEffect } from "react";
import { useStoryStore } from "@/stores/useStoryStore";
import { CombatComponent } from "@/components/CombatComponent";
import { Analytics } from "@vercel/analytics/next"
// ▶ Buff 타입 정의
interface Buff {
  target: "hp" | "strength" | "dexterity" | "constitution" | "energy";
  amount: number;
}

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-6" role="status" aria-label="스토리 생성 중">
    <div className="w-10 h-10 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-yellow-200 text-sm">스토리를 생성하는 중입니다…</p>
  </div>
);

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
  const [race, setRace] = useState("");
  const [className, setClassName] = useState("");
  const [raceList, setRaceList] = useState<string[]>([]);
  const [classList, setClassList] = useState<string[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const rRes = await fetch('/api/races');
        if (rRes.ok) {
          setRaceList(await rRes.json());
        }
        const cRes = await fetch('/api/classes');
        if (cRes.ok) {
          setClassList(await cRes.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadOptions();
  }, []);

  // ▶ 플레이어 상태
  const playerHp = useStoryStore((s) => s.playerHp);
  const setPlayerHp = useStoryStore((s) => s.setPlayerHp);
  const playerLevel = useStoryStore((s) => s.playerLevel);
  const setPlayerLevel = useStoryStore((s) => s.setPlayerLevel);
  const energy = useStoryStore((s) => s.energy);
  const setEnergy = useStoryStore((s) => s.setEnergy);
  const setStoreRace = useStoryStore((s) => s.setRace);
  const setStoreClass = useStoryStore((s) => s.setClassName);

  // ▶ Buff 상태 (전투용)
  const buffs = useStoryStore((s) => s.buffs);
  const setBuffs = useStoryStore((s) => s.setBuffs);

  // ▶ 스토리/플로우 상태
  const [background, setBackground] = useState("");
  const history = useStoryStore((s) => s.history);
  const addHistory = useStoryStore((s) => s.addHistory);
  const story = useStoryStore((s) => s.story);
  const setStory = useStoryStore((s) => s.setStory);
  const choices = useStoryStore((s) => s.choices);
  const setChoices = useStoryStore((s) => s.setChoices);
  const [isCombat, setIsCombat] = useState(false);
  const [pendingCombat, setPendingCombat] = useState(false);
  const dangerLevel = useStoryStore((s) => s.dangerLevel);
  const setDangerLevel = useStoryStore((s) => s.setDangerLevel);
  const [enemyLevel, setEnemyLevel] = useState(1);
  const [pendingMessage, setPendingMessage] = useState("");

  const loading = useStoryStore((s) => s.loading);
  const setLoading = useStoryStore((s) => s.setLoading);
  const error = useStoryStore((s) => s.error);
  const setError = useStoryStore((s) => s.setError);
  const hasStarted = history.length > 0;
  const [gameOver, setGameOver] = useState(false);

  const sanitizeResponse = (raw: Partial<ResBody>): ResBody => {
    const story = typeof raw.story === "string" ? raw.story.trim() : "";
    const normalizedChoices = Array.isArray(raw.choices)
      ? raw.choices.filter(
          (choice): choice is string =>
            typeof choice === "string" && choice.trim().length > 0
        )
      : [];
    const danger = typeof raw.dangerLevel === "string" ? raw.dangerLevel : "";
    const normalizedBuffs = Array.isArray(raw.buffs)
      ? raw.buffs.filter(
          (buff): buff is Buff =>
            !!buff &&
            typeof buff === "object" &&
            typeof buff.target === "string" &&
            typeof buff.amount === "number"
        )
      : [];

    return {
      story:
        story ||
        "새로운 이야기를 불러오는 데 문제가 발생했습니다. 안전하게 다음 선택으로 진행하세요.",
      choices: normalizedChoices,
      isCombat: Boolean(raw.isCombat),
      dangerLevel: danger,
      enemyLevel:
        typeof raw.enemyLevel === "number" && Number.isFinite(raw.enemyLevel)
          ? raw.enemyLevel
          : playerLevel,
      buffs: normalizedBuffs,
      error: raw.error,
    };
  };

  // ▶ AI 호출 공통 함수
  const callStory = async (choice: string, combatResult?: "승리" | "패배") => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background,
          history,
          choice,
          combatResult,
          race,
          className,
        }),
      });

      const text = await res.text();
      let data: ResBody;
      try {
        data = sanitizeResponse(JSON.parse(text));
      } catch (err) {
        console.error("JSON parse 실패", err, text);
        data = sanitizeResponse({
          story:
            "응답을 해석할 수 없었습니다. 잠시 숨을 고르고 다시 선택해 주세요.",
          choices: ["계속 진행"],
          dangerLevel: "low",
        });
      }

      if (!res.ok) {
        const apiError = data.error || `Failed to fetch story: ${res.status}`;
        throw new Error(apiError);
      }

      if (data.error) {
        setError(data.error);
      }

      // 기본 플로우
      setStory(data.story ?? "");
      const nextChoices = data.choices && data.choices.length > 0
        ? data.choices
        : data.isCombat
          ? ["전투 준비"]
          : [];
      setChoices(nextChoices);
      if (data.isCombat) {
        setPendingMessage("적이 접근합니다. 전투 태세를 갖추세요!");
        setPendingCombat(true);
        setIsCombat(false);
      } else {
        setPendingCombat(false);
        setPendingMessage("");
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
        let hpBonus = 0;
        let energyBonus = 0;
        const updatedBuffs = { ...buffs };
        data.buffs.forEach((b) => {
          if (b.target === "hp") {
            hpBonus += b.amount;
          } else if (b.target === "energy") {
            energyBonus += b.amount;
          } else {
            updatedBuffs[b.target] = (updatedBuffs[b.target] || 0) + b.amount;
          }
        });
        if (hpBonus !== 0) {
          setPlayerHp(playerHp + hpBonus);
        }
        if (energyBonus !== 0) {
          const capped = Math.min(120, Math.max(0, energy + energyBonus));
          setEnergy(capped);
        }
        setBuffs(updatedBuffs);
      }

      // 히스토리 업데이트 (길이 제한)
      const preview = (data.story || "").slice(0, 200);
      addHistory(`선택: ${choice || "자동 진행"}`);
      addHistory(`요약: ${preview}${data.story && data.story.length > 200 ? "..." : ""}`);
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
      `당신의 이름은 ${name}이며, ${age}살 ${gender} ${race} ${className}입니다. 여정이 시작됩니다.`
    );
    setStoreRace(race);
    setStoreClass(className);
    setEnergy(100);
    addHistory("시작");
    callStory("");
  };

  // ▶ 전투 종료 콜백
  const handleCombatEnd = (result: "승리" | "패배") => {
    setIsCombat(false);
    if (result === "패배") {
      setGameOver(true);
    } else {
      setPendingCombat(false);
      callStory("", result);
    }
  };

  useEffect(() => {
    if (!pendingCombat) return;
    const timer = setTimeout(() => {
      setIsCombat(true);
      setPendingCombat(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [pendingCombat]);

  // ▶ 다시 시작
  const handleRestart = () => {
    setPlayerHp(100);
    setPlayerLevel(1);
    setEnergy(100);
    setBuffs({ hp: 0, strength: 0, dexterity: 0, constitution: 0, energy: 0 });
    setRace('');
    setClassName('');
    setBackground("");
    setStory("");
    setChoices([]);
    setDangerLevel("");
    setEnemyLevel(1);
    setIsCombat(false);
    setGameOver(false);
    useStoryStore.setState({
      history: [],
      error: null,
      loading: false,
      playerHp: 100,
      playerLevel: 1,
      energy: 100,
      buffs: { hp: 0, strength: 0, dexterity: 0, constitution: 0, energy: 0 },
      race: '',
      className: '',
    });
  };

  const handleRest = () => {
    if (loading || pendingCombat || isCombat) return;
    const recoveredHp = Math.min(120, playerHp + 8);
    const recoveredEnergy = Math.min(120, energy + 25);
    setPlayerHp(recoveredHp);
    setEnergy(recoveredEnergy);
    addHistory("휴식: 체력과 에너지를 회복했습니다.");
    const updatedStory = `${story}\n\n당신은 잠시 숨을 고르며 휴식을 취했습니다.`.trim();
    setStory(updatedStory);
    callStory("휴식");
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
        <select
          value={race}
          onChange={(e) => setRace(e.target.value)}
          className="mb-2 w-64 p-2 bg-gray-800 rounded"
        >
          <option value="">종족 선택</option>
          {raceList.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="mb-4 w-64 p-2 bg-gray-800 rounded"
        >
          <option value="">클래스 선택</option>
          {classList.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
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
  if (!isCombat && choices.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-yellow-200 p-4">
        <h1 className="text-4xl mb-4">🏆 모험 완료!</h1>
        <p className="mb-6">여정이 끝났습니다. 수고하셨습니다!</p>
        <button
          onClick={handleRestart}
          className="px-6 py-3 bg-yellow-600 rounded text-black"
        >
          처음부터 다시 시작
        </button>
      </div>
    );
  }

  const activeBuffs = Object.entries(buffs).filter(([, v]) => v > 0);
  const energyWidth = Math.min(100, Math.round((energy / 120) * 100));
  const dangerTone =
    dangerLevel === "high"
      ? "text-red-400"
      : dangerLevel === "medium"
        ? "text-yellow-300"
        : "text-green-300";

  // ▶ 메인 게임 UI
  return (

    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-900 to-black text-yellow-200">
    <Analytics/>
      <h1 className="text-3xl mb-6 text-center">모험 진행 중</h1>

      {/* ▶ 플레이어 상태 */}
      <div className="max-w-md mx-auto grid gap-3 mb-4">
        <div className="p-3 bg-gray-800 rounded flex justify-between items-center shadow">
          <div>
            <p className="text-sm text-gray-300">HP</p>
            <p className="text-xl font-semibold">{playerHp}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300">Lv</p>
            <p className="text-xl font-semibold">{playerLevel}</p>
          </div>
        </div>
        <div className="p-3 bg-gray-800 rounded shadow">
          <div className="flex justify-between text-sm text-gray-300">
            <span>에너지</span>
            <span>{energy} / 120</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded mt-2">
            <div
              className="h-2 bg-green-500 rounded"
              style={{ width: `${energyWidth}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ▶ 위험도 & 버프 */}
      <div className="max-w-md mx-auto mb-3 p-3 bg-gray-800 rounded shadow">
        <p className="text-sm text-gray-300 mb-1">위험도</p>
        <p className={`font-semibold ${dangerTone}`}>
          {dangerLevel || "알 수 없음"}
        </p>
      </div>
      <div className="max-w-md mx-auto mb-4 p-3 bg-gray-800 rounded shadow">
        <p className="text-sm text-gray-300 mb-2">버프</p>
        <div className="flex flex-wrap gap-2">
          {activeBuffs.length > 0 ? (
            activeBuffs.map(([key, v]) => (
              <span
                key={key}
                className="px-2 py-1 rounded-full text-xs bg-yellow-700 text-black"
              >
                {key} +{v}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">적용된 버프 없음</span>
          )}
        </div>
      </div>

      {pendingCombat && (
        <div className="max-w-md mx-auto mb-4 p-3 bg-red-900/40 border border-red-500 rounded shadow animate-pulse">
          <p className="font-semibold text-red-200">{pendingMessage || "전투 준비 중"}</p>
          <p className="text-sm text-red-100 mt-1">잠시 후 전투 화면으로 전환됩니다.</p>
        </div>
      )}

      <div className="max-w-md mx-auto mb-6 p-4 bg-gray-800 rounded whitespace-pre-wrap">
        {loading ? <LoadingSpinner /> : <p className="break-keep">{story}</p>}
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
            dangerLevel={dangerLevel}
            energy={energy}
            setEnergy={setEnergy}
            onVictory={() => setPlayerLevel(playerLevel + 1)}
            onEnd={handleCombatEnd}
          />
        </div>
      ) : (
        <>
          <div className="max-w-md mx-auto mb-2 flex justify-end">
            <button
              onClick={handleRest}
              disabled={loading || pendingCombat}
              className="px-3 py-2 text-sm bg-blue-700 rounded shadow disabled:opacity-60"
            >
              💤 휴식 (에너지 회복)
            </button>
          </div>
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
                disabled={loading || pendingCombat}
                className="px-4 py-2 bg-yellow-600 rounded disabled:opacity-60"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
