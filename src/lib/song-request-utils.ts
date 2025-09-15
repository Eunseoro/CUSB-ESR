// 선곡표 로컬 스토리지 관리 유틸리티
import { SongRequest } from '@/types/song-request';

const STORAGE_KEY = 'song_requests';

// 선곡표 목록 조회
export function getSongRequests(): SongRequest[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('선곡표 조회 실패:', error);
    return [];
  }
}

// 선곡표 추가
export function addSongRequest(artist: string, requester: string, isNotice: boolean = false): SongRequest {
  const requests = getSongRequests();
  const maxOrder = requests.length > 0 ? Math.max(...requests.map(r => r.order)) : 0;
  
  const newRequest: SongRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    artist,
    requester,
    isNotice,
    order: maxOrder + 1,
    createdAt: new Date().toISOString()
  };
  
  const updatedRequests = [...requests, newRequest];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
  
  return newRequest;
}

// 선곡표 삭제
export function removeSongRequest(id: string): void {
  const requests = getSongRequests();
  const updatedRequests = requests.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
}

// 선곡표 순서 변경
export function updateSongRequestOrder(requests: SongRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

// 선곡표 전체 삭제
export function clearSongRequests(): void {
  localStorage.removeItem(STORAGE_KEY);
} 