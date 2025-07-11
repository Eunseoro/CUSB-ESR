'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getCategoryColor, getCategoryLabel } from '@/lib/song-utils'
import { Song } from '@/types/song'

const CATEGORY_LIST = [
  { key: 'KPOP', label: getCategoryLabel('KPOP') },
  { key: 'POP', label: getCategoryLabel('POP') },
]

function getRandomSong(songs: Song[]): Song | null {
  if (!songs.length) return null
  const idx = Math.floor(Math.random() * songs.length)
  return songs[idx]
}

const HISTORY_KEY = 'roulette_history_v1'

export default function RoulettePage() {
  const [selected, setSelected] = useState<string[]>(['KPOP'])
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Song | null>(null)
  const [history, setHistory] = useState<Song[]>([])
  const [rolling, setRolling] = useState(false)
  const [rollingList, setRollingList] = useState<Song[]>([])
  const rollingRef = useRef<NodeJS.Timeout | null>(null)

  // 카테고리 선택
  const toggleCategory = (cat: string) => {
    setSelected(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    )
  }

  // 곡 불러오기
  useEffect(() => {
    if (selected.length === 0) {
      setSongs([])
      return
    }
    setLoading(true)
    // 여러 카테고리 지원: category=KPOP&category=POP 형태가 아니라, 각각 따로 불러와 합침
    Promise.all(
      selected.map(cat =>
        fetch(`/api/songs?category=${cat}&limit=1000`).then(r => r.json())
      )
    ).then(results => {
      // 중복 제거 (id 기준)
      const merged: { [id: string]: Song } = {}
      results.forEach(res => {
        (res.songs || []).forEach((song: Song) => {
          merged[song.id] = song
        })
      })
      setSongs(Object.values(merged))
      setLoading(false)
    })
  }, [selected])

  // 과거 결과 불러오기
  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      try {
        const arr = JSON.parse(raw)
        setHistory(arr)
      } catch {}
    }
  }, [])

  // 룰렛 돌리기
  const handleRoll = () => {
    if (!songs.length || rolling) return
    setRolling(true)
    setResult(null)
    let rollList: Song[] = []
    let count = 0
    rollingRef.current && clearInterval(rollingRef.current)
    rollingRef.current = setInterval(() => {
      const s = getRandomSong(songs)
      if (s) {
        rollList = [s, ...rollList].slice(0, 10)
        setRollingList([...rollList])
      }
      count++
    }, 80)
    setTimeout(() => {
      if (rollingRef.current) clearInterval(rollingRef.current)
      const picked = getRandomSong(songs)
      setResult(picked)
      setRolling(false)
      setRollingList([])
      if (picked) {
        // 과거 결과 저장 (최대 10개)
        setHistory(prev => {
          const next = [picked, ...prev].slice(0, 10)
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
          return next
        })
      }
    }, 3000)
  }

  // 언마운트시 인터벌 정리
  useEffect(() => {
    return () => {
      if (rollingRef.current) clearInterval(rollingRef.current)
    }
  }, [])

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">룰렛</h1>
      {/* 카테고리 선택 버튼 영역 */}
      <div className="flex gap-2 mb-6">
        {CATEGORY_LIST.map(cat => (
          <button
            key={cat.key}
            className={`px-6 py-2 rounded-full font-semibold border transition-colors duration-150 min-w-[80px] text-sm
              ${getCategoryColor(cat.key)}
              ${selected.includes(cat.key)
                ? 'shadow-md bg-white dark:bg-zinc-800 dark:text-zinc-100 border-primary'
                : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600'}
            `}
            style={{ opacity: selected.includes(cat.key) ? 1 : 0.7 }}
            onClick={() => toggleCategory(cat.key)}
            disabled={rolling}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* 룰렛 애니메이션 영역 */}
      <div className="w-full max-w-2xl h-32 bg-gray-100 dark:bg-zinc-800 rounded-xl flex flex-col items-center justify-center mb-6 overflow-hidden relative border border-gray-200 dark:border-zinc-700 px-4">
        {rolling ? (
          <div className="w-full h-full flex flex-col justify-end animate-none">
            {rollingList.slice(0, 4).map((s, i) => (
              <div key={i} className="text-center text-base py-1 truncate w-full px-2" style={{ opacity: 1 - i * 0.25 }}>
                {s.artist} - {s.title}
              </div>
            ))}
          </div>
        ) : result ? (
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div className="text-lg font-bold text-primary text-center truncate w-full px-2">{result.artist} - {result.title}</div>
          </div>
        ) : (
          <span className="text-lg text-gray-500 dark:text-zinc-400">{loading ? '곡 불러오는 중...' : '카테고리를 선택하고 룰렛을 돌려보세요!'}</span>
        )}
      </div>
      {/* 룰렛 돌리기 버튼 */}
      <button
        className="w-full py-3 rounded-full bg-primary text-white font-bold mb-6 disabled:opacity-50 text-base shadow-md dark:bg-zinc-700 dark:text-zinc-100"
        onClick={handleRoll}
        disabled={rolling || !songs.length}
      >
        {rolling ? '돌리는 중...' : '룰렛 돌리기'}
      </button>
      {/* 과거 결과 목록 */}
      <div>
        <div className="font-semibold mb-2">과거 결과</div>
        <ul className="text-xs text-gray-500 space-y-1">
          {history.length === 0 && <li>아직 없음</li>}
          {history.map((s, i) => (
            <li key={s.id + i} className="truncate">{s.artist} - {s.title}</li>
          ))}
        </ul>
      </div>
    </div>
  )
} 