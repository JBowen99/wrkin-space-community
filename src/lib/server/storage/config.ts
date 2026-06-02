import { env } from '$env/dynamic/private';

export type S3Config = {
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	forcePathStyle: boolean;
};

let cached: S3Config | null = null;

export function getS3Config(): S3Config {
	if (cached) return cached;

	const endpoint = env.S3_ENDPOINT?.trim();
	const region = env.S3_REGION?.trim();
	const accessKeyId = env.S3_ACCESS_KEY?.trim();
	const secretAccessKey = env.S3_SECRET_KEY?.trim();
	const bucket = env.S3_BUCKET?.trim();
	const forcePathStyleRaw = env.S3_FORCE_PATH_STYLE?.trim();

	const missing: string[] = [];
	if (!endpoint) missing.push('S3_ENDPOINT');
	if (!region) missing.push('S3_REGION');
	if (!accessKeyId) missing.push('S3_ACCESS_KEY');
	if (!secretAccessKey) missing.push('S3_SECRET_KEY');
	if (!bucket) missing.push('S3_BUCKET');
	if (!forcePathStyleRaw) missing.push('S3_FORCE_PATH_STYLE');

	if (missing.length > 0) {
		throw new Error(
			`Missing required S3 environment variables: ${missing.join(', ')}. Start MinIO with "pnpm db:start" and copy .env.example.`
		);
	}

	const forcePathStyle = forcePathStyleRaw === 'true' || forcePathStyleRaw === '1';
	if (!forcePathStyle && forcePathStyleRaw !== 'false' && forcePathStyleRaw !== '0') {
		throw new Error('S3_FORCE_PATH_STYLE must be "true" or "false"');
	}

	cached = {
		endpoint: endpoint!,
		region: region!,
		accessKeyId: accessKeyId!,
		secretAccessKey: secretAccessKey!,
		bucket: bucket!,
		forcePathStyle
	};
	return cached;
}
