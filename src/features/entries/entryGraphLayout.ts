import { EntryCondition, EntryRecord } from '../../types';

export type EntryGraphEdge = { from: number; to: number };
export type SelectedEntryEdge = EntryGraphEdge & { type: 'pre' | 'conflict' };
export type EntryGraphNode = { record: EntryRecord; x: number; y: number };
export type EntryNodePositions = Record<number, { x: number; y: number }>;
export type EntryOrGroup = { to: number; froms: number[] };

export const entryGraphNodeWidth = 250;
export const entryGraphNodeHeight = 162;
export const entryGraphColumnGap = 118;
export const entryGraphRowGap = 28;
export const entryGraphLabelHeight = 34;

export type EntryGraphLayout = {
  allEdges: EntryGraphEdge[];
  canvasHeight: number;
  canvasWidth: number;
  conflictEdges: EntryGraphEdge[];
  nodeById: Map<number, EntryGraphNode>;
  orderedColumns: Array<readonly [number, EntryRecord[]]>;
  orGroups: EntryOrGroup[];
  visualPrerequisiteEdges: EntryGraphEdge[];
};

export function buildEntryGraphLayout(records: EntryRecord[], nodePositions: EntryNodePositions): EntryGraphLayout {
  const recordsById = new Map(records.map((record) => [record.entry_id, record]));
  const depthById = new Map<number, number>();

  function graphConditionEntryIds(condition: EntryCondition): number[] {
    if (condition.type === 2 && typeof condition.target_id === "number" && recordsById.has(condition.target_id)) return [condition.target_id];
    return condition.alternatives?.flatMap(graphConditionEntryIds) ?? [];
  }

  function depth(record: EntryRecord, stack = new Set<number>()): number {
    const cached = depthById.get(record.entry_id);
    if (cached !== undefined) return cached;
    if (stack.has(record.entry_id)) return 0;
    stack.add(record.entry_id);
    const prereqDepths = record.prerequisites
      .flatMap((condition) => graphConditionEntryIds(condition))
      .map((entryId) => recordsById.get(entryId) ?? null)
      .filter((prereq): prereq is EntryRecord => Boolean(prereq))
      .map((prereq) => depth(prereq, new Set(stack)) + 1);
    const value = Math.min(Math.max(0, ...prereqDepths), 5);
    depthById.set(record.entry_id, value);
    return value;
  }

  const columns = new Map<number, EntryRecord[]>();
  for (const record of records) {
    const recordDepth = depth(record);
    if (!columns.has(recordDepth)) columns.set(recordDepth, []);
    columns.get(recordDepth)!.push(record);
  }

  const orderedColumns = [...columns.entries()]
    .sort(([left], [right]) => left - right)
    .map(([column, columnRecords]) => [column, columnRecords.sort((left, right) => left.entry_id - right.entry_id)] as const);
  const maxRows = Math.max(1, ...orderedColumns.map(([, columnRecords]) => columnRecords.length));
  const bodyHeight = maxRows * entryGraphNodeHeight + Math.max(0, maxRows - 1) * entryGraphRowGap;
  const columnIndexByDepth = new Map(orderedColumns.map(([column], index) => [column, index]));
  const nodeById = new Map<number, EntryGraphNode>();

  for (const [column, columnRecords] of orderedColumns) {
    const columnIndex = columnIndexByDepth.get(column) ?? 0;
    const columnHeight = columnRecords.length * entryGraphNodeHeight + Math.max(0, columnRecords.length - 1) * entryGraphRowGap;
    const columnOffset = column === 0 ? Math.max(0, (bodyHeight - columnHeight) / 2) : 0;
    columnRecords.forEach((record, rowIndex) => {
      const savedPosition = nodePositions[record.entry_id];
      nodeById.set(record.entry_id, {
        record,
        x: savedPosition?.x ?? columnIndex * (entryGraphNodeWidth + entryGraphColumnGap),
        y: savedPosition?.y ?? entryGraphLabelHeight + columnOffset + rowIndex * (entryGraphNodeHeight + entryGraphRowGap),
      });
    });
  }

  const layoutWidth = Math.max(1, orderedColumns.length) * entryGraphNodeWidth + Math.max(0, orderedColumns.length - 1) * entryGraphColumnGap;
  const canvasWidth = layoutWidth + 520;
  const canvasHeight = entryGraphLabelHeight + bodyHeight;
  const prerequisiteEdges = records.flatMap((record) =>
    record.prerequisites
      .flatMap((condition) => graphConditionEntryIds(condition).map((entryId) => ({ from: entryId, to: record.entry_id })))
      .filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
  );
  const visualPrerequisiteEdges = records.flatMap((record) =>
    record.prerequisites
      .filter((condition) => !condition.alternatives?.length)
      .flatMap((condition) => graphConditionEntryIds(condition).map((entryId) => ({ from: entryId, to: record.entry_id })))
      .filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
  );
  const orGroups = records.flatMap((record) =>
    record.prerequisites
      .filter((condition) => condition.alternatives?.length)
      .map((condition) => ({ to: record.entry_id, froms: graphConditionEntryIds(condition).filter((entryId) => nodeById.has(entryId)) }))
      .filter((group) => group.froms.length > 1 && nodeById.has(group.to)),
  );
  const conflictEdges = records.flatMap((record) =>
    record.conflicts
      .flatMap((condition) => graphConditionEntryIds(condition).map((entryId) => ({ from: entryId, to: record.entry_id })))
      .filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
  );

  return { allEdges: [...prerequisiteEdges, ...conflictEdges], canvasHeight, canvasWidth, conflictEdges, nodeById, orderedColumns, orGroups, visualPrerequisiteEdges };
}

export function highlightedEntryIds(selectedEdge: SelectedEntryEdge | null, selectedEntryId: number | null, allEdges: EntryGraphEdge[]): Set<number> {
  const highlighted = new Set<number>();
  if (selectedEdge) {
    highlighted.add(selectedEdge.from);
    highlighted.add(selectedEdge.to);
    return highlighted;
  }
  if (selectedEntryId === null) return highlighted;
  for (const edge of allEdges) {
    if (edge.from === selectedEntryId || edge.to === selectedEntryId) {
      highlighted.add(edge.from);
      highlighted.add(edge.to);
    }
  }
  return highlighted;
}
