// 간단한 오디오 파일 검증 및 최적화
export async function optimizeAudioFile(file: File): Promise<File> {
  // 이미 AAC 파일이면 그대로 반환
  if (file.type === 'audio/mp4' || file.name.endsWith('.m4a')) {
    return file
  }
  
  // MP3 파일이면 그대로 반환 (이미 압축됨)
  if (file.type === 'audio/mpeg' || file.name.endsWith('.mp3')) {
    return file
  }
  
  // WAV 파일이면 그대로 반환
  if (file.type === 'audio/wav' || file.name.endsWith('.wav')) {
    return file
  }
  
  // OGG 파일이면 그대로 반환
  if (file.type === 'audio/ogg' || file.name.endsWith('.ogg')) {
    return file
  }
  
  // 기타 포맷도 그대로 반환 (서버에서 처리)
  return file
} 