import { CellValue, SheetRows } from '../types';
import * as XLSX from 'xlsx';

export function normalizeId(value: CellValue): number | string | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const text = String(value).trim();
  if (!text) return null;
  const numberValue = Number(text);
  if (Number.isFinite(numberValue) && Number.isInteger(numberValue)) return numberValue;
  return text;
}

export function toText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function stripRichText(value: CellValue): string {
  return toText(value).replace(/<[^>]+>/g, "").trim();
}

export function stripLevelPrefix(value: CellValue): string {
  return stripRichText(value).replace(/^\s*\d+\s*[.。．、-]\s*/, "").trim();
}

export function headerIndex(rows: SheetRows): Record<string, number> {
  const firstRow = rows[0] ?? [];
  return Object.fromEntries(firstRow.map((cell, index) => [toText(cell), index]).filter(([key]) => key));
}

export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): SheetRows {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, defval: null, raw: true });
}

export function buildTextMap(workbook: XLSX.WorkBook): Map<number, string> {
  const textMap = new Map<number, string>();
  for (const sheetName of ["表格文本", "深渊文本"]) {
    const rows = getSheetRows(workbook, sheetName);
    const index = headerIndex(rows);
    for (const row of rows.slice(1)) {
      const id = normalizeId(row[index["索引ID"]]);
      const text = toText(row[index["内容_简体"]]);
      if (typeof id === "number" && text) textMap.set(id, text);
    }
  }
  return textMap;
}

export function asNumberValue(value: CellValue): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function displaySeason(value: CellValue): { season: string; season_id: number | string | null } {
  const seasonId = normalizeId(value);
  if (seasonId === null || seasonId === "") return { season: "全赛季", season_id: null };
  return { season: `赛季${seasonId}`, season_id: seasonId };
}

export function fillTemplate(template: string, params: string[]): string {
  return stripRichText(template).replace(/\{(\d+)\}/g, (_match, index) => params[Number(index)] ?? "");
}

export function activeRefineWeight(weights: { normal: number; season: number } | undefined): { weight: number; source: string } {
  if (!weights) return { weight: 0, source: "洗练权重" };
  if (weights.normal > 0) return { weight: weights.normal, source: "洗练权重" };
  return { weight: weights.season, source: "赛季洗练权重" };
}

export function sheetObjects(workbook: XLSX.WorkBook, sheetName: string): Array<Record<string, CellValue>> {
  const rows = getSheetRows(workbook, sheetName);
  const headers = (rows[0] ?? []).map((cell) => toText(cell));
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]).filter(([header]) => header)));
}

export function textById(textMap: Map<number, string>, value: CellValue): string {
  const id = normalizeId(value);
  if (typeof id !== "number") return "";
  return stripRichText(textMap.get(id) || `[文本表未找到:${id}]`);
}
