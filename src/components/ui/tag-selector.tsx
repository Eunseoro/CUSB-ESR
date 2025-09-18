// BGM 태그 선택 컴포넌트
'use client'

// useState는 사용하지 않으므로 제거
import { BgmTag, BGM_TAGS } from '@/types/bgm'
import { getBgmTagColor, getBgmTagUnselectedColor } from '@/lib/song-utils'

interface TagSelectorProps {
  selectedTags: BgmTag[]
  onTagsChange: (tags: BgmTag[]) => void
  maxTags?: number
  className?: string
}

export function TagSelector({ 
  selectedTags, 
  onTagsChange, 
  maxTags = 3,
  className = '' 
}: TagSelectorProps) {

  const handleTagToggle = (tag: BgmTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag])
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 모든 태그 표시 */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {BGM_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            const isDisabled = !isSelected && selectedTags.length >= maxTags
            
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                disabled={isDisabled}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  ${isSelected 
                    ? getBgmTagColor(tag) + ' cursor-pointer hover:opacity-80' 
                    : isDisabled 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                      : getBgmTagUnselectedColor(tag) + ' opacity-60 hover:opacity-80 cursor-pointer'
                  }
                `}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
} 