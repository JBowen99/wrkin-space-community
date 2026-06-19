/** URL paths that use the authenticated app shell (not the marketing layout). */
export function isAppShellPath(pathname: string): boolean {
	return pathname === '/teams' || pathname.startsWith('/teams/');
}

export function isAdminShellPath(pathname: string): boolean {
	return pathname === '/admin' || pathname.startsWith('/admin/');
}
