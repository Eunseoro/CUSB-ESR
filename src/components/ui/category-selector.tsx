// 노래 카테고리 선택 컴포넌트
'use client'

import { SongCategory } from '@/types/song'
import { getCategoryColor, getCategoryLabel } from '@/lib/song-utils'

const SONG_CATEGORIES: SongCategory[] = ['KPOP', 'POP', 'MISSION', 'NEWSONG']

interface CategorySelectorProps {
  selectedCategories: SongCategory[]
  onCategoriesChange: (categories: SongCategory[]) => void
  maxCategories?: number
  className?: string
}

export function CategorySelector({ 
  selectedCategories, 
  onCategoriesChange, 
  maxCategories = 4,
  className = '' 
}: CategorySelectorProps) {

  const handleCategoryToggle = (category: SongCategory) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category))
    } else if (selectedCategories.length < maxCategories) {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 모든 카테고리 표시 */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {SONG_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category)
            const isDisabled = !isSelected && selectedCategories.length >= maxCategories
            
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryToggle(category)}
                disabled={isDisabled}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  ${isSelected 
                    ? getCategoryColor(category) + ' cursor-pointer hover:opacity-80' 
                    : isDisabled 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                      : getCategoryColor(category) + ' opacity-60 hover:opacity-80 cursor-pointer'
                  }
                `}
              >
                {getCategoryLabel(category)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
} 