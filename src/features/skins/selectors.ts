import { SKIN_CATEGORIES } from '../../config/skinCategories';
import { SkinLookupData } from '../../types';

export function skinTotal(lookup: SkinLookupData | null): number {
  return lookup ? SKIN_CATEGORIES.reduce((sum, category) => sum + lookup[category.key].length, 0) : 0;
}
