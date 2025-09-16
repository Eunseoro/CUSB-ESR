'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const COLORS = [
  '#FF9800', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0', '#00BCD4', '#FFC107', '#8BC34A', '#FF5722', '#3F51B5', '#CDDC39', '#F44336', '#607D8B', '#009688', '#795548', '#673AB7', '#03A9F4', '#FFEB3B', '#C62828', '#6D4C41', '#BDBDBD', '#1976D2', '#388E3C', '#FFA000', '#D32F2F'
];

interface Item {
  name: string;
  count: number;
}

// 1. 상단에 상수 및 타입 추가
const HISTORY_KEY = 'spinner_history';
interface SpinnerHistoryItem {
  name: string;
  date: number;
}

export default function SpinnerPage() {
  const [title, setTitle] = useState('쥐수들의 도파민');
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [isSlowingDown, setIsSlowingDown] = useState(false); // 감속 중 여부
  const [angle, setAngle] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(0);
  const [stopStartTime, setStopStartTime] = useState<number | null>(null); // 감속 시작 시각
  const [initialSpeed, setInitialSpeed] = useState(0); // 감속 시작 시의 속도
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null); // 버퍼용
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  // 전체 count 합
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  const [isMobile, setIsMobile] = useState(false);
  const [history, setHistory] = useState<SpinnerHistoryItem[]>([]);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 과거 결과 불러오기
  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        setHistory(arr);
      } catch {}
    }
  }, []);
  // 결과가 나올 때마다 저장
  useEffect(() => {
    if (result) {
      const newItem: SpinnerHistoryItem = { name: result, date: Date.now() };
      const newHistory = [newItem, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // 항목 추가
  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    if (items.find(i => i.name === name)) return;
    setItems([...items, { name, count: 1 }]);
    setInput('');
  };

  // 항목 삭제
  const handleRemove = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // 항목명 수정
  const handleNameChange = (idx: number, name: string) => {
    setItems(items.map((item, i) => i === idx ? { ...item, name } : item));
  };

  // 항목 비중(가중치) 조절
  const handleCountChange = (idx: number, delta: number) => {
    setItems(items.map((item, i) =>
      i === idx ? { ...item, count: Math.max(1, item.count + delta) } : item
    ));
  };

  // 단축키/클릭 비중 조절
  const handleCountButton = (e: React.MouseEvent, idx: number, sign: 1 | -1) => {
    let delta = 1;
    if (e.altKey) delta = 100;
    else if (e.ctrlKey) delta = 10;
    handleCountChange(idx, sign * delta);
  };

  // 엔터로 항목 추가
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  // 항목별 각도 범위 계산 함수 (사용하지 않음)
  // function getAngleRanges(items: Item[], totalCount: number) {
  //   const arc = 2 * Math.PI / totalCount;
  //   let acc = 0;
  //   return items.map(item => {
  //     const start = acc * arc;
  //     const end = (acc + item.count) * arc;
  //     acc += item.count;
  //     return { start, end };
  //   });
  // }

  // 빠른 무한 회전 시작
  const handleSpin = () => {
    if (totalCount < 2 || spinning || isSlowingDown) return;
    setSpinning(true);
    setIsSlowingDown(false);
    setResult(null);
    setSpinSpeed(0.35 + Math.random() * 0.15);
  };
  // 즉시 정지
  const handleStop = () => {
    if (!spinning || isSlowingDown) return;
    setIsSlowingDown(true);
    setStopStartTime(performance.now());
    setInitialSpeed(spinSpeed);
  };

  // 회전 애니메이션 개선 (빠른 회전/감속 분리)
  useEffect(() => {
    let requestId: number;
    if (spinning && !isSlowingDown) {
      const spin = () => {
        setAngle(prev => prev + spinSpeed);
        requestId = requestAnimationFrame(spin);
      };
      requestId = requestAnimationFrame(spin);
      return () => cancelAnimationFrame(requestId);
    }
    if (spinning && isSlowingDown && stopStartTime !== null) {
      const duration = 11300;
      const start = stopStartTime;
      const initSpeed = initialSpeed;
      const animate = (timestamp: number) => {
        const elapsed = timestamp - start;
        const t = Math.min(elapsed / duration, 1);
        // ease-out: 속도가 점점 줄어듦
        const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
        const currentSpeed = initSpeed * (1 - easeOutCubic(t));
        setSpinSpeed(currentSpeed);
        // 각도 증가: 이전 프레임과의 시간 차이만큼 증가
        setAngle(prev => prev + currentSpeed);
        if (t < 1) {
          requestId = requestAnimationFrame(animate);
        } else {
          setSpinning(false);
          setIsSlowingDown(false);
          setSpinSpeed(0);
          setResult(getPointerItemNameByAngle(angle));
          setStopStartTime(null);
        }
      };
      requestId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestId);
    }
  }, [spinning, isSlowingDown, spinSpeed, stopStartTime, initialSpeed]);

  // 항목/각도 변경 시 버퍼에 섹터/텍스트만 그림
  useEffect(() => {
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
      bufferCanvasRef.current.width = 600;
      bufferCanvasRef.current.height = 600;
    }
    const buffer = bufferCanvasRef.current;
    const ctx = buffer.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, buffer.width, buffer.height);
    const cx = buffer.width / 2;
    const cy = buffer.height / 2;
    const radius = Math.min(cx, cy) - 8;
    if (items.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#eee';
      ctx.fill();
      ctx.font = '28px Hanna, Arial, sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('항목을 추가하세요', cx, cy);
      return;
    }
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const start = (acc / totalCount) * 2 * Math.PI - Math.PI / 2;
      const end = ((acc + item.count) / totalCount) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      // 텍스트 (가운데 정렬)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + (end - start) / 2);
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px Hanna, Arial, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 1;
      ctx.fillText(item.name, radius - 60, 0);
      ctx.restore();
      acc += item.count;
    }
  }, [items, totalCount]);

  // 회전/렌더링: 버퍼 이미지를 회전해서 drawImage, 포인터는 별도 그림
  useEffect(() => {
    const canvas = canvasRef.current;
    const buffer = bufferCanvasRef.current;
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 버퍼 이미지를 회전해서 그림
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.drawImage(buffer, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();
    // 포인터(위쪽 삼각형)
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0);
    ctx.beginPath();
    ctx.moveTo(0, -radius - 8);
    ctx.lineTo(-18, -radius - 38);
    ctx.lineTo(18, -radius - 38);
    ctx.closePath();
    ctx.fillStyle = '#607d8b';
    ctx.shadowColor = '#333';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.restore();
  }, [angle, items.length, totalCount]);

  // 항목 변경 시 각도 초기화
  useEffect(() => {
    setAngle(0);
    setResult(null);
    setSpinning(false);
  }, [items]);

  // 타이틀 인풋 포커스 자동
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // 12시(위쪽) 지점에 위치한 항목명 반환 (각도 보정)
  function getPointerItemNameByAngle(angle: number) {
    if (!items.length) return '';
    const total = totalCount;
    let acc = 0;
    // 12시 방향이 0도이므로, angle을 시계방향으로 회전한 만큼 보정
    // 실제 12시 방향에 오는 각도는 -angle (시계방향 회전)
    const pointerAngle = ((-angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    for (let i = 0; i < items.length; i++) {
      const start = (acc / total) * 2 * Math.PI;
      const end = ((acc + items[i].count) / total) * 2 * Math.PI;
      if (start <= end) {
        if (pointerAngle >= start && pointerAngle < end) return items[i].name;
      } else {
        if (pointerAngle >= start || pointerAngle < end) return items[i].name;
      }
      acc += items[i].count;
    }
    return items[items.length - 1].name;
  }

  // 원본 장식용 원판/반원/원형 레이어
  function DecorationLayers() {
    if (items.length === 0) {
      return (
        <div className="spinner-decoration">
          {/* 메인 원 */}
          <svg width={600} height={600} className="spinner-decoration-svg">
            <circle
              cx={300}
              cy={300}
              r={295}
              fill="#3A4A51"
              style={{ filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.5))', boxShadow: '-3px -3px 0 #3a4a51,0 -3px 0 #3a4a51,3px -3px 0 #3a4a51,3px 0 0 #3a4a51,3px 3px 0 #3a4a51,0 3px 0 #3a4a51,-3px 3px 0 #3a4a51,-3px 0 0 #3a4a51' }}
            />
          </svg>
          {/* 세로 반 나눈 흰색 원판 + 텍스트 */}
          <svg width={600} height={600} className="spinner-decoration-svg">
            {/* 왼쪽 반원 (더 짙은 색) */}
            <path d="M300,8 A292,292 0 0,0 300,592 L300,300 Z" fill="#e09b2d" />
            {/* 오른쪽 반원 (더 짙은 색) */}
            <path d="M300,8 A292,292 0 0,1 300,592 L300,300 Z" fill="#4a6fa5" />
            {/* 텍스트 */}
            <text x="170" y="310" textAnchor="middle" alignmentBaseline="middle" fontSize="38" fontFamily="Hanna, Arial, sans-serif" fill="#fff" fontWeight="bold">유할매</text>
            <text x="430" y="310" textAnchor="middle" alignmentBaseline="middle" fontSize="38" fontFamily="Hanna, Arial, sans-serif" fill="#fff" fontWeight="bold">돌림판</text>
          </svg>
        </div>
      );
    }
    return (
      <div className="spinner-decoration">
        {/* 메인 원 */}
        <svg width={600} height={600} className="spinner-decoration-svg">
          <circle
            cx={300}
            cy={300}
            r={295}
            fill="#3A4A51"
            style={{ filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.5))', boxShadow: '-3px -3px 0 #3a4a51,0 -3px 0 #3a4a51,3px -3px 0 #3a4a51,3px 0 0 #3a4a51,3px 3px 0 #3a4a51,0 3px 0 #3a4a51,-3px 3px 0 #3a4a51,-3px 0 0 #3a4a51' }}
          />
        </svg>
        {/* 메인 원 내부 */}
        <svg width={600} height={600} className="spinner-decoration-svg">
          <circle
            cx={300}
            cy={300}
            r={292}
            fill="#FFFFFF"
            style={{ boxShadow: '-3px -3px 0 #3a4a51,0 -3px 0 #3a4a51,3px -3px 0 #3a4a51,3px 0 0 #3a4a51,3px 3px 0 #3a4a51,0 3px 0 #3a4a51,-3px 3px 0 #3a4a51,-3px 0 0 #3a4a51' }}
          />
        </svg>
      </div>
    );
  }

  // 단축키 안내
  function ShortcutGuide() {
    return (
      <div className="spinner-shortcut-guide">
        <span style={{ marginRight: 12 }}><b>Alt</b>+클릭: ±100</span>
        <span style={{ marginRight: 12 }}><b>Ctrl</b>+클릭: ±10</span>
        <span><b>클릭</b>: ±1</span>
      </div>
    );
  }

  // 오버레이 클릭 시 결과 숨김
  const handleOverlayClick = () => {
    setResult(null);
  };

  // 포인터 텍스트(제목 아래)
  const pointerItemName = getPointerItemNameByAngle(angle);

  if (isMobile) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 64, background: '#fff' }} className="mobile-block-bg">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="py-10 px-8 flex items-center justify-center">
            <span style={{
              fontFamily: 'Hanna, Arial, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--foreground, #222)',
              letterSpacing: 1,
              userSelect: 'none',
              outline: 'none',
              textAlign: 'center',
            }}>
              모바일은 돌림판을 지원하지 않습니다
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="spinner-bg">
      <div className="spinner-container" style={{ position: 'relative' }}>
        {/* 결과 오버레이 */}
        {result && (
          <div
            onClick={handleOverlayClick}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
              background: 'transparent',
            }}
          >
            <div
              className="result-popup-anim"
              style={{
                fontFamily: 'Hanna, Arial, sans-serif',
                fontSize: 40,
                fontWeight: 900,
                color: 'var(--foreground, #222)',
                background: 'var(--card, #fff)',
                border: '3px solid var(--border, #ccc)',
                borderRadius: 16,
                boxShadow: '0 2px 12px #000',
                padding: '16px 50px',
                paddingTop: '20px',
                textAlign: 'center',
                userSelect: 'none',
                letterSpacing: 1,
                outline: 'none',
                transition: 'all 0.2s',
              }}
            >
              {pointerItemName}
            </div>
          </div>
        )}
        {/* 좌측: 돌림판 및 입력 */}
        <div className="spinner-left">
          <div className="spinner-title" style={{ cursor: 'pointer', fontFamily: 'Hanna, Arial, sans-serif' }}>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => {
                  if (e.key === 'Enter') setEditingTitle(false);
                }}
                style={{ fontSize: 28, fontWeight: 700, color: '#384850', border: 'none', outline: 'none', background: editingTitle ? '#EEEEEE' : 'transparent', width: '100%', textAlign: 'center', fontFamily: 'Hanna, Arial, sans-serif' }}
                maxLength={100}
              />
            ) : (
              <span onClick={() => setEditingTitle(true)}>{title}</span>
            )}
          </div>
          {/* 포인터 아래 현재 항목명 (제목 아래로 이동) */}
          <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Hanna, Arial, sans-serif', fontSize: 22, fontWeight: 700, color: '#607d8b', marginBottom: 4 }}>
            {pointerItemName}
          </div>
          <div className="spinner-wheel-wrapper">
            {/* 원판 상단 포인터 */}
            <div style={{ position: 'absolute', left: 292, top: -5, zIndex: 25, width: 18, height: 24 }}>
              <svg width="18" height="24">
                <polygon points="0,0 18,0 9,24" fill="#37474F" stroke="#333" strokeWidth="1" />
              </svg>
            </div>
            {items.length === 0 && <DecorationLayers />}
            {items.length > 0 && (
              <>
                <DecorationLayers />
                <canvas ref={canvasRef} width={600} height={600} className="spinner-canvas" />
              </>
            )}
            <div className="spinner-btn-wrapper">
              {!spinning && !isSlowingDown && (
                <button
                  className="spinner-btn"
                  onClick={handleSpin}
                  disabled={spinning || isSlowingDown || totalCount < 2}
                  style={{ cursor: spinning || isSlowingDown || totalCount < 2 ? 'not-allowed' : 'pointer', fontFamily: 'Hanna, Arial, sans-serif' }}
                >
                  시작
                </button>
              )}
              {spinning && !isSlowingDown && (
                <button
                  className="spinner-btn"
                  onClick={handleStop}
                  style={{ cursor: 'pointer', fontFamily: 'Hanna, Arial, sans-serif', background: '#e53935', color: '#fff' }}
                >
                  정지
                </button>
              )}
              {isSlowingDown && (
                <button
                  className="spinner-btn"
                  disabled
                  style={{ fontFamily: 'Hanna, Arial, sans-serif', background: '#ccc', color: '#fff' }}
                >
                  정지
                </button>
              )}
            </div>
          </div>
        </div>
        {/* 우측: 항목 리스트 및 추가 */}
        <div className="spinner-right">
          <ShortcutGuide />
          <div className="spinner-list-box">
            {/* 항목 추가 인풋 (상단 고정) */}
            <div className="spinner-add-row">
              <div style={{ width: 36 }} />
              <input
                className="spinner-add-input"
                placeholder="항목추가"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={spinning}
                maxLength={100}
              />
              <button
                className="spinner-add-btn"
                onClick={handleAdd}
                disabled={spinning}
              >+
              </button>
            </div>
            {/* 항목 리스트 */}
            {items.map((item, idx) => {
              const percent = totalCount > 0 ? (item.count / totalCount * 100) : 0;
              return (
                <div key={idx} className="spinner-item-row">
                  {/* 색상/번호 */}
                  <div className="spinner-item-color">
                    <div
                      className="spinner-item-color-inner"
                      style={{ background: COLORS[idx % COLORS.length] }}
                    >{idx + 1}</div>
                  </div>
                  {/* 이름(인라인 수정) */}
                  <input
                    value={item.name}
                    onChange={e => handleNameChange(idx, e.target.value)}
                    className="spinner-item-input"
                    maxLength={20}
                  />
                  {/* - 버튼 */}
                  <button
                    onClick={e => handleCountButton(e, idx, -1)}
                    className="spinner-item-btn"
                    style={{ marginRight: 2 }}
                    disabled={item.count <= 1}
                  >-</button>
                  {/* 비중 */}
                  <span className="spinner-item-count">×{item.count}</span>
                  {/* + 버튼 */}
                  <button
                    onClick={e => handleCountButton(e, idx, 1)}
                    className="spinner-item-btn"
                    style={{ marginLeft: 2 }}
                  >+</button>
                  {/* % */}
                  <span className="spinner-item-percent">{percent.toFixed(2)}%</span>
                  {/* 삭제 */}
                  <button
                    onClick={() => handleRemove(idx)}
                    className="spinner-item-delete"
                  >×</button>
                </div>
              );
            })}
          </div>
          {/* 이전 결과 목록: 항목 리스트 박스 바깥쪽 아래에 분리 표시 */}
          <div style={{ marginTop: 24 }}>
            <div className="font-semibold mb-2 flex items-center" style={{ fontSize: 14 }}>
              <span>이전 결과</span>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem(HISTORY_KEY);
                }}
                style={{
                  marginLeft: 10,
                  marginTop: 4,
                  fontSize: 12,
                  color: '#888',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 3,
                }}
              >초기화</button>
            </div>
            <ul className="text-xs text-gray-500 space-y-1">
              {history.length === 0 && <li>없음</li>}
              {history.map((h, i) => (
                <li key={h.name + h.date + i} className="truncate">{h.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 