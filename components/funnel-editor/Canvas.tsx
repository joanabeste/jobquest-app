'use client';

import { useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import {
  DndContext, DragEndEvent, DragStartEvent,
  DragOverlay, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FunnelPage, FunnelNode, LayoutNode, InsertTarget, FunnelContentType,
  FunnelBlockType, BlockNode, FunnelStyle,
} from '@/lib/funnel-types';
import NodeView from './NodeView';
import BlockLibrary from './BlockLibrary';

// ─── Props ────────────────────────────────────────────────────────────────────
interface CanvasProps {
  page: FunnelPage | null;
  contentType: FunnelContentType;
  selectedNodeId: string | null;
  insertTarget: InsertTarget | null;
  onSelectNode: (id: string) => void;
  onDeselectNode: () => void;
  onSetInsertTarget: (t: InsertTarget | null) => void;
  onInsertBlock: (type: FunnelBlockType, props: Record<string, unknown>, target: InsertTarget) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onUpdateNode: (nodeId: string, patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  onReorderRoot: (from: number, to: number) => void;
  onReorderColumn: (columnId: string, from: number, to: number) => void;
  onMoveToContainer: (nodeId: string, targetContainer: 'root' | string, afterId: string | null) => void;
}

const ROOT_CONTAINER = '__root__';

// ─── Canvas ───────────────────────────────────────────────────────────────────
export default function Canvas({
  page, contentType, selectedNodeId, insertTarget,
  onSelectNode, onDeselectNode, onSetInsertTarget,
  onInsertBlock,
  onDeleteNode, onDuplicateNode, onUpdateNode,
  onReorderRoot, onReorderColumn, onMoveToContainer,
}: CanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const [draggingId, setDraggingId] = useState<string | null>(null);

  function findContainer(nodeId: string): string {
    if (!page) return ROOT_CONTAINER;
    if (page.nodes.find((n) => n.id === nodeId)) return ROOT_CONTAINER;
    for (const n of page.nodes) {
      if (n.kind === 'layout') {
        for (const col of n.columns) {
          if (col.nodes.find((cn) => cn.id === nodeId)) return col.id;
        }
      }
    }
    return ROOT_CONTAINER;
  }

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!page) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const fromContainer = findContainer(String(active.id));
    const toContainer   = findContainer(String(over.id));

    if (fromContainer === toContainer) {
      if (fromContainer === ROOT_CONTAINER) {
        const fromIdx = page.nodes.findIndex((n) => n.id === active.id);
        const toIdx   = page.nodes.findIndex((n) => n.id === over.id);
        if (fromIdx !== -1 && toIdx !== -1) onReorderRoot(fromIdx, toIdx);
      } else {
        const col = page.nodes.flatMap((n) => n.kind === 'layout' ? n.columns : []).find((c) => c.id === fromContainer);
        if (col) {
          const fromIdx = col.nodes.findIndex((n) => n.id === active.id);
          const toIdx   = col.nodes.findIndex((n) => n.id === over.id);
          if (fromIdx !== -1 && toIdx !== -1) onReorderColumn(fromContainer, fromIdx, toIdx);
        }
      }
    } else {
      onMoveToContainer(String(active.id), toContainer, String(over.id));
    }
  }

  const draggingNode = page?.nodes.find((n) => n.id === draggingId) ??
    page?.nodes.flatMap((n) => n.kind === 'layout' ? n.columns.flatMap((c) => c.nodes) : []).find((n) => n.id === draggingId);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100">
        <p className="text-slate-400 text-sm">Keine Seite ausgewählt</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100" onClick={onDeselectNode}>
      {/* Page label */}
      <div className="flex items-center justify-center pt-5 pb-2 pointer-events-none">
        <span className="text-[11px] font-medium text-slate-400 tracking-wide">{page.name}</span>
      </div>

      {/* Page container – white, looks like the live output */}
      <div className="max-w-[480px] mx-auto mb-10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] overflow-hidden min-h-[200px] ring-1 ring-black/6">
        <div className="bg-white">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={page.nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              {/* Insert zone before first block */}
              <InsertZone
                target={{ location: 'root', afterId: null }}
                active={insertTarget?.location === 'root' && insertTarget?.afterId === null}
                onActivate={onSetInsertTarget}
              />

              {page.nodes.map((node) => (
                <div key={node.id}>
                  <SortableNodeWrapper
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    isDragging={draggingId === node.id}
                    isLocked={node.kind === 'block' && node.type === 'quest_lead'}
                    onSelect={() => onSelectNode(node.id)}
                    onDelete={() => onDeleteNode(node.id)}
                    onDuplicate={() => onDuplicateNode(node.id)}
                    onUpdate={(patch) => onUpdateNode(node.id, patch)}
                    insertTarget={insertTarget}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    onDeleteNode={onDeleteNode}
                    onDuplicateNode={onDuplicateNode}
                    onUpdateNode={onUpdateNode}
                    onSetInsertTarget={onSetInsertTarget}
                  />
                  <InsertZone
                    target={{ location: 'root', afterId: node.id }}
                    active={insertTarget?.location === 'root' && insertTarget?.afterId === node.id}
                    onActivate={onSetInsertTarget}
                  />
                </div>
              ))}

              {/* Empty state */}
              {page.nodes.length === 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSetInsertTarget({ location: 'root', afterId: null }); }}
                  className="w-full p-12 text-center hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Plus size={18} className="text-violet-500 group-hover:text-violet-700" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-violet-700 transition-colors">Block hinzufügen</p>
                  <p className="text-xs text-slate-400 mt-1">Klicke, um den ersten Block einzufügen</p>
                </button>
              )}
            </SortableContext>

            <DragOverlay>
              {draggingNode && (
                <div className="opacity-80 rotate-1 shadow-2xl">
                  <NodeView
                    node={draggingNode}
                    isSelected={false}
                    isDragging={true}
                    onSelect={() => {}}
                    onDelete={() => {}}
                    onDuplicate={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Persistent add-block button at bottom (when page has blocks) */}
      {page.nodes.length > 0 && (
        <div className="flex justify-center pb-6 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetInsertTarget({ location: 'root', afterId: page.nodes.at(-1)?.id ?? null });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-violet-700 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 shadow-sm transition-all"
          >
            <Plus size={13} /> Block hinzufügen
          </button>
        </div>
      )}

      {/* Block library popup */}
      {insertTarget && (
        <BlockLibrary
          contentType={contentType}
          onInsertBlock={(type, props) => onInsertBlock(type, props, insertTarget)}
          onClose={() => onSetInsertTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Sortable root node wrapper ───────────────────────────────────────────────
function SortableNodeWrapper({
  node, isSelected, isDragging, isLocked,
  onSelect, onDelete, onDuplicate, onUpdate,
  insertTarget, selectedNodeId,
  onSelectNode, onDeleteNode, onDuplicateNode, onUpdateNode,
  onSetInsertTarget,
}: {
  node: FunnelNode; isSelected: boolean; isDragging: boolean; isLocked?: boolean;
  onSelect: () => void; onDelete: () => void; onDuplicate: () => void;
  onUpdate: (patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  insertTarget: InsertTarget | null; selectedNodeId: string | null;
  onSelectNode: (id: string) => void; onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onUpdateNode: (nodeId: string, patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  onSetInsertTarget: (t: InsertTarget | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const dragHandle = (
    <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing text-white/70">
      <GripVertical size={13} />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <NodeView
        node={node}
        isSelected={isSelected}
        isDragging={isDragging}
        isLocked={isLocked}
        dragHandle={dragHandle}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdate={onUpdate}
        renderColumns={node.kind === 'layout' ? (layout: LayoutNode) => (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${layout.columns.length}, 1fr)` }}>
            {layout.columns.map((col) => (
              <ColumnDropZone
                key={col.id}
                column={col}
                insertTarget={insertTarget}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onDeleteNode={onDeleteNode}
                onDuplicateNode={onDuplicateNode}
                onUpdateNode={onUpdateNode}
                onSetInsertTarget={onSetInsertTarget}
              />
            ))}
          </div>
        ) : undefined}
      />
    </div>
  );
}

// ─── Column drop zone ─────────────────────────────────────────────────────────
function ColumnDropZone({
  column, insertTarget, selectedNodeId,
  onSelectNode, onDeleteNode, onDuplicateNode, onUpdateNode, onSetInsertTarget,
}: {
  column: import('@/lib/funnel-types').Column;
  insertTarget: InsertTarget | null; selectedNodeId: string | null;
  onSelectNode: (id: string) => void; onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onUpdateNode: (nodeId: string, patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  onSetInsertTarget: (t: InsertTarget | null) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <SortableContext items={column.nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className="min-h-16 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2 space-y-1">
        <InsertZone
          target={{ location: 'column', columnId: column.id, afterId: null }}
          active={insertTarget?.location === 'column' && insertTarget?.columnId === column.id && insertTarget?.afterId === null}
          onActivate={onSetInsertTarget}
          compact
        />

        {column.nodes.map((cnode) => (
          <SortableColumnNode
            key={cnode.id}
            node={cnode as BlockNode}
            selectedNodeId={selectedNodeId}
            columnId={column.id}
            insertTarget={insertTarget}
            onSelectNode={onSelectNode}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            onUpdateNode={onUpdateNode}
            onSetInsertTarget={onSetInsertTarget}
          />
        ))}

        {column.nodes.length === 0 && (
          <p className="text-[10px] text-slate-300 text-center py-2">Leer</p>
        )}
      </div>
    </SortableContext>
  );
}

// ─── Sortable column node ─────────────────────────────────────────────────────
function SortableColumnNode({
  node, selectedNodeId, columnId, insertTarget,
  onSelectNode, onDeleteNode, onDuplicateNode, onUpdateNode, onSetInsertTarget,
}: {
  node: BlockNode;
  selectedNodeId: string | null;
  columnId: string;
  insertTarget: InsertTarget | null;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onUpdateNode: (nodeId: string, patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  onSetInsertTarget: (t: InsertTarget | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const dragHandle = (
    <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing text-white/70">
      <GripVertical size={12} />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <NodeView
        node={node}
        isSelected={selectedNodeId === node.id}
        dragHandle={dragHandle}
        onSelect={() => onSelectNode(node.id)}
        onDelete={() => onDeleteNode(node.id)}
        onDuplicate={() => onDuplicateNode(node.id)}
        onUpdate={(patch) => onUpdateNode(node.id, patch)}
      />
      <InsertZone
        target={{ location: 'column', columnId, afterId: node.id }}
        active={insertTarget?.location === 'column' && insertTarget?.columnId === columnId && insertTarget?.afterId === node.id}
        onActivate={onSetInsertTarget}
        compact
      />
    </div>
  );
}

// ─── Insert zone – always visible line + button ───────────────────────────────
function InsertZone({
  target, active, onActivate, compact,
}: {
  target: InsertTarget; active: boolean; onActivate: (t: InsertTarget) => void; compact?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const emphasis = hover || active;

  return (
    <div
      className={`relative flex items-center justify-center ${compact ? 'h-5' : 'h-6'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Always-visible faint line */}
      <div className={`absolute inset-x-4 top-1/2 -translate-y-1/2 h-px transition-colors ${
        emphasis ? 'bg-violet-400' : 'bg-slate-200'
      }`} />
      {/* + button — faint by default, vivid on hover/active */}
      <button
        onClick={(e) => { e.stopPropagation(); onActivate(target); }}
        className={`relative flex items-center justify-center gap-1 rounded-full text-[10px] font-semibold z-10 transition-all ${
          compact ? 'w-4 h-4' : 'w-5 h-5'
        } ${
          emphasis
            ? 'bg-violet-600 text-white shadow-sm scale-105'
            : 'bg-white border border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500'
        }`}
      >
        <Plus size={compact ? 8 : 9} />
      </button>
    </div>
  );
}
