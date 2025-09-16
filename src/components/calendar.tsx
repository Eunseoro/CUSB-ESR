"use client"
// 달력 컴포넌트: 실제 달력 형태의 UI
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CalendarProps {
  selectedDate: string | null
  onDateSelect: (date: string) => void
}

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // 이번 달의 첫 번째 날과 마지막 날
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  // 달력에 표시할 날짜들 생성
  const days = []
  
  // 이전 달의 마지막 날들 (빈 칸 채우기)
  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevMonth = new Date(year, month - 1, 0)
    const day = prevMonth.getDate() - startingDayOfWeek + i + 1
    days.push({
      date: day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      fullDate: new Date(year, month - 1, day).toISOString().split('T')[0]
    })
  }
  
  // 이번 달의 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    const fullDate = new Date(year, month, day).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    
    days.push({
      date: day,
      isCurrentMonth: true,
      isToday: fullDate === today,
      isSelected: selectedDate === fullDate,
      fullDate
    })
  }
  
  // 다음 달의 첫 번째 날들 (빈 칸 채우기)
  const remainingDays = 42 - days.length // 6주 * 7일 = 42
  for (let day = 1; day <= remainingDays; day++) {
    const fullDate = new Date(year, month + 1, day).toISOString().split('T')[0]
    days.push({
      date: day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      fullDate
    })
  }
  
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const handleDateClick = (fullDate: string) => {
    onDateSelect(fullDate)
  }
  
  return (
    <div className="w-full max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {year}년 {monthNames[month]}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day.fullDate)}
            className={`
              h-8 w-8 text-sm rounded-md transition-colors
              ${!day.isCurrentMonth 
                ? 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700' 
                : 'text-gray-900 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-900'
              }
              ${day.isToday 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : ''
              }
              ${day.isSelected && !day.isToday
                ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' 
                : ''
              }
            `}
          >
            {day.date}
          </button>
        ))}
      </div>
    </div>
  )
}
