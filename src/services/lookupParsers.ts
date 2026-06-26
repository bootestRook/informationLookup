import { REQUIRED_FILES } from '../config/requiredFiles';
import { buildEntryLookupData } from '../features/entries/buildEntryLookupData';
import { buildGemLookup } from '../features/gems/buildGemLookup';
import { buildLevelMonsters, buildLookupData, buildMonsterMap } from '../features/levels/buildLevelLookupData';
import { buildSkinLookupData } from '../features/skins/buildSkinLookupData';
import { EntryLookupData, GemLookup, LookupData, MatchedFile, RequiredFileKey, SkinLookupData } from '../types';
import { buildTextMap } from '../utils/excel';
import { readWorkbook } from './workbook';

export async function parseLookup(files: MatchedFile[]): Promise<LookupData> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  for (const required of REQUIRED_FILES) {
    if (!byKey[required.key]?.file) {
      throw new Error(`缺少可读取文件：${required.fileName}`);
    }
  }
  const [textWorkbook, monsterWorkbook, spawnWorkbook, levelWorkbook] = await Promise.all([
    readWorkbook(byKey.text.file!),
    readWorkbook(byKey.monster.file!),
    readWorkbook(byKey.spawn.file!),
    readWorkbook(byKey.level.file!),
  ]);

  const textMap = buildTextMap(textWorkbook);
  const monsterMap = buildMonsterMap(monsterWorkbook, textMap);
  const levelMonsters = buildLevelMonsters(spawnWorkbook, monsterMap);
  return buildLookupData(levelWorkbook, textMap, levelMonsters);
}

export async function parseGemLookup(files: MatchedFile[]): Promise<GemLookup> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  if (!byKey.text?.file || !byKey.gem?.file) {
    throw new Error("缺少可读取文件：宝石配置表.xlsx 或 文本配置表-一般表格.xlsx");
  }
  const [textWorkbook, gemWorkbook] = await Promise.all([readWorkbook(byKey.text.file), readWorkbook(byKey.gem.file)]);
  return buildGemLookup(gemWorkbook, buildTextMap(textWorkbook));
}

export async function parseSkinLookup(files: MatchedFile[]): Promise<SkinLookupData> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  if (!byKey.text?.file || !byKey.skin?.file || !byKey.skill?.file) {
    throw new Error("缺少可读取文件：T5皮肤配置表.xlsx、源素表结构.xlsx 或 文本配置表-一般表格.xlsx");
  }
  const [textWorkbook, skinWorkbook, skillWorkbook] = await Promise.all([readWorkbook(byKey.text.file), readWorkbook(byKey.skin.file), readWorkbook(byKey.skill.file)]);
  return buildSkinLookupData(skinWorkbook, skillWorkbook, buildTextMap(textWorkbook));
}

export async function parseEntryLookup(files: MatchedFile[]): Promise<EntryLookupData> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  if (!byKey.text?.file || !byKey.entry?.file || !byKey.skill?.file) {
    throw new Error("缺少可读取文件：随机词条库配置表.xlsx、源素表结构.xlsx 或 文本配置表-一般表格.xlsx");
  }
  const [textWorkbook, entryWorkbook, skillWorkbook] = await Promise.all([readWorkbook(byKey.text.file), readWorkbook(byKey.entry.file), readWorkbook(byKey.skill.file)]);
  return buildEntryLookupData(entryWorkbook, skillWorkbook, buildTextMap(textWorkbook));
}
