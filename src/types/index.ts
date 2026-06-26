export type CellValue = string | number | boolean | null | undefined;

export type SheetRows = CellValue[][];

export type RequiredFileKey = "monster" | "spawn" | "level" | "text" | "gem" | "skin" | "skill" | "entry";

export type MatchedFile = {
  key: RequiredFileKey;
  label: string;
  fileName: string;
  relativePath: string;
  file?: File;
};

export type MonsterInfo = {
  monster_id: number;
  model_id: number | null;
  type: number;
  type_name: string;
  name_id: number | null;
  raw_name: string;
  name: string;
  description_id: number | null;
  raw_description: string;
  description: string;
  model_name: string;
  frame_resource: string;
  waves: Array<{ wave: number | null; wave_type: number | null; count: number | null }>;
  total_count: number;
};

export type LevelRecord = {
  stage_key: string;
  stage_no: number;
  level_id: number;
  level_label: string;
  level_name: string;
  level_label_name: string;
  raw_level_name: string;
  raw_level_label: string;
  source_remark: string;
  monsters: {
    small: MonsterInfo[];
    elite: MonsterInfo[];
    boss: MonsterInfo[];
  };
};

export type LookupData = {
  byStage: Record<string, LevelRecord>;
  byLevelId: Record<string, LevelRecord>;
  duplicateStages: Record<string, number>;
};

export type GemRecord = {
  item_id: number;
  name: string;
  part: string;
  part_id: number | string;
  quality: string;
  quality_id: number | string;
  season: string;
  season_id: number | string | null;
  gem_type: number | string;
  effect: string;
  refine_weight: number;
  refine_weight_source: string;
  refine_pool_total: number;
  refine_probability: number;
  attribute_id: number | string | null;
  attribute_type: number | string | null;
  attribute_value: number | string | null;
  power: number | string | null;
};

export type GemLookup = {
  records: GemRecord[];
  parts: Array<{ id: string; name: string; pool_total: number; type_count: number; record_count: number }>;
  qualities: Array<{ id: string; name: string; record_count: number }>;
  seasons: Array<{ id: string; name: string; record_count: number }>;
};

export type SkinCategoryKey = "person" | "core" | "wall" | "personChroma" | "coreChroma" | "wallChroma";

export type SkinLevel = {
  level: number | string;
  effect_name: string;
  effect: string;
};

export type SkinReference = {
  skin_id: number;
  category: SkinCategoryKey | null;
  name: string;
};

export type SkinImageAsset = {
  label: string;
  name: string;
};

export type SkinRecord = {
  category: SkinCategoryKey;
  name: string;
  skin_id: number;
  item_id: number | null;
  skill_name: string;
  image_assets: SkinImageAsset[];
  prerequisite_skins: SkinReference[];
  levels: SkinLevel[];
};

export type SkinLookupData = Record<SkinCategoryKey, SkinRecord[]>;

export type EntryCondition = {
  type: number | string;
  target_id: number | string | null;
  count: number | string | null;
  text: string;
  alternatives?: EntryCondition[];
};

export type EntryRecord = {
  group_id: number;
  entry_id: number;
  name_id: number | null;
  name: string;
  description_id: number | null;
  description: string;
  skill_id: number | null;
  skill_name: string;
  prerequisites: EntryCondition[];
  conflicts: EntryCondition[];
};

export type EntryLookupData = {
  records: EntryRecord[];
};

export type AppTab = "levels" | "gems" | "skins" | "entries";

export type LoadState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };
