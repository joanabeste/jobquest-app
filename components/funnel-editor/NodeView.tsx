'use client';

import React from 'react';
import {
  Type, AlignLeft, MousePointer2, ImageIcon, Minus, Video,
  Play, MessageSquare, GitBranch, HelpCircle, Info, FileText,
  User, Sliders, List, CheckSquare, Phone, Trophy,
  Layout, Zap, FileDown, Send, Star, Timer, MapPin, ArrowLeftRight,
  Copy, Trash2, Layers,
} from 'lucide-react';
import { BlockNode, FunnelBlockType, LayoutNode, FunnelNode, BLOCK_LABELS, FunnelStyle } from '@/lib/funnel-types';
import BlockPreview from './blocks/BlockPreview';

const BLOCK_META: Record<FunnelBlockType, { icon: React.ElementType; color: string; bg: string }> = {
  heading:             { icon: Type,          color: 'text-slate-600',   bg: 'bg-slate-100' },
  paragraph:           { icon: AlignLeft,     color: 'text-slate-500',   bg: 'bg-slate-50' },
  button:              { icon: MousePointer2, color: 'text-violet-600',  bg: 'bg-violet-50' },
  image:               { icon: ImageIcon,     color: 'text-blue-500',    bg: 'bg-blue-50' },
  spacer:              { icon: Minus,         color: 'text-slate-400',   bg: 'bg-slate-50' },
  video:               { icon: Video,         color: 'text-red-500',     bg: 'bg-red-50' },
  quest_scene:         { icon: Play,          color: 'text-violet-600',  bg: 'bg-violet-50' },
  quest_dialog:        { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-50' },
  quest_decision:      { icon: GitBranch,     color: 'text-amber-600',   bg: 'bg-amber-50' },
  quest_quiz:          { icon: HelpCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  quest_info:          { icon: Info,          color: 'text-sky-600',     bg: 'bg-sky-50' },
  quest_freetext:      { icon: FileText,      color: 'text-slate-600',   bg: 'bg-slate-50' },
  quest_file:          { icon: FileDown,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  quest_lead:          { icon: Send,          color: 'text-violet-700',  bg: 'bg-violet-100' },
  quest_spinner:       { icon: Timer,         color: 'text-slate-600',   bg: 'bg-slate-100' },
  quest_rating:        { icon: Star,          color: 'text-amber-500',   bg: 'bg-amber-50' },
  quest_hotspot:       { icon: MapPin,        color: 'text-rose-500',    bg: 'bg-rose-50' },
  quest_zuordnung:     { icon: ArrowLeftRight, color: 'text-teal-500',   bg: 'bg-teal-50' },
  check_intro:         { icon: Zap,           color: 'text-violet-600',  bg: 'bg-violet-50' },
  check_vorname:       { icon: User,          color: 'text-blue-600',    bg: 'bg-blue-50' },
  check_frage:         { icon: HelpCircle,    color: 'text-amber-600',   bg: 'bg-amber-50' },
  check_ergebnisfrage: { icon: CheckSquare,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  check_selbst:        { icon: Sliders,       color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  check_swipe_deck:    { icon: Layers,        color: 'text-pink-600',    bg: 'bg-pink-50' },
  check_lead:          { icon: Phone,         color: 'text-rose-600',    bg: 'bg-rose-50' },
  check_ergebnis:      { icon: Trophy,        color: 'text-amber-600',   bg: 'bg-amber-50' },
  form_hero:           { icon: Layout,        color: 'text-violet-600',  bg: 'bg-violet-50' },
  form_text:           { icon: AlignLeft,     color: 'text-slate-600',   bg: 'bg-slate-50' },
  form_image:          { icon: ImageIcon,     color: 'text-blue-500',    bg: 'bg-blue-50' },
  form_step:           { icon: List,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
  form_config:         { icon: FileText,      color: 'text-slate-500',   bg: 'bg-slate-100' },
};

export { BLOCK_META };

// ─── Style wrapper – mirrors StyledBlock in FunnelPlayer ─────────────────────
function StyleWrapper({ style, children }: { style?: FunnelStyle; children: React.ReactNode }) {
  if (!style) return <>{children}</>;
  const hasStyle = Object.values(style).some((v) => v !== undefined && v !== 0 && v !== '');
  if (!hasStyle) return <>{children}</>;
  return (
    <div style={{
      paddingTop:      style.paddingTop    ? `${style.paddingTop}px`    : undefined,
      paddingRight:    style.paddingRight  ? `${style.paddingRight}px`  : undefined,
      paddingBottom:   style.paddingBottom ? `${style.paddingBottom}px` : undefined,
      paddingLeft:     style.paddingLeft   ? `${style.paddingLeft}px`   : undefined,
      backgroundColor: style.backgroundColor || undefined,
      borderRadius:    style.borderRadius  ? `${style.borderRadius}px`  : undefined,
      textAlign:       style.textAlign     || undefined,
    }}>
      {children}
    </div>
  );
}

// ─── NodeView ─────────────────────────────────────────────────────────────────
interface NodeViewProps {
  node: FunnelNode;
  isSelected: boolean;
  isDragging?: boolean;
  isLocked?: boolean;
  dragHandle?: React.ReactNode;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate?: (patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  renderColumns?: (layout: LayoutNode) => React.ReactNode;
}

export default function NodeView({
  node, isSelected, isDragging, isLocked, dragHandle,
  onSelect, onDelete, onDuplicate, onUpdate, renderColumns,
}: NodeViewProps) {
  const meta = node.kind === 'block' ? BLOCK_META[node.type] : null;
  const Icon = meta?.icon;
  const label = node.kind === 'block'
    ? BLOCK_LABELS[node.type]
    : `${(node as LayoutNode).columns.length} Spalten`;

  const labelOpacity  = isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-80';
  const actionOpacity = isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); }}
      onClick={(e) => e.stopPropagation()}
      className={`relative group transition-all duration-100 cursor-default
        ${isSelected
          ? 'ring-2 ring-violet-500 ring-offset-0 z-10'
          : 'hover:ring-1 hover:ring-violet-300/50'}
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      {isSelected && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-violet-500 z-30 pointer-events-none" />
      )}

      {node.kind === 'block' ? (
        <StyleWrapper style={node.style}>
          <BlockPreview
            node={node as BlockNode}
            onUpdate={onUpdate ? (p) => onUpdate({ props: p }) : undefined}
          />
        </StyleWrapper>
      ) : (
        <div className="p-3 bg-white">
          {renderColumns ? renderColumns(node as LayoutNode) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${(node as LayoutNode).columns.length}, 1fr)` }}>
              {(node as LayoutNode).columns.map((col) => (
                <div key={col.id} className="min-h-12 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-slate-300">{col.nodes.length} Blöcke</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`absolute top-2 left-2 flex items-center gap-1 z-20 transition-opacity duration-100 pointer-events-none ${labelOpacity}`}>
        {dragHandle && (
          <span className={`pointer-events-auto flex items-center rounded p-0.5 transition-colors
            ${isSelected ? 'bg-violet-700 text-white' : 'bg-violet-700/75 text-white/80 hover:text-white backdrop-blur-sm'}`}>
            {dragHandle}
          </span>
        )}
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded pointer-events-none transition-colors
          ${isSelected ? 'bg-violet-600 shadow-sm' : 'bg-violet-600/75 backdrop-blur-sm'}`}>
          {Icon && <Icon size={9} className="text-white flex-shrink-0" />}
          <span className="text-[9px] font-bold uppercase tracking-widest text-white leading-none">{label}</span>
        </span>
      </div>

      {!isLocked && (
        <div className={`absolute top-2 right-2 flex items-center gap-0.5 z-20 transition-opacity duration-100 ${actionOpacity}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 rounded bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-colors"
            title="Duplizieren (⌘D)"
          >
            <Copy size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
            title="Löschen"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
