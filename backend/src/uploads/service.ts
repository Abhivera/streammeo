import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadServiceConfig = {
  bucket: string;
  cdnUrl: string;
  region?: string;
};

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "upload";
}

export function createUploadService(config: UploadServiceConfig) {
  const client = new S3Client({
    region: config.region ?? process.env.AWS_REGION ?? "ap-south-1",
  });
  const cdnBase = config.cdnUrl.replace(/\/$/, "");

  function buildKey(workspaceId: string, filename: string): string {
    return `chat/${workspaceId}/${crypto.randomUUID()}/${sanitizeFilename(filename)}`;
  }

  function publicUrl(key: string): string {
    return `${cdnBase}/${key}`;
  }

  function isAllowedUrl(url: string): boolean {
    return url.startsWith(`${cdnBase}/`);
  }

  async function presignUpload(input: {
    workspaceId: string;
    name: string;
    mimeType: string;
    size: number;
  }) {
    const key = buildKey(input.workspaceId, input.name);
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.size,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    return { uploadUrl, url: publicUrl(key), key };
  }

  return { presignUpload, isAllowedUrl };
}
