import { type PointerEvent, useRef, useState } from 'react';
import { EntryRecord } from '../../types';
import { EntryGraphCard } from './EntryGraphCard';
import { EntryGraphEdges } from './EntryGraphEdges';
import { buildEntryGraphLayout, entryGraphColumnGap, entryGraphLabelHeight, entryGraphNodeHeight, entryGraphNodeWidth, EntryNodePositions, highlightedEntryIds, SelectedEntryEdge } from './entryGraphLayout';

type EntrySkillGraphProps = {
  availableEntryIds: Set<number>;
  records: EntryRecord[];
  selectedEntryId: number | null;
  onOpenEntry: (entryId: number) => void;
};

export function EntrySkillGraph({ records, selectedEntryId, availableEntryIds, onOpenEntry }: EntrySkillGraphProps) {
  const [selectedEdge, setSelectedEdge] = useState<SelectedEntryEdge | null>(null);
  const [nodePositions, setNodePositions] = useState<EntryNodePositions>({});
  const graphRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const nodeDragRef = useRef<{ pointerId: number; entryId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressCardClickRef = useRef<number | null>(null);
  const layout = buildEntryGraphLayout(records, nodePositions);
  const highlightedNodeIds = highlightedEntryIds(selectedEdge, selectedEntryId, layout.allEdges);
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  function startGraphDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".entry-graph-card, .entry-condition-chip, .entry-edge, .entry-edge-hit, .entry-or-node, button")) return;
    const graph = graphRef.current;
    if (!graph) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: graph.scrollLeft,
      top: graph.scrollTop,
    };
    graph.setPointerCapture(event.pointerId);
    graph.classList.add("dragging");
  }

  function moveGraphDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const graph = graphRef.current;
    if (!drag || !graph || drag.pointerId !== event.pointerId) return;
    graph.scrollLeft = drag.left - (event.clientX - drag.x);
    graph.scrollTop = drag.top - (event.clientY - drag.y);
  }

  function endGraphDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const graph = graphRef.current;
    if (!drag || !graph || drag.pointerId !== event.pointerId) return;
    if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId);
    graph.classList.remove("dragging");
    dragRef.current = null;
  }

  function startNodeDrag(event: PointerEvent<HTMLDivElement>, entryId: number) {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".entry-condition-chip, button")) return;
    const node = layout.nodeById.get(entryId);
    if (!node) return;
    event.stopPropagation();
    nodeDragRef.current = {
      pointerId: event.pointerId,
      entryId,
      x: event.clientX,
      y: event.clientY,
      startX: node.x,
      startY: node.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("dragging");
  }

  function moveNodeDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const nextX = clamp(drag.startX + dx, 0, Math.max(0, layout.canvasWidth - entryGraphNodeWidth));
    const nextY = clamp(drag.startY + dy, entryGraphLabelHeight, Math.max(entryGraphLabelHeight, layout.canvasHeight - entryGraphNodeHeight));
    setNodePositions((positions) => ({ ...positions, [drag.entryId]: { x: nextX, y: nextY } }));
  }

  function endNodeDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.classList.remove("dragging");
    if (drag.moved) suppressCardClickRef.current = drag.entryId;
    nodeDragRef.current = null;
  }

  return (
    <section ref={graphRef} className="entry-skill-graph" aria-label="技能词条整图" onPointerDown={startGraphDrag} onPointerMove={moveGraphDrag} onPointerUp={endGraphDrag} onPointerCancel={endGraphDrag}>
      <div className="entry-skill-canvas" style={{ width: layout.canvasWidth, height: layout.canvasHeight }}>
        <EntryGraphEdges layout={layout} selectedEdge={selectedEdge} selectedEntryId={selectedEntryId} onSelectEdge={setSelectedEdge} />
        {layout.orderedColumns.map(([column], index) => (
          <span key={`label-${column}`} className="entry-graph-label entry-column-label" style={{ left: index * (entryGraphNodeWidth + entryGraphColumnGap), top: 0 }}>
            {column === 0 ? "基础" : `第${column + 1}层`}
          </span>
        ))}
        {layout.orGroups.map((group, index) => {
          const to = layout.nodeById.get(group.to)!;
          return (
            <span key={`or-label-${index}-${group.to}`} className="entry-or-node" style={{ left: to.x - Math.max(36, entryGraphColumnGap / 2) - 12, top: to.y + entryGraphNodeHeight / 2 - 12 }}>
              或
            </span>
          );
        })}
        {[...layout.nodeById.values()].map(({ record, x, y }) => (
          <div
            key={record.entry_id}
            className="entry-node-position"
            style={{ left: x, top: y, width: entryGraphNodeWidth, height: entryGraphNodeHeight }}
            onPointerDown={(event) => startNodeDrag(event, record.entry_id)}
            onPointerMove={moveNodeDrag}
            onPointerUp={endNodeDrag}
            onPointerCancel={endNodeDrag}
            onClickCapture={(event) => {
              if (suppressCardClickRef.current !== record.entry_id) return;
              suppressCardClickRef.current = null;
              event.stopPropagation();
            }}
          >
            <EntryGraphCard
              record={record}
              selected={record.entry_id === selectedEntryId}
              edgeSelected={highlightedNodeIds.has(record.entry_id) && record.entry_id !== selectedEntryId}
              availableEntryIds={availableEntryIds}
              onOpenEntry={(entryId) => {
                setSelectedEdge(null);
                onOpenEntry(entryId);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
