import { RequiredFileKey } from '../types';

export const REQUIRED_FILES: Array<{ key: RequiredFileKey; label: string; fileName: string }> = [
  { key: "monster", label: "怪物配置", fileName: "怪物配置表.xlsx" },
  { key: "spawn", label: "主线刷怪", fileName: "T5怪物刷新配置表-2主线关卡.xlsx" },
  { key: "level", label: "关卡配置", fileName: "T5关卡配置表.xlsx" },
  { key: "text", label: "文本配置", fileName: "文本配置表-一般表格.xlsx" },
  { key: "gem", label: "宝石配置", fileName: "宝石配置表.xlsx" },
  { key: "skin", label: "皮肤配置", fileName: "T5皮肤配置表.xlsx" },
  { key: "skill", label: "源素配置", fileName: "源素表结构.xlsx" },
  { key: "entry", label: "局内词条", fileName: "随机词条库配置表.xlsx" },
];
