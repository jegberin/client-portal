import { Injectable } from "@nestjs/common";
import { S3Storage } from "./s3.storage";

/**
 * MinIO storage uses the same S3-compatible interface.
 * The S3_ENDPOINT env var must be set to the MinIO URL.
 */
@Injectable()
export class MinioStorage extends S3Storage {}
