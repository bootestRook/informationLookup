import * as XLSX from 'xlsx';

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer();
  return XLSX.read(data, { type: "array" });
}
