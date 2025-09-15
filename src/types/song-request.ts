// 선곡표 관련 타입 정의
export interface SongRequest {
  id: string;
  artist: string;        // 아티스트 - 제목 형식으로 저장
  requester: string;     // 신청자
  isNotice: boolean;     // 완료/대기 상태
  order: number;         // 순서
  createdAt: string;     // 생성 시간
} 