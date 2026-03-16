import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const YOUTUBE_CHANNEL_ID_REGEX = /(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]+)/i;
const YOUTUBE_HANDLE_REGEX = /(?:youtube\.com\/@)([a-zA-Z0-9_.-]+)/i;
const INSTAGRAM_USERNAME_REGEX = /instagram\.com\/([^/?]+)/i;

export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok' | 'facebook';

@Injectable()
export class ListingsVerificationService {
  private readonly logger = new Logger(ListingsVerificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async verify(dto: {
    verificationCode: string;
    socialMedia: SocialPlatform;
    link: string;
  }): Promise<{ verified: true }> {
    const { verificationCode, socialMedia, link } = dto;

    if (socialMedia === 'facebook') {
      return { verified: true };
    }

    if (socialMedia === 'youtube') {
      return this.verifyYouTube(link, verificationCode);
    }

    if (socialMedia === 'instagram') {
      return this.verifyInstagram(link, verificationCode);
    }

    if (socialMedia === 'tiktok') {
      return this.verifyTikTok(link, verificationCode);
    }

    throw new BadRequestException(`Unsupported social media: ${socialMedia}`);
  }

  private async verifyYouTube(url: string, verificationCode: string): Promise<{ verified: true }> {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      this.logger.warn('YOUTUBE_API_KEY not configured');
      throw new BadRequestException('YouTube verification is not configured');
    }

    let channelId: string | null = null;
    const channelMatch = url.match(YOUTUBE_CHANNEL_ID_REGEX);
    const handleMatch = url.match(YOUTUBE_HANDLE_REGEX);

    if (channelMatch) {
      channelId = channelMatch[1];
    } else if (handleMatch) {
      const handle = handleMatch[1];
      const listRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { key: apiKey, part: 'id', forHandle: handle },
      });
      const first = listRes.data?.items?.[0];
      channelId = first?.id ?? null;
    }

    if (!channelId) {
      throw new BadRequestException('Could not resolve YouTube channel from link');
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { key: apiKey, part: 'snippet', id: channelId },
    });

    const channel = response.data?.items?.[0];
    if (!channel?.snippet?.description) {
      throw new BadRequestException('Channel not found or has no description');
    }

    const desc = channel.snippet.description;
    if (!desc.includes(verificationCode)) {
      throw new BadRequestException('Verification code not found in channel description');
    }

    return { verified: true };
  }

  private async verifyInstagram(url: string, verificationCode: string): Promise<{ verified: true }> {
    const apifyToken = this.configService.get<string>('APIFY_TOKEN') ?? this.configService.get<string>('APIFY_TOKEN');
    if (!apifyToken) {
      this.logger.warn('APIFY_TOKEN / APIFY_TOKEN not configured');
      throw new BadRequestException('Instagram verification is not configured');
    }

    const match = url.match(INSTAGRAM_USERNAME_REGEX);
    const username = match ? match[1] : null;
    if (!username) {
      throw new BadRequestException('Invalid Instagram profile URL');
    }

    const { ApifyClient } = await import('apify-client');
    const apifyClient = new ApifyClient({ token: apifyToken });

    const run = await apifyClient.actor('dSCLg0C3YEZ83HzYX').call({
      usernames: [username],
    });
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({ limit: 1 });
    const data = items[0] as { biography?: string } | undefined;

    if (!data?.biography?.includes(verificationCode)) {
      throw new BadRequestException('Verification code not found in profile biography');
    }

    return { verified: true };
  }

  private async verifyTikTok(url: string, verificationCode: string): Promise<{ verified: true }> {
    const apifyToken = this.configService.get<string>('APIFY_TOKEN') ?? this.configService.get<string>('APIFY_TOKEN');
    if (!apifyToken) {
      this.logger.warn('APIFY_TOKEN / APIFY_TOKEN not configured');
      throw new BadRequestException('TikTok verification is not configured');
    }

    const { ApifyClient } = await import('apify-client');
    const apifyClient = new ApifyClient({ token: apifyToken });

    const run = await apifyClient.actor('0FXVyOXXEmdGcV88a').call({
      profiles: [url],
      profileSorting: 'latest',
      resultsPerPage: 1,
      excludePinnedPosts: false,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
    });
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const first = items[0] as { authorMeta?: { signature?: string } } | undefined;
    const signature = first?.authorMeta?.signature ?? '';

    if (!signature.includes(verificationCode)) {
      throw new BadRequestException('Verification code not found in profile signature');
    }

    return { verified: true };
  }
}
