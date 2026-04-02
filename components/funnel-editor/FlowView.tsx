'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type OnEdgesDelete,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MousePointer2, Plus, X } from 'lucide-react';
import { FunnelDoc, FunnelPage, BlockNode, BLOCK_LABELS } from '@/lib/funnel-types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DecisionOption = { id: string; text: string; emoji?: string; targetPageId?: string };

type PageNodeData = {
  page: FunnelPage;
  pageIndex: number;
  decisionOptions: DecisionOption[];
};

const OPTION_COLORS = ['#06b6d4', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#f97316'];

// ─── Node height helpers ───────────────────────────────────────────────────────

const NODE_HEADER_H = 64;
const NODE_QUESTION_H = 28;
const NODE_OPTION_H = 34;
const NODE_FOOTER_H = 34;

function calcNodeHeight(numOptions: number): number {
  return NODE_HEADER_H
    + (numOptions > 0 ? 1 + NODE_QUESTION_H + numOptions * NODE_OPTION_H : 0)
    + 1 + NODE_FOOTER_H;
}

// ─── Handle style helper ──────────────────────────────────────────────────────

function mkHandle(color: string, top: number, side: 'left' | 'right' = 'right') {
  return {
    background: color,
    width: 12,
    height: 12,
    border: '2.5px solid white',
    boxShadow: `0 0 0 2px ${color}55`,
    top,
    [side]: -6,
    left: side === 'left' ? -6 : 'auto',
    transform: 'translateY(-50%)',
  };
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

function PageNode({ data, selected }: NodeProps<Node<PageNodeData>>) {
  const { page, pageIndex, decisionOptions } = data;

  const hasDecision = decisionOptions.length > 0;
  const nodeH = calcNodeHeight(decisionOptions.length);

  const blockTypes = page.nodes
    .filter((n) => n.kind === 'block' && (n as BlockNode).type !== 'quest_decision')
    .map((n) => BLOCK_LABELS[(n as BlockNode).type])
    .slice(0, 2);

  const decisionBlock = page.nodes.find(
    (n): n is BlockNode => n.kind === 'block' && n.type === 'quest_decision',
  );
  const question = decisionBlock ? (decisionBlock.props.question as string) || 'Entscheidung' : '';

  const optHandleTops = decisionOptions.map(
    (_, i) => NODE_HEADER_H + 1 + NODE_QUESTION_H + i * NODE_OPTION_H + NODE_OPTION_H / 2,
  );
  const nextHandleTop = nodeH - NODE_FOOTER_H / 2;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all select-none overflow-hidden ${
        selected
          ? 'border-violet-400 shadow-lg shadow-violet-100 ring-2 ring-violet-200'
          : 'border-slate-200 shadow-md hover:shadow-lg hover:border-violet-300'
      }`}
      style={{ width: 252, height: nodeH }}
    >
      {/* Incoming handle – left center */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={mkHandle('#94a3b8', nodeH / 2, 'left')}
      />

      {/* ── Header ── */}
      <div
        className="px-3 pt-3 pb-2 border-b border-slate-100"
        style={{ height: NODE_HEADER_H, background: 'linear-gradient(to bottom, #fafafa, #ffffff)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-[11px] flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
            {pageIndex + 1}
          </span>
          <span className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
            {page.name || `Seite ${pageIndex + 1}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5 ml-8">
          {blockTypes.length > 0
            ? blockTypes.map((label, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded-md text-slate-500 font-medium">
                  {label}
                </span>
              ))
            : <span className="text-[10px] text-slate-300 italic">Keine Blöcke</span>
          }
        </div>
      </div>

      {/* ── Decision options ── */}
      {hasDecision && (
        <>
          {/* Question */}
          <div
            className="px-3 flex items-center bg-slate-50"
            style={{ height: NODE_QUESTION_H }}
          >
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">
              {question}
            </span>
          </div>

          {/* Options */}
          {decisionOptions.map((opt, i) => {
            const color = OPTION_COLORS[i % OPTION_COLORS.length];
            return (
              <div
                key={opt.id}
                className="flex items-center gap-2 px-3 border-t border-slate-100"
                style={{ height: NODE_OPTION_H }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ background: color }}
                />
                <span className="text-[12px] text-slate-700 truncate flex-1 pr-3 font-medium">
                  {opt.text || `Option ${i + 1}`}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`opt-${opt.id}`}
                  style={mkHandle(color, optHandleTops[i])}
                />
              </div>
            );
          })}
        </>
      )}

      {/* ── Weiter row ── */}
      <div className="border-t border-slate-100" />
      <div
        className="flex items-center gap-2 px-3 bg-slate-50/60"
        style={{ height: NODE_FOOTER_H }}
      >
        <span className="text-[11px] text-slate-400 font-medium">Weiter →</span>
        <Handle
          type="source"
          position={Position.Right}
          id="next"
          style={mkHandle('#94a3b8', nextHandleTop)}
        />
      </div>
    </div>
  );
}

// ─── Custom Edge with delete button ──────────────────────────────────────────

function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, label, data, selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });
  const color = (data as { color?: string } | undefined)?.color;
  const hasLabel = Boolean(label);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} interactionWidth={20} />
      <EdgeLabelRenderer>
        {hasLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11, fontWeight: 600,
              color: color ?? '#64748b',
              background: 'white',
              padding: '2px 8px', borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              pointerEvents: 'none',
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        )}
        {selected && (
          <button
            onClick={(e) => { e.stopPropagation(); deleteElements({ edges: [{ id }] }); }}
            title="Verbindung löschen"
            style={{
              position: 'absolute',
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY + (hasLabel ? 18 : 0)}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan w-5 h-5 bg-white border border-red-300 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 shadow-sm transition-colors cursor-pointer"
          >
            <X size={10} />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { pageNode: PageNode };
const edgeTypes = { deletable: DeletableEdge };

// ─── Hierarchical layout ──────────────────────────────────────────────────────

const NODE_W = 240;
const NODE_H = 200; // generous estimate; actual height varies by option count
const H_GAP = 100;  // horizontal gap between levels
const V_GAP = 50;   // vertical gap between nodes on same level

/** Compute all pages reachable from a given page (direct targets only). */
function getTargets(page: FunnelPage, doc: FunnelDoc): string[] {
  const targets: string[] = [];

  // Decision option targets
  const decisionBlock = page.nodes.find(
    (n): n is BlockNode => n.kind === 'block' && n.type === 'quest_decision',
  );
  if (decisionBlock) {
    const options = (decisionBlock.props.options as DecisionOption[]) ?? [];
    for (const opt of options) {
      if (opt.targetPageId && !targets.includes(opt.targetPageId)) {
        targets.push(opt.targetPageId);
      }
    }
  }

  // Explicit nextPageId
  if (page.nextPageId && !targets.includes(page.nextPageId)) {
    targets.push(page.nextPageId);
  }

  // Implicit: next in array
  if (targets.length === 0) {
    const idx = doc.pages.findIndex((p) => p.id === page.id);
    if (idx >= 0 && idx < doc.pages.length - 1) {
      targets.push(doc.pages[idx + 1].id);
    }
  }

  return targets;
}

/**
 * Hierarchical graph layout (left → right).
 * Each page is assigned a column (depth via BFS) and a row within that column.
 * Preserves drag positions from `prevNodes` when available.
 */
function computePositions(
  doc: FunnelDoc,
  prevNodes?: Node<PageNodeData>[],
): Map<string, { x: number; y: number }> {
  const pageIds = doc.pages.map((p) => p.id);

  // BFS to assign depth (column = x-level)
  const depthMap = new Map<string, number>();
  const queue: string[] = [];

  if (doc.pages.length > 0) {
    depthMap.set(doc.pages[0].id, 0);
    queue.push(doc.pages[0].id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const page = doc.pages.find((p) => p.id === id);
    if (!page) continue;
    const d = depthMap.get(id) ?? 0;
    for (const targetId of getTargets(page, doc)) {
      if (!depthMap.has(targetId)) {
        depthMap.set(targetId, d + 1);
        queue.push(targetId);
      }
    }
  }

  // Orphan pages (unreachable) get placed after the deepest reachable page
  let maxDepth = 0;
  depthMap.forEach((d) => { if (d > maxDepth) maxDepth = d; });
  let orphanDepth = maxDepth + 1;
  for (const id of pageIds) {
    if (!depthMap.has(id)) {
      depthMap.set(id, orphanDepth++);
    }
  }

  // Group by depth, preserve original order within each level
  const byDepth = new Map<number, string[]>();
  for (const id of pageIds) {
    const d = depthMap.get(id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }

  // Assign x/y positions; center each column vertically
  const posMap = new Map<string, { x: number; y: number }>();
  byDepth.forEach((ids, depth) => {
    const totalH = ids.length * NODE_H + (ids.length - 1) * V_GAP;
    ids.forEach((id: string, rowIdx: number) => {
      // Preserve drag position if already placed
      const prev = prevNodes?.find((n) => n.id === id);
      if (prev) {
        posMap.set(id, { x: prev.position.x, y: prev.position.y });
      } else {
        posMap.set(id, {
          x: depth * (NODE_W + H_GAP),
          y: rowIdx * (NODE_H + V_GAP) - totalH / 2 + totalH / 2,
        });
      }
    });
  });

  return posMap;
}

function buildNodes(doc: FunnelDoc, prevNodes?: Node<PageNodeData>[]): Node<PageNodeData>[] {
  const posMap = computePositions(doc, prevNodes);
  return doc.pages.map((page, i) => {
    const decisionBlock = page.nodes.find(
      (n): n is BlockNode => n.kind === 'block' && n.type === 'quest_decision',
    );
    const decisionOptions = (decisionBlock?.props.options as DecisionOption[]) ?? [];
    return {
      id: page.id,
      type: 'pageNode',
      position: posMap.get(page.id) ?? { x: i * (NODE_W + H_GAP), y: 0 },
      data: { page, pageIndex: i, decisionOptions },
    };
  });
}

function buildEdges(doc: FunnelDoc): Edge[] {
  const edges: Edge[] = [];

  doc.pages.forEach((page, pageIdx) => {
    const nextPage = doc.pages[pageIdx + 1];

    if (page.nextPageId) {
      edges.push({
        id: `next-${page.id}`,
        source: page.id,
        sourceHandle: 'next',
        target: page.nextPageId,
        targetHandle: 'in',
        type: 'deletable',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      });
    } else if (nextPage) {
      edges.push({
        id: `implicit-${page.id}`,
        source: page.id,
        sourceHandle: 'next',
        target: nextPage.id,
        targetHandle: 'in',
        type: 'smoothstep',
        style: { stroke: '#dde3ea', strokeWidth: 1.5, strokeDasharray: '6 4' },
        markerEnd: { type: MarkerType.Arrow, color: '#dde3ea' },
        deletable: false,
        selectable: false,
      });
    }

    const decisionBlock = page.nodes.find(
      (n): n is BlockNode => n.kind === 'block' && n.type === 'quest_decision',
    );
    if (decisionBlock) {
      const options = (decisionBlock.props.options as DecisionOption[]) ?? [];
      options.forEach((opt, i) => {
        if (opt.targetPageId) {
          const color = OPTION_COLORS[i % OPTION_COLORS.length];
          edges.push({
            id: `opt-${page.id}-${opt.id}`,
            source: page.id,
            sourceHandle: `opt-${opt.id}`,
            target: opt.targetPageId,
            targetHandle: 'in',
            type: 'deletable',
            label: opt.text || `Option ${i + 1}`,
            data: { color },
            style: { stroke: color, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
        }
      });
    }
  });

  return edges;
}

// ─── FlowView ─────────────────────────────────────────────────────────────────

export interface FlowViewProps {
  doc: FunnelDoc;
  onSelectPage: (pageId: string) => void;
  onUpdatePage: (pageId: string, patch: Partial<FunnelPage>) => void;
  onUpdateDecisionOption: (
    pageId: string,
    nodeId: string,
    optionId: string,
    targetPageId: string | undefined,
  ) => void;
  onAddPage?: () => void;
}

export default function FlowView({ doc, onSelectPage, onUpdatePage, onUpdateDecisionOption, onAddPage }: FlowViewProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PageNodeData>>(useMemo(() => buildNodes(doc), []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [edges, setEdges, onEdgesChange] = useEdgesState(useMemo(() => buildEdges(doc), []));

  // Sync when doc changes, preserving drag positions via prevNodes
  useEffect(() => {
    setNodes((prev) => buildNodes(doc, prev));
    setEdges(buildEdges(doc));
  }, [doc, setNodes, setEdges]);

  // Double-click node → switch to canvas for that page
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectPage(node.id);
    },
    [onSelectPage],
  );

  // Drag connection → update nextPageId or decision targetPageId
  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, sourceHandle, target } = connection;
      if (!source || !target || !sourceHandle) return;

      if (sourceHandle === 'next') {
        onUpdatePage(source, { nextPageId: target });
        return;
      }

      if (sourceHandle.startsWith('opt-')) {
        const optionId = sourceHandle.slice(4);
        const page = doc.pages.find((p) => p.id === source);
        const decisionBlock = page?.nodes.find(
          (n): n is BlockNode => n.kind === 'block' && n.type === 'quest_decision',
        );
        if (decisionBlock) {
          onUpdateDecisionOption(source, decisionBlock.id, optionId, target);
        }
      }
    },
    [doc, onUpdatePage, onUpdateDecisionOption],
  );

  // Delete edge → clear the corresponding connection
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deletedEdges) => {
      for (const edge of deletedEdges) {
        if (edge.sourceHandle === 'next') {
          onUpdatePage(edge.source, { nextPageId: undefined });
        } else if (edge.sourceHandle?.startsWith('opt-')) {
          const optionId = edge.sourceHandle.slice(4);
          const page = doc.pages.find((p) => p.id === edge.source);
          const decisionBlock = page?.nodes.find(
            (n): n is BlockNode => n.kind === 'block' && n.type === 'quest_decision',
          );
          if (decisionBlock) {
            onUpdateDecisionOption(edge.source, decisionBlock.id, optionId, undefined);
          }
        }
      }
    },
    [doc, onUpdatePage, onUpdateDecisionOption],
  );

  return (
    <div className="flex-1 h-full min-h-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
        deleteKeyCode="Backspace"
        edgesReconnectable={false}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e8ecf0" />
        <Controls showInteractive={false} className="!shadow-md !border-slate-200 !rounded-xl" />

        {/* Top-right: hints */}
        <Panel position="top-right">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 px-3 py-2 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <MousePointer2 size={11} />
              Doppelklick → Seite bearbeiten
            </div>
            <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#94a3b8" strokeWidth="2" /></svg>
                Explizit
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#dde3ea" strokeWidth="1.5" strokeDasharray="5 4" /></svg>
                Automatisch
              </span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5">
              <X size={10} className="text-red-400" />
              Verbindung anklicken → löschen
            </div>
          </div>
        </Panel>

        {/* Bottom-center: add page */}
        {onAddPage && (
          <Panel position="bottom-center">
            <button
              onClick={onAddPage}
              className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl shadow-md border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 hover:shadow-violet-100 transition-all"
            >
              <Plus size={13} /> Neue Seite
            </button>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
