/** Marketing, landing, and auth-form routes that should render when the database is unavailable. */
export function isDbOptionalPath(pathname: string): boolean {
	if (pathname === '/') return true;
	if (pathname === '/login' || pathname === '/logout') return true;

	const prefixes = ['/about', '/contact', '/privacy', '/terms', '/docs'];
	return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
