import { count, eq } from 'drizzle-orm';
import { getCardsModuleTemplate } from '../shared/templates';
import { db } from './db/index.ts';
import { cardColumn, wrkspaceModule } from './db/schema.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import { getWrkspaceAccess, requireWrkspaceCapability } from './authorization.ts';
import { applyCardsModuleTemplate } from './templates.ts';

async function requireManageModulesAccess(userId: string, teamSlug: string, wrkspaceSlug: string) {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return undefined;
	try {
		requireWrkspaceCapability(access, 'manage_modules');
	} catch {
		return undefined;
	}
	return {
		wrkspaceId: access.wrkspaceId,
		teamSlug: access.teamSlug,
		wrkspaceSlug: access.wrkspaceSlug
	};
}

export async function isCardsModuleConfigured(moduleId: string): Promise<boolean> {
	const [moduleRow] = await db
		.select({ creationTemplateId: wrkspaceModule.creationTemplateId })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);

	if (moduleRow?.creationTemplateId) return true;

	const [columnCountRow] = await db
		.select({ value: count() })
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId));

	return Number(columnCountRow?.value ?? 0) > 0;
}

export type SetupCardsModuleOptions = {
	includeSampleContent?: boolean;
};

export async function setupCardsModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	templateId: string,
	options?: SetupCardsModuleOptions
): Promise<{ ok: true } | { ok: false; error: string }> {
	const resolved = await requireManageModulesAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return { ok: false, error: 'Not authorized' };

	const template = getCardsModuleTemplate(templateId);
	if (!template) return { ok: false, error: 'Unknown board preset' };

	const configured = await isCardsModuleConfigured(moduleId);
	if (configured) return { ok: false, error: 'Board is already configured' };

	const applied = await applyCardsModuleTemplate(moduleId, templateId, {
		includeSampleContent: options?.includeSampleContent ?? true
	});

	if (!applied) return { ok: false, error: 'Could not set up board' };

	const ctx = await getModuleContext(moduleId);
	if (ctx) {
		await recordActivity({
			wrkspaceId: resolved.wrkspaceId,
			actorUserId: userId,
			type: 'card.board_configured',
			moduleId,
			moduleType: 'cards',
			targetType: 'module',
			targetId: moduleId,
			metadata: {
				title: template.name,
				templateId,
				includeSampleContent: options?.includeSampleContent ?? true
			}
		});
	}

	return { ok: true };
}

export function parseSetupCardsFromForm(formData: FormData): {
	templateId: string;
	includeSampleContent: boolean;
} | null {
	const templateId = formData.get('templateId')?.toString()?.trim() ?? '';
	if (!templateId) return null;
	const includeSampleContent = formData.get('includeSampleContent')?.toString() !== 'false';
	return { templateId, includeSampleContent };
}
