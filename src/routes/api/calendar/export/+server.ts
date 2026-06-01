import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildCalendarIcsExport, getModuleForUser } from '$lib/server/modules';

function safeFilename(name: string): string {
	const base = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return base || 'calendar';
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const teamSlug = url.searchParams.get('teamSlug')?.trim() ?? '';
	const wrkspaceSlug = url.searchParams.get('wrkspaceSlug')?.trim() ?? '';
	const moduleId = url.searchParams.get('moduleId')?.trim() ?? '';

	if (!teamSlug || !wrkspaceSlug || !moduleId) {
		error(400, 'teamSlug, wrkspaceSlug, and moduleId are required');
	}

	const mod = await getModuleForUser(locals.user.id, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') {
		error(404, 'Calendar not found');
	}

	const ics = await buildCalendarIcsExport(locals.user.id, teamSlug, wrkspaceSlug, moduleId);
	if (ics === null) {
		error(404, 'Calendar not found');
	}

	const filename = `${safeFilename(mod.title)}.ics`;

	return new Response(ics, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
