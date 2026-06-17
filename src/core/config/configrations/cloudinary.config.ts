import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuration class that parses and exposes Cloudinary settings.
 */
@Injectable()
export class CloudinaryConfig {
  private readonly _apiKey: string;
  private readonly _apiSecret: string;
  private readonly _cloudName: string;
  private readonly _cloudinaryUrl: string;
  private readonly _overWrite: string;

  constructor(private readonly configService: ConfigService) {
    const rawUrl = this.configService.getOrThrow<string>('CLOUDINARY_URL');

    const url = rawUrl.trim();
    this._cloudinaryUrl = url;

    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!match) {
      throw new InternalServerErrorException(
        'Invalid CLOUDINARY_URL environment variable format.',
      );
    }

    const [, apiKey, apiSecret, cloudName] = match;
    this._apiKey = apiKey;
    this._apiSecret = apiSecret;
    this._cloudName = cloudName;
    this._overWrite = this.configService.getOrThrow<string>(
      'CLOUDINARY_OVERWRITE',
    );
  }

  /**
   * Returns the parsed Cloudinary API Key.
   */
  get apiKey(): string {
    return this._apiKey;
  }

  /**
   * Returns the parsed Cloudinary API Secret.
   */
  get apiSecret(): string {
    return this._apiSecret;
  }

  /**
   * Returns the parsed Cloudinary Cloud Name.
   */
  get cloudName(): string {
    return this._cloudName;
  }

  /**
   * Returns the raw Cloudinary URL connection string.
   */
  get cloudinaryUrl(): string {
    return this._cloudinaryUrl;
  }

  /**
   * Returns the overwrite flag.
   */
  get overWrite(): string {
    return this._overWrite;
  }
}
