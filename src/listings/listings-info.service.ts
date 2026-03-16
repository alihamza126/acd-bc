import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../common/services/storage.service';
import axios from 'axios';

const YOUTUBE_CHANNEL_ID_REGEX = /(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]+)/i;
const YOUTUBE_HANDLE_REGEX = /(?:youtube\.com\/@)([a-zA-Z0-9_.-]+)/i;
const INSTAGRAM_USERNAME_REGEX = /instagram\.com\/([^/?]+)/i;

export interface ListingInfoThumbnail {
  id: string | null;
  name: string | null;
  url: string | null;
}

export interface ListingInfoResponse {
  type: string;
  title: string;
  thumbnail: ListingInfoThumbnail;
  subscribers: number | string;
}

@Injectable()
export class ListingsInfoService {
  private readonly logger = new Logger(ListingsInfoService.name);
  private readonly LISTINGS_FOLDER = 'listings';

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  async getListingInfo(url: string): Promise<ListingInfoResponse> {
    const platform = this.detectPlatform(url);
    if (!platform) {
      throw new BadRequestException('Unsupported or invalid link. Use YouTube, Instagram, or TikTok.');
    }

    try {
      if (platform === 'youtube') {
        return await this.getYouTubeInfo(url);
      }
      if (platform === 'instagram') {
        return await this.getInstagramInfo(url);
      }
      if (platform === 'tiktok') {
        return await this.getTikTokInfo(url);
      }
      if (platform === 'facebook') {
        return { type: 'facebook', title: '', thumbnail: { id: null, name: null, url: null }, subscribers: '' };
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Get listing info failed', error);
      throw new InternalServerErrorException('Failed to fetch listing information');
    }

    throw new BadRequestException('Unsupported platform');
  }

  private detectPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | 'facebook' | null {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com')) return 'facebook';
    return null;
  }

  private async buildThumbnailFromUpload(imageUrl: string): Promise<ListingInfoThumbnail> {
    const empty: ListingInfoThumbnail = { id: null, name: null, url: null };
    try {
      const result = await this.storageService.uploadImageFromUrl(
        imageUrl,
        this.LISTINGS_FOLDER,
      );
      return {
        id: result.publicId ?? result.key ?? null,
        name: result.publicId ?? result.key ?? null,
        url: result.url,
      };
    } catch {
      return empty;
    }
  }

  private async getYouTubeInfo(url: string): Promise<ListingInfoResponse> {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('YouTube is not configured');
    }

    let channelId: string | null = null;
    const channelMatch = url.match(YOUTUBE_CHANNEL_ID_REGEX);
    const handleMatch = url.match(YOUTUBE_HANDLE_REGEX);

    if (channelMatch) {
      channelId = channelMatch[1];
    } else if (handleMatch) {
      const listRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { key: apiKey, part: 'id', forHandle: handleMatch[1] },
      });
      channelId = listRes.data?.items?.[0]?.id ?? null;
    }

    if (!channelId) {
      throw new BadRequestException('Could not resolve YouTube channel from link');
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { key: apiKey, part: 'snippet,statistics', id: channelId },
    });

    const channel = response.data?.items?.[0];
    if (!channel?.snippet) {
      throw new BadRequestException('YouTube channel not found');
    }

    const thumbUrl = channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url;
    const thumbnail = thumbUrl
      ? await this.buildThumbnailFromUpload(thumbUrl)
      : { id: null, name: null, url: null };

    const subscribers = channel.statistics?.subscriberCount
      ? Number(channel.statistics.subscriberCount)
      : 0;

    return {
      type: 'youtube',
      title: channel.snippet.title ?? '',
      thumbnail,
      subscribers,
    };
  }

  private async getInstagramInfo(url: string): Promise<ListingInfoResponse> {
    const apifyToken =
      this.configService.get<string>('APIFY_TOKEN') ??
      this.configService.get<string>('INSTAGRAM_API_KEY');
    if (!apifyToken) {
      throw new BadRequestException('Instagram is not configured');
    }

    const match = url.match(INSTAGRAM_USERNAME_REGEX);
    const username = match ? match[1] : null;
    if (!username) {
      throw new BadRequestException('Invalid Instagram profile URL');
    }

    const { ApifyClient } = await import('apify-client');
    const apifyClient = new ApifyClient({ token: apifyToken });

    const run = await apifyClient.actor('dSCLg0C3YEZ83HzYX').call({ usernames: [username] });
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({ limit: 1 });
    const data = items[0] as { username?: string; profilePicUrlHD?: string; followersCount?: number } | undefined;

    if (!data) {
      throw new BadRequestException('Instagram profile not found');
    }

    const thumbUrl = data.profilePicUrlHD;
    const thumbnail = thumbUrl
      ? await this.buildThumbnailFromUpload(thumbUrl)
      : { id: null, name: null, url: null };

    return {
      type: 'instagram',
      title: data.username ?? '',
      thumbnail,
      subscribers: data.followersCount ?? 0,
    };
  }

  private async getTikTokInfo(url: string): Promise<ListingInfoResponse> {
    const apifyToken =
      this.configService.get<string>('APIFY_TOKEN') ??
      this.configService.get<string>('INSTAGRAM_API_KEY');
    if (!apifyToken) {
      throw new BadRequestException('TikTok is not configured');
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
    const first = items[0] as { authorMeta?: { name?: string; originalAvatarUrl?: string; fans?: number } } | undefined;
    const authorMeta = first?.authorMeta;

    if (!authorMeta) {
      throw new BadRequestException('TikTok profile not found');
    }

    const thumbUrl = authorMeta.originalAvatarUrl;
    const thumbnail = thumbUrl
      ? await this.buildThumbnailFromUpload(thumbUrl)
      : { id: null, name: null, url: null };

    return {
      type: 'tiktok',
      title: authorMeta.name ?? '',
      thumbnail,
      subscribers: authorMeta.fans ?? 0,
    };
  }
}
