import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { getS3Config } from './config';

let client: S3Client | null = null;

function getClient(): S3Client {
	if (client) return client;
	const config = getS3Config();
	client = new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey
		},
		forcePathStyle: config.forcePathStyle
	});
	return client;
}

export async function putObject(
	key: string,
	body: Buffer | Uint8Array,
	contentType: string
): Promise<void> {
	const { bucket } = getS3Config();
	await getClient().send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType
		})
	);
}

export async function getObject(key: string): Promise<{ body: Buffer; contentType: string }> {
	const { bucket } = getS3Config();
	const response = await getClient().send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key
		})
	);

	if (!response.Body) {
		throw new Error('Object not found');
	}

	const bytes = await response.Body.transformToByteArray();
	return {
		body: Buffer.from(bytes),
		contentType: response.ContentType ?? 'application/octet-stream'
	};
}

export async function deleteObject(key: string): Promise<void> {
	const { bucket } = getS3Config();
	await getClient().send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: key
		})
	);
}

export async function objectExists(key: string): Promise<boolean> {
	const { bucket } = getS3Config();
	try {
		await getClient().send(
			new HeadObjectCommand({
				Bucket: bucket,
				Key: key
			})
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * Cheap reachability + permission probe for the configured bucket.
 * Used by /api/health/ready.
 */
export async function pingBucket(): Promise<void> {
	const { bucket } = getS3Config();
	await getClient().send(new HeadBucketCommand({ Bucket: bucket }));
}
