import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageProvider } from "./storage.interface";
import { Readable } from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage.
 * Reads R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET from env.
 * Falls back to S3_* vars for compatibility.
 */
@Injectable()
export class R2Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    const accountId = this.config.getOrThrow<string>("R2_ACCOUNT_ID");
    const accessKey =
      this.config.get<string>("R2_ACCESS_KEY") ||
      this.config.getOrThrow<string>("S3_ACCESS_KEY");
    const secretKey =
      this.config.get<string>("R2_SECRET_KEY") ||
      this.config.getOrThrow<string>("S3_SECRET_KEY");

    this.bucket =
      this.config.get<string>("R2_BUCKET") ||
      this.config.get<string>("S3_BUCKET", "atrium");

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async download(key: string): Promise<{ body: Readable; contentType: string }> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return {
      body: response.Body as Readable,
      contentType: response.ContentType || "application/octet-stream",
    };
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
