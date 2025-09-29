"use client"
// 이 파일은 메인(이용안내) 페이지입니다.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, XCircle, Info, HelpCircle, AlignJustify } from 'lucide-react'
import NoticeBox from '@/components/notice-box'
import { useEffect } from 'react'
import Image from 'next/image'

export default function HomePage() {
  // 페이지 진입 시 방문자 카운트 증가 (1일 1회, 기기별 중복 방지)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const key = `visited_${today}`
    
    // 오늘 이미 방문했는지 확인
    if (!localStorage.getItem(key)) {
      // 방문자 수 증가 요청
      fetch('/api/visitor', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(response => {
          if (response.ok) {
            // 성공 시 로컬 스토리지에 기록
            localStorage.setItem(key, '1')
            console.log('방문자 수 증가 완료')
          }
        })
        .catch(error => {
          console.error('방문자 수 증가 실패:', error)
        })
    }
  }, [])

  return (
    <div className="w-full p-6 max-w-4xl mx-auto pb-20">
      <div className="space-y-6">
        <div className="relative flex items-center justify-center text-center">
          <Image src="/icons/ugm.webp" alt="" className="hidden sm:block absolute left-1/8 top-1/2 -translate-y-1/2 w-30 h-30 opacity-0" width={120} height={120} />
          <div className="w-full">
            <h1 className="text-3xl font-bold mb-2">유할매 노래책 이용안내</h1>
            <p className="text-muted-foreground">이용 시 꼭 확인해주세요</p>
          </div>
          <Image src="/icons/ugm.webp" alt="" className="hidden sm:block absolute right-1/8 top-1/2 -translate-y-1/2 w-30 h-30 opacity-0" width={120} height={120} />
        </div>
        <NoticeBox />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-green-200 w-full min-w-0">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                노래를 신청하시려면
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span className="break-words">원하시는 노래를 상단에서 <strong>🔎검색</strong> 해주세요.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span className="break-words">노래는 <strong>🧀치즈🧀</strong> 후원으로 신청할 수 있어요.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span className="break-words">노래는 신청한 순서대로 진행됩니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span className="break-words">설명서와 가격표를 꼭! 숙지해주세요 :)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200 w-full min-w-0">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                함께 시청하는 방송이에요
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 shrink-0">✗</span>
                  <span className="break-words">지속적인 강요나 반복적인 요구는 <strong className="text-red-600">💣밴</strong> 될 수 있습니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 shrink-0">✗</span>
                  <span className="break-words">노래에 대한 평가와 훈수는 지양해 주세요.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 shrink-0">✗</span>
                  <span className="break-words"><strong>목 컨디션</strong> 저하로 인해 <strong>다른 곡으로 대체🙏</strong> 될 수 있습니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 shrink-0">✗</span>
                  <span className="break-words">설명서와 가격표 미숙지는 <strong className="text-red-600">책임</strong>지지 않습니다.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-200">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              노래책 가격표
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1"><strong>10,000🧀</strong> ▶ 일반 신청곡 </h4>
                <ul className="space-y-1 text-sm">
                  <li className="break-words">• 후원 채팅 &apos;가수명 - 제목&apos;으로 신청곡을 지정할 수 있어요</li>
                  <li className="break-words mb-8">• 지정곡이 없다면, 후원 채팅 &apos;일반신청&apos;으로 랜덤 룰렛이 돌아가요</li>
                  </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1"><strong>15,000🧀</strong> ▶ 당일 불렀던 곡 재신청 </h4>
                <ul className="space-y-1 text-sm">
                  <li className="break-words">• 한 곡 당 하루에 한 번만 다시 불러드려요</li>
                  <li className="break-words mb-7">• 다양한 노래 리스트를 위해 양해 부탁드립니다🎹</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1"><strong>20,000🧀</strong> ▶ 우선 신청곡 </h4>
                <ul className="space-y-1 text-sm">
                <li className="break-words mb-8">• 노래 순서 새치기!</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1"><strong className="text-red-600">50,000🧀</strong> ▶ ⚡ 루프 스테이션 곡</h4>
                <ul className="space-y-1 text-sm">
                  <li className="break-words mb-8">• 노래 제목 옆에 ⚡아이콘이 붙어있어요</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1"><strong className="text-red-600">50,000🧀</strong> ▶ 🔥 난이도 높은 곡</h4>
                <ul className="space-y-1 text-sm">
                  <li className="break-words mb-8">• 노래 제목 옆에 🔥아이콘이 붙어있어요</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1"><strong className="line-through italic text-yellow-400">100,000🧀</strong> ▶ <strong className="line-through italic">노래책에 없는 미션곡 신청</strong></h4>
                <ul className="space-y-1 text-sm">
                  <li className="break-words"><strong className="text-xl text-red-600">• 미션곡이 많이 밀려있어, 일시적으로 미션곡은 받고있지 않아요 😥</strong></li>
                  <li className="break-words"><strong className="text-xl text-red-600">• 신청 마감 25.07.28 ~</strong></li>
                  <li className="break-words">• 너무 어려운 곡은 신청할 수 없어요❌</li>
                  <li className="break-words">• K-POP 위주로만 미션곡을 받고 있어요</li>
                  <li className="break-words">• 우쿨렐레 편곡 포함, 연습기간 <strong>약 2주</strong>정도 필요해요</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Info className="h-5 w-5" />
              기타 안내사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlignJustify className="h-5 w-5" />
                    왼쪽 사이드바에서 노래 목록을 확인해 주세요
                  </h4>
                  <p className="text-sm text-muted-foreground">
                  • 장르별 노래 페이지와, 다양한 기능이 준비되어 있답니다
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Image src="/icons/1st-verse.webp" alt="1절만 아이콘" className="h-5 w-5" width={20} height={20} />
                    아이콘을 확인해 주세요
                  </h4>
                  <p className="text-sm text-muted-foreground">
                  • 특정 곡들은 1절만 불러드릴 수 있어요
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Image src="/icons/mr.webp" alt="MR 아이콘" className="h-5 w-5" width={20} height={20} />
                    아이콘이 붙어 있다면
                  </h4>
                  <p className="text-sm text-muted-foreground">
                  • MR 버전이나, 우쿨렐레 버전으로 불러드릴 수 있어요
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div>
                  <h4 className="font-semibold">⚡ 아이콘이 붙어 있다면</h4>
                  <p className="text-sm text-muted-foreground">
                  • 루프 스테이션 곡이지만, 특정 곡은 우쿨렐레 버전으로 불러드릴 수 있으니, 채팅으로 문의해 주세요!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div>
                  <h4 className="font-semibold">🧀 미션곡 신청 시 유의사항</h4>
                  <p className="text-sm text-muted-foreground">
                  • 1인당 한 달에 2곡까지만 신청할 수 있어요
                  </p>
                  <p className="text-sm text-muted-foreground">
                  • 연습 기간은 약 2주이지만, 미션곡 수가 많아질 경우 조금 더 시간이 걸릴 수 있음을 양해🙏부탁드립니다
                  </p>
                  <p className="text-sm text-muted-foreground">
                  • 신청하신 분은 진행률 100% 완료된 것을 확인 후, 듣고 싶으실 때에 <strong className="text-red-600">채팅</strong>으로 말씀해주세요 :)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              FAQ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Q: 랜덤으로 일반 신청을 했는데, 룰렛이 안돌아갔어요😥</h4>
                <p className="text-sm mb-7 text-muted-foreground">
                  A: 익명 후원에는 룰렛이 돌아가지 않습니다. 하지만 걱정하지 마세요! 룰렛은 유할매가 다시 돌려드린답니다 :)
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Q: 이미 신청곡이 많이 밀려있어요, 몇 곡까지 신청이 가능한가요?</h4>
                <p className="text-sm mb-2 text-muted-foreground">
                  A: 돈미쥐💸 유할매는 신청곡🧀을 거절하지 않지만, 상식적인 범위는 지켜주세요🤣
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-center mt-3 text-sm text-muted-foreground">본 노래책 사이트의 무단 복제ㆍ변형ㆍ카피ㆍ2차 가공ㆍ상업적 이용 등 협의되지 않은 사용을 엄격히 금지합니다.</p>
    </div>
  )
}
