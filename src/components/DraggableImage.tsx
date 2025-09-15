import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/LazyImage';
import Image from 'next/image';

interface DraggableImageProps {
  id: string;
  imageUrl: string;
  fileName?: string;
  order: number;
  onOrderChange: (newOrder: number) => void;
  onRemove: () => void;
  isDragging?: boolean;
  className?: string;
}

export function DraggableImage({
  id,
  imageUrl,
  fileName,
  order,
  onOrderChange,
  onRemove,
  isDragging = false,
  className = ""
}: DraggableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingState,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: 'calc(100% - 60px)', // 삭제 버튼 공간 확보
  };

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  };

  // 이미지 우클릭 방지 (무단 복제 방지)
  const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative flex items-center">
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 border rounded cursor-move hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${className} ${
          isDraggingState ? 'opacity-50 shadow-lg' : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex-shrink-0">
          <Image 
            src={imageUrl} 
            alt="이미지" 
            className="w-12 h-12 object-cover rounded"
            draggable={false}
            onContextMenu={handleImageContextMenu}
            width={48}
            height={48}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{fileName || `이미지 ${order + 1}`}</p>
          <p className="text-xs text-muted-foreground">순서: {order + 1}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="text-gray-400 text-xs select-none">⋮⋮</div>
          <input
            type="number"
            min="1"
            max="99"
            value={order + 1}
            onChange={(e) => onOrderChange(parseInt(e.target.value) - 1)}
            className="w-16 px-2 py-1 text-sm border rounded bg-background text-foreground"
            onClick={(e) => e.stopPropagation()}
            style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
          />
        </div>
      </div>
      {/* 삭제 버튼을 세로 중앙에 배치 */}
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={handleRemoveClick}
        className="ml-2 z-10"
        style={{ minWidth: 'auto', padding: '4px 8px', fontSize: '12px' }}
      >
        삭제
      </Button>
    </div>
  );
} 