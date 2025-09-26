'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SongRequest } from '@/types/song-request'
import { getSongRequests, addSongRequest } from '@/lib/song-request-utils'

function SongListContent() {
  const searchParams = useSearchParams()
  const isPopup = searchParams?.get('popup') === 'true'
  const [requests, setRequests] = useState<SongRequest[]>([])
  const [newArtistTitle, setNewArtistTitle] = useState('')
  const [newRequester, setNewRequester] = useState('')
  const [newIsNotice, setNewIsNotice] = useState(false)
  const [copyButtonText, setCopyButtonText] = useState('제목 복사')

  // 초기화 및 이벤트 리스너 설정
  useEffect(() => {
    setRequests(getSongRequests())

    // 다크모드 설정
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // 노래 추가 처리 함수
    const addSongToList = (artistTitle: string) => {
      const newRequest = addSongRequest(artistTitle, '', false)
      setRequests(prev => [...prev, newRequest])
      console.log('선곡표에 노래 추가됨:', artistTitle)
    }

    // 메인 창에서 오는 메시지 처리
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ADD_TO_SONGLIST') {
        addSongToList(event.data.artistTitle)
      }
    }

    // localStorage 이벤트 처리
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'songlist_add_request' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue)
          if (data.type === 'ADD_TO_SONGLIST') {
            addSongToList(data.artistTitle)
          }
        } catch (error) {
          console.error('localStorage 데이터 파싱 오류:', error)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // 커서 위치 확인 함수들
  const isCursorAtEnd = (input: HTMLInputElement): boolean => {
    return input.selectionStart === input.selectionEnd && 
           input.selectionStart === input.value.length
  }

  const isCursorAtStart = (input: HTMLInputElement): boolean => {
    return input.selectionStart === input.selectionEnd && 
           input.selectionStart === 0
  }

  // 통합된 키보드 핸들러
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: 'artist' | 'requester') => {
    const isNewRow = rowIndex === requests.length
    const input = e.currentTarget as HTMLInputElement
    
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isNewRow && requests.length > 0) {
        const targetInput = document.getElementById(field === 'artist' ? `artist-${requests[requests.length - 1].id}` : `requester-${requests[requests.length - 1].id}`)
        targetInput?.focus()
      } else if (!isNewRow && rowIndex > 0) {
        const targetInput = document.getElementById(field === 'artist' ? `artist-${requests[rowIndex - 1].id}` : `requester-${requests[rowIndex - 1].id}`)
        targetInput?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isNewRow && rowIndex < requests.length - 1) {
        const targetInput = document.getElementById(field === 'artist' ? `artist-${requests[rowIndex + 1].id}` : `requester-${requests[rowIndex + 1].id}`)
        targetInput?.focus()
      } else if (!isNewRow && rowIndex === requests.length - 1) {
        const targetInput = document.getElementById(field === 'artist' ? 'artist-title' : 'requester')
        targetInput?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      if (field === 'requester' && isCursorAtStart(input)) {
        e.preventDefault()
        const targetInput = document.getElementById(isNewRow ? 'artist-title' : `artist-${requests[rowIndex].id}`)
        targetInput?.focus()
      }
    } else if (e.key === 'ArrowRight') {
      if (field === 'artist' && isCursorAtEnd(input)) {
        e.preventDefault()
        const targetInput = document.getElementById(isNewRow ? 'requester' : `requester-${requests[rowIndex].id}`)
        targetInput?.focus()
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (field === 'artist') {
        const targetInput = document.getElementById(isNewRow ? 'requester' : `requester-${requests[rowIndex].id}`)
        targetInput?.focus()
      } else if (field === 'requester') {
        if (isNewRow) {
          addNewRow()
        } else {
          const nextRowIndex = rowIndex + 1
          if (nextRowIndex < requests.length) {
            const targetInput = document.getElementById(`artist-${requests[nextRowIndex].id}`)
            targetInput?.focus()
          } else {
            const targetInput = document.getElementById('artist-title')
            targetInput?.focus()
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isNewRow) {
        addNewRow()
      } else {
        insertNewRowAt(rowIndex + 1)
      }
    } else if (e.key === 'Backspace') {
      handleBackspaceDelete(rowIndex, field, isNewRow)
    }
  }

  // 백스페이스 삭제 처리
  const handleBackspaceDelete = (rowIndex: number, field: 'artist' | 'requester', isNewRow: boolean) => {
    if (!isNewRow) {
      const request = requests[rowIndex]
      const isEmpty = !request.artist && !request.requester
      
      if (isEmpty) {
        const updatedRequests = requests.filter((_, index) => index !== rowIndex)
        const reorderedRequests = updatedRequests.map((req, index) => ({
          ...req,
          order: index + 1
        }))
        
        setRequests(reorderedRequests)
        localStorage.setItem('song_requests', JSON.stringify(reorderedRequests))
        
        if (updatedRequests.length > 0) {
          const targetIndex = Math.min(rowIndex, updatedRequests.length - 1)
          setTimeout(() => {
            const targetInput = document.getElementById(field === 'artist' ? `artist-${updatedRequests[targetIndex].id}` : `requester-${updatedRequests[targetIndex].id}`)
            targetInput?.focus()
          }, 0)
        }
      }
    } else if (isNewRow && requests.length > 0) {
      const lastRequest = requests[requests.length - 1]
      const isEmpty = !lastRequest.artist && !lastRequest.requester
      
      if (isEmpty) {
        const updatedRequests = requests.slice(0, -1)
        const reorderedRequests = updatedRequests.map((req, index) => ({
          ...req,
          order: index + 1
        }))
        
        setRequests(updatedRequests)
        localStorage.setItem('song_requests', JSON.stringify(reorderedRequests))
        
        if (updatedRequests.length > 0) {
          setTimeout(() => {
            const targetInput = document.getElementById(field === 'artist' ? `artist-${updatedRequests[updatedRequests.length - 1].id}` : `requester-${updatedRequests[updatedRequests.length - 1].id}`)
            targetInput?.focus()
          }, 0)
        }
      }
    }
  }

  // 새 행 삽입
  const insertNewRowAt = (insertIndex: number) => {
    const newRequest = addSongRequest('', '', false)
    const updatedRequests = [...requests]
    updatedRequests.splice(insertIndex, 0, newRequest)
    const reorderedRequests = updatedRequests.map((req, index) => ({
      ...req,
      order: index + 1
    }))
    
    setRequests(reorderedRequests)
    localStorage.setItem('song_requests', JSON.stringify(reorderedRequests))
    
    setTimeout(() => {
      const input = document.getElementById(`artist-${newRequest.id}`)
      input?.focus()
    }, 100)
  }

  // 행 색상 계산
  const rowColors = useMemo(() => {
    return requests.map((_, index) => {
      const isEven = index % 2 === 0
      return isEven ? '' : 'bg-gray-50 dark:bg-gray-800'
    })
  }, [requests.length, requests])

  // 새 행 추가
  const addNewRow = () => {
    if (newArtistTitle.trim() || newRequester.trim()) {
      const newRequest = addSongRequest(newArtistTitle.trim(), newRequester.trim(), newIsNotice)
      setRequests(prev => [...prev, newRequest])
      
      setNewArtistTitle('')
      setNewRequester('')
      setNewIsNotice(false)
      
      setTimeout(() => {
        document.getElementById('artist-title')?.focus()
      }, 0)
    }
  }

  // 요청 업데이트
  const handleRequestUpdate = (id: string, field: 'artist' | 'requester', value: string) => {
    const request = requests.find(r => r.id === id)
    if (!request) return

    const updatedRequest = { ...request, [field]: value }
    const allRequests = getSongRequests()
    const updatedRequests = allRequests.map(r => r.id === id ? updatedRequest : r)
    localStorage.setItem('song_requests', JSON.stringify(updatedRequests))
    setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r))
  }

  // 대기/완료 토글
  const handleNoticeToggle = async (id: string) => {
    const request = requests.find(r => r.id === id)
    if (!request) return

    const updatedRequest = { ...request, isNotice: !request.isNotice }
    const allRequests = getSongRequests()
    const updatedRequests = allRequests.map(r => r.id === id ? updatedRequest : r)
    localStorage.setItem('song_requests', JSON.stringify(updatedRequests))
    setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r))

    // 대기에서 완료로 변경될 때 부모 창에 노래 정보 전달
    if (updatedRequest.isNotice && request.artist) {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'UPDATE_SELECTED_SONG',
            artistTitle: request.artist
          }, '*')
          console.log('메인 창에 노래 정보 전달 (대기→완료):', request.artist)
        }
      } catch (error) {
        console.error('메인 창 메시지 전달 실패:', error)
      }
    }
  }

  // 공지 텍스트 복사
  const copyNoticeText = (artistTitle: string) => {
    const noticeText = `!공지 ${artistTitle}`
    navigator.clipboard.writeText(noticeText).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = noticeText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
  }

  // 전체 제목 복사
  const copyAllTitles = () => {
    const titles = requests
      .filter(r => r.artist && r.artist.trim())
      .map(r => r.artist)
      .join('\n')
    
    if (titles) {
      navigator.clipboard.writeText(titles)
        .then(() => {
          setCopyButtonText('복사 완료!')
          setTimeout(() => setCopyButtonText('제목 복사'), 1500)
        })
        .catch(() => {
          setCopyButtonText('복사 실패')
          setTimeout(() => setCopyButtonText('제목 복사'), 1500)
        })
    } else {
      setCopyButtonText('복사할 제목 없음')
      setTimeout(() => setCopyButtonText('제목 복사'), 1500)
    }
  }

  // 전체 초기화
  const resetAllData = () => {
    if (confirm('선곡표를 초기화합니다')) {
      setRequests([])
      setNewArtistTitle('')
      setNewRequester('')
      setNewIsNotice(false)
      localStorage.removeItem('song_requests')
    }
  }

  // 브라우저 창 제목 설정
  useEffect(() => {
    document.title = '유할매 선곡표'
  }, [])

  return (
    <div className={`min-h-screen bg-background text-foreground font-mono ${isPopup ? 'w-full -ml-16' : ''}`} style={isPopup ? { margin: 0, padding: 0 } : {}}>
      {/* 메뉴 표시줄 */}
      <div className={`flex border-b border-gray-300 dark:border-gray-600 ${isPopup ? '-ml-16' : ''}`} style={isPopup ? { width: 'calc(100% + 4rem)' } : {}}>
        <button 
          onClick={resetAllData}
          className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-r border-gray-300 dark:border-gray-600"
        >
          초기화
        </button>
        <button 
          onClick={copyAllTitles}
          className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {copyButtonText}
        </button>
      </div>

      {/* 선곡표 테이블 */}
      <div className={`bg-card ${isPopup ? 'w-full -ml-16' : ''}`} style={isPopup ? { margin: 0, padding: 0, marginLeft: '-4rem', width: 'calc(100% + 4rem)' } : {}}>
        <table className="w-full table-fixed" style={isPopup ? { margin: 0, padding: 0, borderCollapse: 'collapse', width: 'calc(100% + 4rem)' } : {}}>
          <colgroup>
            <col className={isPopup ? "w-8" : "w-12"} />
            <col className="w-1/2" />
            <col className="w-1/3" />
            <col className="w-16" />
            <col className="w-24" />
          </colgroup>
          <tbody>
            {/* 기존 저장된 데이터 */}
            {requests.map((request, index) => (
              <tr key={request.id} className={`border-t ${rowColors[index] || ''} hover:bg-muted/30`} style={isPopup ? { margin: 0, padding: 0 } : {}}>
                <td className={`py-1 flex items-center justify-center ${isPopup ? 'px-0' : 'px-1'}`}>
                  {request.isNotice && (
                    <span className="text-green-600 text-2xl font-black">✓</span>
                  )}
                </td>
                <td className="px-2 py-1">
                  <input
                    id={`artist-${request.id}`}
                    type="text"
                    value={request.artist}
                    onChange={(e) => handleRequestUpdate(request.id, 'artist', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'artist')}
                    className="w-full bg-transparent border-none outline-none text-2xl font-black"
                    style={{ WebkitTextStroke: '0.5px black' }}
                  />
                </td>
                <td className="px-4 py-1">
                  <input
                    id={`requester-${request.id}`}
                    type="text"
                    value={request.requester}
                    onChange={(e) => handleRequestUpdate(request.id, 'requester', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'requester')}
                    className="w-full bg-transparent border-none outline-none text-2xl font-black"
                    style={{ WebkitTextStroke: '0.5px black' }}
                  />
                </td>
                <td className="px-2 py-1 text-center text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-2 py-1">
                  <Button 
                    variant={request.isNotice ? "default" : "outline"} 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      if (!request.isNotice) {
                        copyNoticeText(request.artist)
                      }
                      handleNoticeToggle(request.id)
                    }}
                  >
                    {request.isNotice ? '완료' : '대기'}
                  </Button>
                </td>
              </tr>
            ))}
            
            {/* 새로운 입력 행 */}
            <tr className={`border-t ${rowColors[requests.length] || ''} bg-muted/10`} style={isPopup ? { margin: 0, padding: 0 } : {}}>
              <td className={`py-1 flex items-center justify-center ${isPopup ? 'px-0' : 'px-1'}`}>
                {newIsNotice && (
                  <span className="text-green-600 text-lg font-bold">✓</span>
                )}
              </td>
              <td className="px-2 py-1">
                <input
                  id="artist-title"
                  type="text"
                  value={newArtistTitle}
                  onChange={(e) => setNewArtistTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, requests.length, 'artist')}
                  className="w-full bg-transparent border-none outline-none text-2xl font-black"
                  style={{ WebkitTextStroke: '0.5px black' }}
                />
              </td>
              <td className="px-4 py-1">
                <input
                  id="requester"
                  type="text"
                  value={newRequester}
                  onChange={(e) => setNewRequester(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, requests.length, 'requester')}
                  className="w-full bg-transparent border-none outline-none text-2xl font-black"
                  style={{ WebkitTextStroke: '0.5px black' }}
                />
              </td>
              <td className="px-2 py-1 text-center text-sm text-gray-500">
                {requests.length + 1}
              </td>
              <td className="px-2 py-1">
                {/* 새 행에서는 대기 버튼 제거 */}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SongListPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <SongListContent />
    </Suspense>
  )
}