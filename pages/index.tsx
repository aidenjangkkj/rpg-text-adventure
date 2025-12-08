// pages/test.tsx
"use client";
import "../app/globals.css";
import React, { useState, useEffect } from "react";
import { useStoryStore } from "@/stores/useStoryStore";
import { CombatComponent } from "@/components/CombatComponent";
import { Analytics } from "@vercel/analytics/next"
import { getRaceTrait, getClassTrait, formatTraitBonuses } from "@/lib/traits";
import type { Trait } from "@/lib/traits";
// ▶ Buff 타입 정의
interface Buff {
  target: "hp" | "strength" | "dexterity" | "constitution" | "energy";
  amount: number;
}

const CHAPTER_GOAL = 3;
const difficultyPresets: Record<"casual" | "standard" | "hard", { label: string; enemyOffset: number; recoveryScale: number; description: string }> = {
  casual: { label: "캐주얼", enemyOffset: -1, recoveryScale: 1.2, description: "위험도를 낮추고 회복량을 늘립니다." },
  standard: { label: "표준", enemyOffset: 0, recoveryScale: 1, description: "기본 밸런스를 유지합니다." },
  hard: { label: "하드", enemyOffset: 1, recoveryScale: 0.85, description: "적을 강하게 하고 회복량을 줄입니다." },
};

type HistoryFilter = "all" | "choice" | "summary" | "system";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  const storedRace = useStoryStore((s) => s.race);
  const storedClass = useStoryStore((s) => s.className);
  const difficulty = useStoryStore((s) => s.difficulty);
  const setDifficulty = useStoryStore((s) => s.setDifficulty);
  const chapter = useStoryStore((s) => s.chapter);
  const setChapter = useStoryStore((s) => s.setChapter);
  const chapterProgress = useStoryStore((s) => s.chapterProgress);
  const setChapterProgress = useStoryStore((s) => s.setChapterProgress);
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
  const setStoreTraits = useStoryStore((s) => s.setTraits);

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
  const traits = useStoryStore((s) => s.traits);
  const [isCombat, setIsCombat] = useState(false);
  const [combatModalOpen, setCombatModalOpen] = useState(false);
  const [combatCountdown, setCombatCountdown] = useState<number | null>(null);
  const [lastCombatResult, setLastCombatResult] = useState<"승리" | "패배" | null>(null);
  const [pendingCombat, setPendingCombat] = useState(false);
  const dangerLevel = useStoryStore((s) => s.dangerLevel);
  const setDangerLevel = useStoryStore((s) => s.setDangerLevel);
  const [enemyLevel, setEnemyLevel] = useState(1);
  const [pendingMessage, setPendingMessage] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [infoTab, setInfoTab] = useState<"buffs" | "traits">("buffs");

  const loading = useStoryStore((s) => s.loading);
  const setLoading = useStoryStore((s) => s.setLoading);
  const error = useStoryStore((s) => s.error);
  const setError = useStoryStore((s) => s.setError);
  const hasStarted = history.length > 0;
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!race && storedRace) setRace(storedRace);
    if (!className && storedClass) setClassName(storedClass);
  }, [storedRace, storedClass, race, className, setRace, setClassName]);

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
          traits,
          difficulty,
          chapter,
          chapterProgress,
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

      let nextStory = data.story ?? "";
      const nextChoices = data.choices && data.choices.length > 0
        ? data.choices
        : data.isCombat
          ? ["전투 준비"]
          : [];
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
      const difficultyOffset = difficultyPresets[difficulty]?.enemyOffset ?? 0;
      setEnemyLevel(Math.max(1, adj + difficultyOffset));

      let updatedHp = playerHp;
      let updatedEnergy = energy;
      const updatedBuffs = { ...buffs };
      if (data.buffs) {
        data.buffs.forEach((b) => {
          if (b.target === "hp") {
            updatedHp += b.amount;
          } else if (b.target === "energy") {
            updatedEnergy += b.amount;
          } else {
            updatedBuffs[b.target] = (updatedBuffs[b.target] || 0) + b.amount;
          }
        });
      }

      let nextChapter = chapter;
      let nextProgress = chapterProgress;
      let chapterHistoryNote = "";
      if (!data.isCombat) {
        nextProgress = Math.min(CHAPTER_GOAL, chapterProgress + 1);
        if (nextProgress >= CHAPTER_GOAL) {
          nextChapter = chapter + 1;
          nextProgress = 0;
          updatedHp = clamp(updatedHp + 5, 0, 140);
          updatedEnergy = clamp(updatedEnergy + 10, 0, 140);
          chapterHistoryNote = `챕터 ${chapter} 완료: 잠시 휴식을 취하며 전력을 회복했습니다.`;
          nextStory = `${nextStory}\n\n[챕터 ${chapter} 완료] 새로운 목표가 주어집니다.`.trim();
        }
      }

      setChapter(nextChapter);
      setChapterProgress(nextProgress);
      setPlayerHp(clamp(updatedHp, 0, 160));
      setEnergy(clamp(updatedEnergy, 0, 140));
      setBuffs(updatedBuffs);
      setStory(nextStory);
      setChoices(nextChoices);

      // 히스토리 업데이트 (길이 제한)
      const preview = (nextStory || "").slice(0, 200);
      addHistory(`선택: ${choice || "자동 진행"}`);
      addHistory(`요약: ${preview}${nextStory && nextStory.length > 200 ? "..." : ""}`);
      if (chapterHistoryNote) {
        addHistory(chapterHistoryNote);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ▶ 게임 시작
  const handleStart = () => {
    const raceTrait = getRaceTrait(race);
    const classTrait = getClassTrait(className);
    const traitNames = [raceTrait?.name, classTrait?.name].filter(Boolean) as string[];

    let nextHp = 100;
    let nextEnergy = 100;
    const updatedBuffs = { ...buffs };

    const applyBonuses = (bonusTarget?: Record<string, number>) => {
      if (!bonusTarget) return;
      Object.entries(bonusTarget).forEach(([key, value]) => {
        if (key === "hp") {
          nextHp += value;
        } else if (key === "energy") {
          nextEnergy += value;
        } else {
          updatedBuffs[key] = (updatedBuffs[key] || 0) + value;
        }
      });
    };

    applyBonuses(raceTrait?.bonuses);
    applyBonuses(classTrait?.bonuses);

    setPlayerHp(Math.min(140, nextHp));
    setEnergy(Math.min(140, nextEnergy));
    setBuffs(updatedBuffs);
    setStoreTraits(traitNames);
    setChapter(1);
    setChapterProgress(0);
    setBackground(
      `당신의 이름은 ${name}이며, ${age}살 ${gender} ${race} ${className}입니다. (${difficultyPresets[difficulty].label} 난이도) 여정이 시작됩니다.`
    );
    setStoreRace(race);
    setStoreClass(className);
    const traitLine = traitNames.length > 0 ? `특성: ${traitNames.join(', ')}` : "";
    addHistory(`시작 (${difficultyPresets[difficulty].label}) ${traitLine}`.trim());
    callStory("");
  };

  // ▶ 전투 종료 콜백
  const handleCombatEnd = (result: "승리" | "패배") => {
    setLastCombatResult(result);
    setIsCombat(false);
    setCombatCountdown(5);
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
      setCombatModalOpen(true);
      setCombatCountdown(null);
      setLastCombatResult(null);
    }, 1200);
    return () => clearTimeout(timer);
  }, [pendingCombat]);

  useEffect(() => {
    if (!isCombat) return;
    setCombatModalOpen(true);
    setCombatCountdown(null);
    setLastCombatResult(null);
  }, [isCombat]);

  useEffect(() => {
    if (combatCountdown === null) return;
    if (combatCountdown <= 0) {
      setCombatModalOpen(false);
      setCombatCountdown(null);
      setLastCombatResult(null);
      return;
    }
    const timer = setTimeout(() => {
      setCombatCountdown((prev) => (prev ?? 1) - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [combatCountdown]);

  // ▶ 다시 시작
  const handleRestart = () => {
    setPlayerHp(100);
    setPlayerLevel(1);
    setEnergy(100);
    setBuffs({ hp: 0, strength: 0, dexterity: 0, constitution: 0, energy: 0 });
    setRace('');
    setClassName('');
    setStoreTraits([]);
    setBackground("");
    setStory("");
    setChoices([]);
    setDangerLevel("");
    setEnemyLevel(1);
    setIsCombat(false);
    setCombatModalOpen(false);
    setCombatCountdown(null);
    setLastCombatResult(null);
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
      traits: [],
      difficulty,
      chapter: 1,
      chapterProgress: 0,
    });
  };

  const handleRest = () => {
    if (loading || pendingCombat || isCombat) return;
    const raceTrait = getRaceTrait(race);
    const classTrait = getClassTrait(className);
    const bonusHp = (raceTrait?.bonuses.hp || 0) > 0 ? 2 : 0;
    const bonusEnergy = Math.floor(((raceTrait?.bonuses.energy || 0) + (classTrait?.bonuses.energy || 0)) / 5);
    const recoveryScale = difficultyPresets[difficulty]?.recoveryScale ?? 1;
    const recoveredHp = clamp(playerHp + Math.round((8 + bonusHp) * recoveryScale), 0, 140);
    const recoveredEnergy = clamp(energy + Math.round((25 + bonusEnergy) * recoveryScale), 0, 140);
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
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as "casual" | "standard" | "hard")}
          className="mb-2 w-64 p-2 bg-gray-800 rounded"
        >
          {Object.entries(difficultyPresets).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label} 난이도
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-300 mb-2 w-64 text-center">
          {difficultyPresets[difficulty]?.description}
        </p>
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
  if (!isCombat && !loading && !pendingCombat && story && choices.length === 0) {
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
  const hpTone =
    playerHp <= 20 ? "text-red-300" : playerHp <= 50 ? "text-yellow-200" : "text-green-300";
  const raceTraitInfo = getRaceTrait(race);
  const classTraitInfo = getClassTrait(className);
  const traitList = [raceTraitInfo, classTraitInfo].filter(Boolean) as Trait[];
  const filteredHistory = history.filter((line) => {
    if (historyFilter === "choice") return line.startsWith("선택:");
    if (historyFilter === "summary") return line.startsWith("요약:");
    if (historyFilter === "system") return !line.startsWith("선택:") && !line.startsWith("요약:");
    return true;
  });
  const recentHistory = filteredHistory.slice(-12);
  const combatLog = history.slice(-10);

  // ▶ 메인 게임 UI
  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-900 to-black text-yellow-200">
      <Analytics />
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <header className="text-center bg-gray-800/80 rounded-xl p-4 shadow border border-yellow-700/30">
          <h1 className="text-3xl font-bold">모험 진행 중</h1>
          <p className="text-sm text-gray-300 mt-1">HP · 레벨 · 에너지 · 스토리 · 선택지를 한눈에 확인하세요.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* ▶ 메인 흐름 (스토리/기록/선택지) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3 bg-gray-900/60 rounded-lg p-4 shadow border border-yellow-700/30">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-300 tracking-wide">HP</p>
                <div className={`text-2xl font-bold ${hpTone}`}>{playerHp}</div>
                <p className="text-xs text-gray-400">전투 준비 상태</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-300 tracking-wide">LEVEL</p>
                <div className="text-2xl font-bold text-yellow-100">{playerLevel}</div>
                <p className="text-xs text-gray-400">전투 승리 시 상승</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-gray-300 tracking-wide">
                  <span>에너지</span>
                  <span className="text-gray-100">{energy} / 120</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded">
                  <div
                    className="h-2 bg-green-500 rounded"
                    style={{ width: `${energyWidth}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400">휴식으로 회복</p>
              </div>
            </div>

            {pendingCombat && (
              <div className="p-3 bg-red-900/40 border border-red-500 rounded shadow animate-pulse">
                <p className="font-semibold text-red-200">{pendingMessage || "전투 준비 중"}</p>
                <p className="text-sm text-red-100 mt-1">잠시 후 전투 화면으로 전환됩니다.</p>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl p-5 shadow border border-yellow-700/30 whitespace-pre-wrap">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">스토리</h2>
                {dangerLevel && (
                  <span className={`text-xs px-2 py-1 rounded border ${dangerTone} border-yellow-700/60`}>
                    위험도: {dangerLevel}
                  </span>
                )}
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <p className="break-keep leading-relaxed text-base md:text-lg text-yellow-100 bg-black/30 rounded-lg p-4 border border-yellow-700/20 shadow-inner">
                  {story}
                </p>
              )}
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>

            <div className="bg-gray-900/70 rounded-xl p-4 shadow border border-yellow-700/20">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">최근 로그</h3>
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="px-3 py-1 text-xs rounded bg-gray-800 border border-yellow-700/40 hover:border-yellow-500"
                  >
                    {isHistoryOpen ? "숨기기" : "열기"}
                  </button>
                </div>
                {isHistoryOpen && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    {([
                      { key: "all", label: "전체" },
                      { key: "choice", label: "선택" },
                      { key: "summary", label: "요약" },
                      { key: "system", label: "시스템" },
                    ] as { key: HistoryFilter; label: string }[]).map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setHistoryFilter(item.key)}
                        className={`px-3 py-1 rounded border transition ${
                          historyFilter === item.key
                            ? "bg-yellow-600 text-black border-yellow-600"
                            : "bg-gray-800 text-yellow-200 border-yellow-700/40 hover:border-yellow-500"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isHistoryOpen && (
                <div className="p-3 bg-black/40 rounded max-h-48 overflow-y-auto text-sm text-gray-200 space-y-1 mt-2">
                  {recentHistory.length > 0 ? (
                    recentHistory.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>)
                  ) : (
                    <p className="text-gray-500">표시할 기록이 없습니다.</p>
                  )}
                </div>
              )}
            </div>

            {/* ▶ 전투 또는 선택지 */}
            {isCombat ? (
              <div className="w-full flex justify-center">
                <div className="w-full max-w-md bg-gray-800 rounded-lg border border-yellow-700/40 text-center p-4 shadow">
                  <p className="text-lg font-semibold text-yellow-100">전투 모드 활성화</p>
                  <p className="text-sm text-gray-300 mt-1">전투, 주사위, 로그가 모달로 표시됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl p-4 shadow border border-yellow-700/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="font-semibold">다음 행동</h3>
                  <button
                    onClick={handleRest}
                    disabled={loading || pendingCombat}
                    className="px-3 py-2 text-sm bg-blue-700 rounded shadow disabled:opacity-60"
                  >
                    💤 휴식 (에너지 회복)
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      className="px-4 py-2 bg-yellow-600 rounded font-semibold text-black shadow disabled:opacity-60"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ▶ 보조 정보 (위험도/챕터/버프/특성) */}
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-gray-800 rounded-xl shadow border border-yellow-700/30 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300">위험도</p>
                <span className={`font-semibold ${dangerTone}`}>
                  {dangerLevel || "알 수 없음"}
                </span>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-300">챕터 {chapter}</p>
                  <span className="text-xs px-2 py-1 rounded bg-yellow-700/50 text-yellow-100">
                    {difficultyPresets[difficulty]?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">목표까지 {Math.max(0, CHAPTER_GOAL - chapterProgress)} 단계 남음</p>
                <div className="w-full h-2 bg-gray-700 rounded">
                  <div
                    className="h-2 bg-yellow-500 rounded"
                    style={{ width: `${Math.min(100, Math.round((chapterProgress / CHAPTER_GOAL) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-800 rounded-xl shadow border border-yellow-700/30 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setInfoTab("buffs")}
                  className={`px-3 py-1 rounded-lg border transition ${
                    infoTab === "buffs"
                      ? "bg-yellow-600 text-black border-yellow-600"
                      : "bg-gray-900 text-yellow-200 border-yellow-700/40 hover:border-yellow-500"
                  }`}
                >
                  버프
                </button>
                <button
                  onClick={() => setInfoTab("traits")}
                  className={`px-3 py-1 rounded-lg border transition ${
                    infoTab === "traits"
                      ? "bg-yellow-600 text-black border-yellow-600"
                      : "bg-gray-900 text-yellow-200 border-yellow-700/40 hover:border-yellow-500"
                  }`}
                >
                  특성
                </button>
              </div>

              {infoTab === "buffs" ? (
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
              ) : (
                <div className="space-y-2">
                  {traitList.length > 0 ? (
                    traitList.map((trait) => (
                      <div key={trait!.name} className="p-2 rounded bg-gray-900 border border-yellow-700/60">
                        <p className="font-semibold text-yellow-200">{trait!.name}</p>
                        <p className="text-sm text-gray-300">{trait!.summary}</p>
                        {formatTraitBonuses(trait!) && (
                          <p className="text-xs text-yellow-300 mt-1">보너스: {formatTraitBonuses(trait!)}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">선택한 특성이 없습니다.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {combatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950/90 via-fuchsia-950/70 to-slate-950/90 backdrop-blur-md px-4 py-6">
          <div className="relative w-full max-w-5xl retro-frame rounded-3xl p-4 sm:p-6">
            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(244,114,182,0.2),transparent_35%)]" />
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 relative">
              <div>
                <p className="text-[11px] tracking-[0.3em] text-pink-200/80 font-tech">COMBAT MODE</p>
                <h3 className="text-2xl font-bold text-cyan-50 neon-title font-arcade">전투 화면이 활성화되었습니다</h3>
                {pendingMessage && (
                  <p className="text-sm text-cyan-100 mt-1 font-tech">{pendingMessage}</p>
                )}
                {lastCombatResult && (
                  <p
                    className={`text-sm mt-1 font-tech ${
                      lastCombatResult === "승리" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    전투 {lastCombatResult}! {combatCountdown ? `${combatCountdown}초 후 모달이 닫힙니다.` : ""}
                  </p>
                )}
                {!lastCombatResult && combatCountdown !== null && (
                  <p className="text-sm text-cyan-100 mt-1 font-tech">{combatCountdown}초 후 모달이 닫힙니다.</p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end text-[11px] text-cyan-50 font-tech">
                <span className="px-3 py-2 rounded-lg bg-slate-900/70 border border-cyan-400/30 shadow-lg shadow-sky-900/30">
                  전투 종료 후 5초 카운트가 끝나면 자동으로 닫힙니다.
                </span>
                {!isCombat && (
                  <button
                    onClick={() => setCombatModalOpen(false)}
                    className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-cyan-300/30 text-cyan-100 hover:border-pink-200/50 transition"
                  >
                    지금 닫기
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 relative">
              <div
                className={`relative rounded-2xl border border-cyan-400/20 shadow-inner bg-slate-900/70 ${
                  isCombat ? "" : "opacity-70"
                }`}
              >
                <div className="absolute inset-x-4 top-3 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
                <div className="p-4">
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
                {!isCombat && lastCombatResult && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                    <p
                      className={`text-xl font-bold font-arcade ${
                        lastCombatResult === "승리" ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      전투 {lastCombatResult}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="relative p-4 bg-slate-900/70 rounded-2xl border border-cyan-400/20 shadow-inner overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-cyan-100 font-tech">주사위 화면</p>
                    <span className="text-[11px] text-cyan-200">자동 굴림</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`relative w-16 h-16 rounded-full dice-orb flex items-center justify-center ${isCombat ? "animate-spin" : "animate-pulse"}`}>
                      <span className="text-3xl">🎲</span>
                      <span className="scanline-overlay" aria-hidden></span>
                    </div>
                    <p className="text-sm text-cyan-50 leading-relaxed font-tech">
                      공격과 방어 주사위가 자동으로 굴려지며, 전투 진행 상황을 실시간으로 반영합니다.
                    </p>
                  </div>
                  <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2),transparent_40%)]" />
                </div>

                <div className="p-4 bg-slate-900/70 rounded-2xl border border-cyan-400/20 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-cyan-100 font-tech">전투 로그</p>
                    {combatCountdown !== null && (
                      <span className="text-[11px] text-pink-200">{combatCountdown}초 후 닫힘</span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto text-sm text-cyan-50">
                    {combatLog.length > 0 ? (
                      combatLog.map((line, idx) => (
                        <p key={`${line}-${idx}`} className="border-b border-cyan-400/10 pb-1 last:border-none last:pb-0 font-tech">
                          {line}
                        </p>
                      ))
                    ) : (
                      <p className="text-cyan-200/60 text-sm">표시할 로그가 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
