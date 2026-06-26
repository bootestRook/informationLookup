import { AppTab } from '../types';

export function tabLabel(tab: AppTab): string {
  if (tab === "levels") return "关卡信息";
  if (tab === "gems") return "宝石信息";
  if (tab === "skins") return "皮肤信息";
  return "局内词条";
}

export function tabHeading(tab: AppTab): string {
  if (tab === "levels") return "快速查看第 X 关怪物配置";
  if (tab === "gems") return "检索宝石效果、部位、品质和洗练概率";
  if (tab === "skins") return "检索皮肤名称、道具ID、技能和升星效果";
  return "检索 2001 组局内词条的前置和互斥关系";
}

export function searchPlaceholder(tab: AppTab): string {
  if (tab === "levels") return "输入第几关、关卡名或怪物名";
  if (tab === "gems") return "输入宝石效果、部位、品质、赛季或道具ID";
  if (tab === "skins") return "输入皮肤名称、技能或道具ID";
  return "输入词条名、描述、词条ID、前置或互斥条件";
}
