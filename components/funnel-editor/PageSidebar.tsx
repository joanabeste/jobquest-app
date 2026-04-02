'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Copy, GripVertical, GitBranch } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FunnelPage } from '@/lib/funnel-types';

interface PageSidebarProps {
  pages: FunnelPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
  onRenamePage: (id: string, name: string) => void;
  onReorderPages: (newPages: FunnelPage[]) => void;
  onDuplicatePage: (id: string) => void;
}

export default function PageSidebar({
  pages, activePageId, onSelectPage, onAddPage,
  onDeletePage, onRenamePage, onReorderPages, onDuplicatePage,
}: PageSidebarProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderPages(arrayMove(pages, oldIndex, newIndex));
    }
  }

  return (
    <aside className="w-52 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seiten</span>
        <button
          onClick={onAddPage}
          className="w-6 h-6 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-500 hover:text-violet-700 flex items-center justify-center transition-colors"
          title="Seite hinzufügen"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 py-1.5 px-1.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {pages.map((page, index) => (
              <SortablePage
                key={page.id}
                page={page}
                pageIndex={index}
                isActive={page.id === activePageId}
                canDelete={pages.length > 1}
                hasConnection={Boolean(page.nextPageId)}
                onSelect={() => onSelectPage(page.id)}
                onDelete={() => onDeletePage(page.id)}
                onRename={(name) => onRenamePage(page.id, name)}
                onDuplicate={() => onDuplicatePage(page.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer – total count */}
      <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0">
        <span className="text-[10px] text-slate-400">{pages.length} Seite{pages.length !== 1 ? 'n' : ''}</span>
      </div>
    </aside>
  );
}

// ─── Sortable page item ───────────────────────────────────────────────────────
function SortablePage({
  page, pageIndex, isActive, canDelete, hasConnection,
  onSelect, onDelete, onRename, onDuplicate,
}: {
  page: FunnelPage; pageIndex: number; isActive: boolean; canDelete: boolean; hasConnection: boolean;
  onSelect: () => void; onDelete: () => void;
  onRename: (name: string) => void; onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(page.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isActive) onSelect();
    setEditing(true);
    setEditValue(page.name);
    setTimeout(() => inputRef.current?.select(), 10);
  }

  function commitEdit() {
    setEditing(false);
    if (editValue.trim()) onRename(editValue.trim());
    else setEditValue(page.name);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-all mb-0.5 ${
        isActive
          ? 'bg-violet-50 shadow-sm ring-1 ring-violet-100'
          : 'hover:bg-slate-50'
      } ${isDragging ? 'z-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes} {...listeners}
        className="p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={11} />
      </button>

      {/* Page number badge */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-colors ${
        isActive ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
      }`}>
        {pageIndex + 1}
      </div>

      {/* Name + info */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') { setEditing(false); setEditValue(page.name); }
            }}
            className="w-full text-xs bg-white border border-violet-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-violet-400"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <p
            onClick={isActive ? startEdit : undefined}
            onDoubleClick={!isActive ? startEdit : undefined}
            className={`text-xs truncate leading-tight ${
              isActive ? 'font-semibold text-slate-900 cursor-text' : 'text-slate-700'
            }`}
          >
            {page.name}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-slate-400">
            {page.nodes.length} Block{page.nodes.length !== 1 ? 's' : ''}
          </span>
          {hasConnection && (
            <span title="Hat explizite Weiterleitung">
              <GitBranch size={9} className="text-violet-400" />
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          title="Duplizieren"
        >
          <Copy size={10} />
        </button>
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
            title="Löschen"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
