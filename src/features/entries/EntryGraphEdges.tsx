import { Fragment } from 'react';
import { entryGraphColumnGap, entryGraphNodeHeight, entryGraphNodeWidth, EntryGraphLayout, SelectedEntryEdge } from './entryGraphLayout';

type EntryGraphEdgesProps = {
  layout: EntryGraphLayout;
  selectedEdge: SelectedEntryEdge | null;
  selectedEntryId: number | null;
  onSelectEdge: (edge: SelectedEntryEdge) => void;
};

export function EntryGraphEdges({ layout, selectedEdge, selectedEntryId, onSelectEdge }: EntryGraphEdgesProps) {
  const { canvasHeight, canvasWidth, conflictEdges, nodeById, orGroups, visualPrerequisiteEdges } = layout;

  return (
    <svg className="entry-graph-lines" width={canvasWidth} height={canvasHeight} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} aria-hidden="true">
      <defs>
        <marker id="entry-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" />
        </marker>
        <marker id="entry-arrow-conflict" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" />
        </marker>
      </defs>

      {visualPrerequisiteEdges.map((edge, index) => {
        const from = nodeById.get(edge.from)!;
        const to = nodeById.get(edge.to)!;
        const active = selectedEdge?.type === 'pre' && selectedEdge.from === edge.from && selectedEdge.to === edge.to ? true : !selectedEdge && selectedEntryId !== null && (selectedEntryId === edge.from || selectedEntryId === edge.to);
        const startX = from.x + entryGraphNodeWidth;
        const startY = from.y + entryGraphNodeHeight / 2;
        const endX = to.x;
        const endY = to.y + entryGraphNodeHeight / 2;
        const midX = startX + Math.max(24, (endX - startX) / 2);
        const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 8} ${endY}`;
        return (
          <Fragment key={`pre-${index}-${edge.from}-${edge.to}`}>
            <path className="entry-edge-hit" d={d} onClick={() => onSelectEdge({ ...edge, type: 'pre' })} />
            <path className={active ? 'entry-edge active selectable' : 'entry-edge selectable'} d={d} markerEnd="url(#entry-arrow)" onClick={() => onSelectEdge({ ...edge, type: 'pre' })} />
          </Fragment>
        );
      })}

      {orGroups.map((group, groupIndex) => {
        const to = nodeById.get(group.to)!;
        const orX = to.x - Math.max(36, entryGraphColumnGap / 2);
        const orY = to.y + entryGraphNodeHeight / 2;
        const active = !selectedEdge && selectedEntryId === group.to;
        return (
          <Fragment key={`or-${groupIndex}-${group.to}`}>
            {group.froms.map((fromId) => {
              const from = nodeById.get(fromId)!;
              const startX = from.x + entryGraphNodeWidth;
              const startY = from.y + entryGraphNodeHeight / 2;
              const midX = startX + Math.max(24, (orX - startX) / 2);
              const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${orY}, ${orX - 12} ${orY}`;
              return (
                <Fragment key={`or-in-${fromId}-${group.to}`}>
                  <path className="entry-edge-hit" d={d} onClick={() => onSelectEdge({ from: fromId, to: group.to, type: 'pre' })} />
                  <path className={active ? 'entry-edge active selectable' : 'entry-edge selectable'} d={d} onClick={() => onSelectEdge({ from: fromId, to: group.to, type: 'pre' })} />
                </Fragment>
              );
            })}
            <path className={active ? 'entry-edge active selectable' : 'entry-edge selectable'} d={`M ${orX + 12} ${orY} L ${to.x - 8} ${orY}`} markerEnd="url(#entry-arrow)" onClick={() => onSelectEdge({ from: group.froms[0], to: group.to, type: 'pre' })} />
          </Fragment>
        );
      })}

      {conflictEdges.map((edge, index) => {
        const from = nodeById.get(edge.from)!;
        const to = nodeById.get(edge.to)!;
        const active = selectedEdge?.type === 'conflict' && selectedEdge.from === edge.from && selectedEdge.to === edge.to ? true : !selectedEdge && selectedEntryId !== null && (selectedEntryId === edge.from || selectedEntryId === edge.to);
        const startX = from.x + entryGraphNodeWidth;
        const startY = from.y + entryGraphNodeHeight / 2;
        const endX = to.x;
        const endY = to.y + entryGraphNodeHeight / 2;
        const midX = startX + Math.max(24, (endX - startX) / 2);
        const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 8} ${endY}`;
        return (
          <Fragment key={`conflict-${index}-${edge.from}-${edge.to}`}>
            <path className="entry-edge-hit" d={d} onClick={() => onSelectEdge({ ...edge, type: 'conflict' })} />
            <path className={active ? 'entry-edge conflict active selectable' : 'entry-edge conflict selectable'} d={d} markerEnd="url(#entry-arrow-conflict)" onClick={() => onSelectEdge({ ...edge, type: 'conflict' })} />
          </Fragment>
        );
      })}
    </svg>
  );
}
