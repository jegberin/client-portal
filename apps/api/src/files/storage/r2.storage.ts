import { Injectable } from "@nestjs/common";
import { S3Storage } from "./s3.storage";

/**
 * Cloudflare R2 storage uses the same S3-compatible interface.
 * The S3_ENDPOINT env var must be set to the R2 endpoint.
 */
@Injectable()
export class R2Storage extends S3Storage {}
