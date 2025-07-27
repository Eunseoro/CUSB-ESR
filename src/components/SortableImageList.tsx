import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableImage } from './DraggableImage';

interface ImageItem {
  id: string;
  imageUrl: string;
  fileName?: string;
  order: number;
}

interface SortableImageListProps {
  items: ImageItem[];
  onItemsChange: (items: ImageItem[]) => void;
  onOrderChange: (id: string, newOrder: number) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function SortableImageList({
  items,
  onItemsChange,
  onOrderChange,
  onRemove,
  className = ""
}: SortableImageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    console.log('드래그 시작:', event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    console.log('드래그 종료:', { active: active.id, over: over?.id });

    if (active.id !== over?.id && over) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      console.log('인덱스 변경:', { oldIndex, newIndex });

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 순서 업데이트
        const updatedItems = newItems.map((item: ImageItem, index: number) => ({
          ...item,
          order: index
        }));
        
        console.log('업데이트된 아이템:', updatedItems);
        onItemsChange(updatedItems);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className={`flex flex-col gap-2 ${className}`}>
          {items.map((item) => (
            <DraggableImage
              key={item.id}
              id={item.id}
              imageUrl={item.imageUrl}
              fileName={item.fileName}
              order={item.order}
              onOrderChange={(newOrder) => onOrderChange(item.id, newOrder)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 