import { MODULE_CATALOG, type ModuleType } from '$lib/shared/modules';

/** Community module catalog — cloud-only modules (e.g. OKRs) are omitted. */
export const COMMUNITY_MODULE_CATALOG = MODULE_CATALOG.filter((entry) => entry.type !== 'okrs');

export type CommunityModuleType = Exclude<ModuleType, 'okrs'>;

export function isCommunityModuleType(value: string): value is CommunityModuleType {
	return COMMUNITY_MODULE_CATALOG.some((entry) => entry.type === value);
}
