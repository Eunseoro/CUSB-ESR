'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getCategoryColor, getCategoryLabel } from '@/lib/song-utils'
import { Song } from '@/types/song'
import { Copy } from 'lucide-react'

const CATEGORY_LIST = [
  { key: 'KPOP', label: getCategoryLabel('KPOP') },
  { key: 'POP', label: getCategoryLabel('POP') },
]

const SECONDARY_FILTERS = [
  { key: 'advanced', label: '🔥 고급신청 ⚡', field: 'isAdvanced' },
]

function getRandomSong(songs: Song[]): Song | null {
  if (!songs.length) return null
  const idx = Math.floor(Math.random() * songs.length)
  return songs[idx]
}

const HISTORY_KEY = 'roulette_history_v1'

// 괄호 및 괄호 안 내용 제거 함수
function removeParentheses(str: string) {
  return str.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
}

export default function RoulettePage() {
  const [selected, setSelected] = useState<string[]>(['KPOP', 'POP'])
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Song | null>(null)
  const [history, setHistory] = useState<Song[]>([])
  const [rolling, setRolling] = useState(false)
  const [rollingList, setRollingList] = useState<Song[]>([])
  const rollingRef = useRef<NodeJS.Timeout | null>(null)
  const [showResultAnim, setShowResultAnim] = useState(false)
  const [secondary, setSecondary] = useState<{ [key: string]: boolean }>({ advanced: false })
  const [copied, setCopied] = useState(false)

  // 카테고리 선택
  const toggleCategory = (cat: string) => {
    setSelected(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    )
  }

  // 2차 필터 토글
  const toggleSecondary = (key: string) => {
    setSecondary(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 곡 불러오기
  useEffect(() => {
    if (selected.length === 0) {
      setSongs([])
      return
    }
    setLoading(true)
    Promise.all(
      selected.map(cat =>
        fetch(`/api/songs?category=${cat}&limit=1000`).then(r => r.json())
      )
    ).then(results => {
      const merged: { [id: string]: Song } = {}
      results.forEach(res => {
        (res.songs || []).forEach((song: Song) => {
          merged[song.id] = song
        })
      })
      let filtered = Object.values(merged)
      
      // MISSION 카테고리가 포함된 곡 제외
      filtered = filtered.filter(song => {
        if (!song.categories || song.categories.length === 0) {
          return false
        }
        // MISSION 카테고리가 포함된 곡은 룰렛에서 제외
        return !song.categories.includes('MISSION')
      })
      
      // 고급신청 필터 적용
      if (secondary.advanced) {
        // 고급신청 필터가 활성화된 경우: 고난이도 또는 루프스테이션 중 하나라도 TRUE인 곡만 추첨 대상
        filtered = filtered.filter(s => s.isHighDifficulty || s.isLoopStation)
      } else {
        // 고급신청 필터가 비활성화된 경우: 고난이도와 루프스테이션 모두 FALSE인 곡만 추첨 대상
        filtered = filtered.filter(s => !s.isHighDifficulty && !s.isLoopStation)
      }
      setSongs(filtered)
      setLoading(false)
    })
  }, [selected, secondary])

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

  // 룰렛 돌리기 (가속→감속 애니메이션)
  const handleRoll = () => {
    if (!songs.length || rolling) return
    setRolling(true)
    setResult(null)
    setShowResultAnim(false)
    const fallbackSong: Song = songs[0] || {id:'',title:'',artist:'',category:'',likeCount:0,createdAt:''}
    // rollingList를 항상 5곡(중앙이 선택)으로 유지, 시작은 랜덤 5곡
    let rollingArr: Song[] = Array(5).fill(null).map(() => getRandomSong(songs) || fallbackSong)
    setRollingList([...rollingArr])
    const totalStep = 24 + Math.floor(Math.random() * 6)
    let step = 0
    function animate() {
      const progress = step / totalStep
      const minDelay = 20
      const maxDelay = 350
      const delay = minDelay + (maxDelay - minDelay) * Math.pow(progress, 2.2)
      // 맨 위에 새 곡 추가, 아래로 밀기
      const s = getRandomSong(songs) || fallbackSong
      rollingArr = [s, ...rollingArr.slice(0, 4)]
      setRollingList([...rollingArr])
      step++
      if (step < totalStep) {
        setTimeout(animate, delay)
      } else {
        setTimeout(() => {
          setRolling(false)
          setShowResultAnim(true)
          setRollingList([])
          // 중앙 곡을 결과로
          const picked = rollingArr[2]
          setResult(picked)
          if (picked) {
            setHistory(prev => {
              const next = [picked, ...prev].slice(0, 10)
              localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
              return next
            })
          }
          setTimeout(() => setShowResultAnim(false), 300)
        }, 400)
      }
    }
    animate()
  }

  // 언마운트시 인터벌 정리
  useEffect(() => {
    return () => {
      if (rollingRef.current) clearInterval(rollingRef.current)
    }
  }, [])

  // 결과 복사 함수
  const handleCopyResult = () => {
    if (!result) return
    // 괄호 제거 후 복사
    const cleanArtist = removeParentheses(result.artist)
    const cleanTitle = removeParentheses(result.title)
    const text = `${cleanArtist} - ${cleanTitle}`
    
    // 클립보드에 복사
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    
    // 선곡표 팝업 창에 노래 정보 전달
    try {
      // 부모 창이 있으면 부모 창에 메시지 전달 (팝업에서 열린 경우)
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'ADD_TO_SONGLIST',
          artistTitle: text
        }, '*')
      }
      
      // localStorage를 통해 간접적으로 통신
      const songlistData = {
        type: 'ADD_TO_SONGLIST',
        artistTitle: text,
        timestamp: Date.now()
      }
      localStorage.setItem('songlist_add_request', JSON.stringify(songlistData))
      
      // localStorage 이벤트를 트리거
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'songlist_add_request',
        newValue: JSON.stringify(songlistData)
      }))
      
    } catch (error) {
      console.log('선곡표 팝업 창에 메시지 전달 실패:', error)
    }
    
    setCopied(true)
  }
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6"></h1>
      {/* 카테고리 + 2차 필터 + 복사 버튼 영역 */}
      <div className="flex w-full items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_LIST.map(cat => {
            const selectedCat = selected.includes(cat.key)
            return (
              <button
                key={cat.key}
                className={`px-3 py-2 rounded-full font-semibold border min-w-[56px] text-xs transition-colors duration-150
                  ${selectedCat
                    ? getCategoryColor(cat.key) + ' border-primary shadow-md'
                    : getCategoryColor(cat.key) + ' opacity-50 border-gray-300 text-gray-400 dark:text-gray-500'}
                `}
                style={{ opacity: selectedCat ? 1 : 0.5 }}
                onClick={() => toggleCategory(cat.key)}
                disabled={rolling}
              >
                {cat.label}
              </button>
            )
          })}
          {SECONDARY_FILTERS.map(f => (
            <button
              key={f.key}
              className={`px-3 py-2 rounded-full font-semibold border min-w-[56px] text-xs transition-colors duration-150
                ${secondary[f.key]
                  ? 'bg-yellow-200 text-yellow-800 border-yellow-400 shadow-md dark:bg-yellow-500 dark:text-yellow-100'
                  : 'bg-gray-100 text-gray-400 border-gray-300 dark:bg-zinc-800 dark:text-gray-500'}
              `}
              style={{ opacity: secondary[f.key] ? 1 : 0.5 }}
              onClick={() => toggleSecondary(f.key)}
              disabled={rolling}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex justify-end min-w-[40px]">
          <button
            className={`p-1 rounded-full bg-transparent border-none shadow-none flex items-center justify-center transition-colors duration-150
              ${result ? 'text-primary hover:text-primary-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}
            `}
            onClick={handleCopyResult}
            disabled={!result}
            title="결과 복사"
            style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
          >
            {copied ? (
              <span className="text-xs font-bold">Copy!</span>
            ) : (
              <Copy size={18} />
            )}
          </button>
        </div>
      </div>
      {/* 룰렛 애니메이션 영역 */}
      <div className="w-full max-w-3xl h-40 bg-gray-100 dark:bg-zinc-800 rounded-xl flex flex-col items-center justify-center mb-6 overflow-hidden relative border border-gray-200 dark:border-zinc-700 px-4 mx-auto">
        {rolling ? (
          <div className="w-full h-full flex flex-col justify-center animate-none overflow-x-hidden">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className={`text-center ${i === 2 ? 'text-base' : 'text-sm'} py-1 truncate w-full px-2 flex items-center justify-center max-w-full overflow-x-hidden select-none`}
                style={{
                  opacity: i === 2 ? 1 : i === 1 || i === 3 ? 0.7 : 0.4,
                  fontWeight: i === 2 ? 700 : 400,
                  color: i === 2 ? undefined : 'inherit',
                  fontSize: undefined,
                  transition: 'opacity 0.2s, font-size 0.2s',
                }}
              >
                <span className="truncate max-w-full inline-block">
                  {rollingList[i] ? `${rollingList[i].artist} - ${rollingList[i].title}` : '\u00A0'}
                </span>
              </div>
            ))}
          </div>
        ) : result && showResultAnim ? (
          <div className="w-full h-full flex flex-col justify-center animate-none overflow-x-hidden">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className={`text-center ${i === 2 ? 'text-base' : 'text-sm'} py-1 truncate w-full px-2 flex items-center justify-center max-w-full overflow-x-hidden select-none
                  ${i === 2 ? 'transition-transform duration-300 scale-115 font-bold' : 'transition-opacity duration-300 opacity-0'}
                `}
                style={{
                  fontWeight: i === 2 ? 700 : 400,
                  color: i === 2 ? undefined : 'inherit',
                  fontSize: undefined,
                }}
              >
                <span className="truncate max-w-full inline-block">
                  {i === 2 && result ? `${result.artist} - ${result.title}` : '\u00A0'}
                </span>
              </div>
            ))}
          </div>
        ) : result ? (
          <div className="w-full h-full flex flex-col justify-center items-center overflow-x-hidden">
            <div className="text-base font-bold text-primary text-center truncate w-full px-2 flex items-center justify-center max-w-full overflow-x-hidden scale-115 transition-transform duration-300">
              <span className="truncate max-w-full inline-block">{result.artist} - {result.title}</span>
            </div>
          </div>
        ) : (
          <span className="text-lg text-gray-500 dark:text-zinc-400">{loading ? '로딩 중...' : '유할매 신청곡 룰렛'}</span>
        )}
      </div>
      {/* 룰렛 돌리기 버튼 */}
      <button
        className="w-full py-3 rounded-full bg-zinc-500 hover:bg-zinc-600 text-white font-bold mb-6 disabled:opacity-50 text-base shadow-md dark:bg-zinc-700 dark:text-zinc-100"
        onClick={handleRoll}
        disabled={rolling || !songs.length || loading}
      >
        {rolling ? 'Go !' : 'Go !'}
      </button>
      {/* 과거 결과 목록 */}
      <div>
        <div className="font-semibold mb-2">이전 결과</div>
        <ul className="text-xs text-gray-500 space-y-1">
          {history.length === 0 && <li>없음</li>}
          {history.map((s, i) => (
            <li key={s.id + i} className="truncate">{s.artist} - {s.title}</li>
          ))}
        </ul>
      </div>
    </div>
  )
} 