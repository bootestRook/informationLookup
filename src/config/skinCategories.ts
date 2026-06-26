import { SkinCategoryKey } from '../types';

export const SKIN_CATEGORIES: Array<{ key: SkinCategoryKey; label: string; configSheet: string; levelSheet: string; withPrerequisite: boolean }> = [
  { key: "person", label: "人物皮肤", configSheet: "人物皮肤配置表", levelSheet: "人物皮肤升星配置", withPrerequisite: false },
  { key: "core", label: "核心皮肤", configSheet: "核心皮肤配置表", levelSheet: "核心皮肤升星配置", withPrerequisite: false },
  { key: "wall", label: "城墙皮肤", configSheet: "城墙皮肤配置表", levelSheet: "城墙皮肤升星配置", withPrerequisite: false },
  { key: "personChroma", label: "人物炫彩皮肤", configSheet: "时装炫彩配置表", levelSheet: "时装炫彩升星配置", withPrerequisite: true },
  { key: "coreChroma", label: "核心炫彩皮肤", configSheet: "核心炫彩配置表", levelSheet: "核心炫彩升星配置", withPrerequisite: true },
  { key: "wallChroma", label: "城墙炫彩皮肤", configSheet: "城墙炫彩配置表", levelSheet: "城墙炫彩升星配置表", withPrerequisite: true },
];
