import { search as ytSearch, type VideoSearchResult } from 'yt-search';
import { AppDownloadDto, AppSuggestionsDto, AppVideosDto } from '../dto';
import { MemoryCache, caching } from 'cache-manager';
import sanitizeFilename from 'sanitize-filename';
import ytdl, { getBasicInfo } from 'ytdl-core';
import { NotFound } from 'http-errors';
import {
  createWriteStream,
  statSync,
  unlinkSync,
  type Stats,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { InternalServerError } from 'http-errors';
import { Writable } from 'node:stream';
import { parse } from 'yaml';
import { serve, setup } from 'swagger-ui-express';

export class AppService {
  private static instance: AppService;
  private static readonly tmpdir = tmpdir();
  private memoryCache: MemoryCache;
  private constructor() {}

  public static async getInstance() {
    if (!AppService.instance) {
      AppService.instance = new AppService();
      AppService.instance.memoryCache = await caching('memory', {
        ttl: 30 * 1000,
      });
    }

    return AppService.instance;
  }

  public static swaggerData() {
    const data = readFileSync(join(__dirname, '../../swagger.yml'), 'utf-8');
    const parsedData = parse(data);

    return parsedData;
  }

  public static swaggerServe() {
    const data = AppService.swaggerData();

    return [serve, setup(data)];
  }

  public async suggestions(payload: AppSuggestionsDto) {
    const cacheKey = `suggestions.${JSON.stringify(payload)}`;
    const cachedSuggestions = await this.memoryCache.get<string[]>(cacheKey);

    if (cachedSuggestions) {
      return {
        suggestions: cachedSuggestions,
      };
    }

    const response = await fetch(
      `http://suggestqueries.google.com/complete/search?client=youtube&output=toolbar&client=firefox&hl=en&q=${encodeURI(
        payload.query,
      )}`,
    );
    const data = await response.json();
    let [, suggestions] = data as [unknown, string[]];
    suggestions = suggestions
      .map((suggestion) =>
        suggestion.replace(/\\u[\dA-F]{4}/gi, (match) =>
          String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)),
        ),
      )
      .slice(0, payload.limit);

    await this.memoryCache.set(cacheKey, suggestions);

    return {
      suggestions,
    };
  }

  public async videos(payload: AppVideosDto) {
    const cacheKey = `videos.${JSON.stringify(payload)}`;
    const cachedVideos = await this.memoryCache.get<VideoSearchResult[]>(
      cacheKey,
    );

    if (cachedVideos) {
      return {
        videos: cachedVideos,
      };
    }
    const { videos: _videos } = await ytSearch(payload.query);
    const videos = _videos.slice(0, payload.limit);

    await this.memoryCache.set(cacheKey, videos);

    return {
      videos,
    };
  }

  public async downloadAudio(payload: AppDownloadDto) {
    const { videoDetails } = await this.getVideoInfo(payload.video_id);
    const { title } = videoDetails;
    const fileLocation = join(
      AppService.tmpdir,
      sanitizeFilename(`${randomUUID()}-${title}.mp3`),
    );
    const writeStream = createWriteStream(fileLocation);
    const stream = ytdl(payload.video_id, {
      filter: 'audioonly',
      quality: 'highestaudio',
    }).pipe(writeStream);
    const data = await new Promise<{
      fileName: string;
      fileLocation: string;
      fileInfo: Stats;
    }>((resolve) => {
      stream.on('finish', () => {
        const fileInfo = statSync(fileLocation);

        resolve({
          fileName: sanitizeFilename(`${title}.mp3`),
          fileLocation,
          fileInfo,
        });
      });
    });

    return data;
  }

  public async downloadVideo(payload: AppDownloadDto) {
    const { videoDetails } = await this.getVideoInfo(payload.video_id);
    const { title } = videoDetails;
    const fileLocation = join(
      AppService.tmpdir,
      sanitizeFilename(`${randomUUID()}-${title}.mp4`),
    );

    if (!ffmpegPath) throw new InternalServerError('An error occurs');

    const ffmpeg = spawn(
      ffmpegPath,
      [
        '-loglevel',
        '8',
        '-hide_banner',
        '-thread_queue_size',
        '4096',
        '-i',
        'pipe:3',
        '-i',
        'pipe:4',
        '-c:v',
        'copy',
        '-c:a',
        'copy',
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        fileLocation,
      ],
      {
        windowsHide: true,
        stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe', 'pipe'],
      },
    );

    ytdl(payload.video_id, {
      filter: 'audioonly',
      quality: 'highestaudio',
    }).pipe(ffmpeg.stdio[4] as Writable);

    ytdl(payload.video_id, {
      filter: 'videoonly',
      quality: 'highestvideo',
    }).pipe(ffmpeg.stdio[3] as Writable);

    const data = await new Promise<{
      fileName: string;
      fileLocation: string;
      fileInfo: Stats;
    }>((resolve) => {
      ffmpeg.stdio.at(5)?.on('finish', () => {
        const fileInfo = statSync(fileLocation);

        resolve({
          fileName: sanitizeFilename(`${title}.mp4`),
          fileLocation,
          fileInfo,
        });
      });

      ffmpeg.stdio.at(5)?.on('error', () => {
        throw new InternalServerError('An error occurs');
      });
    });

    return data;
  }

  public cleanDownloadedFile(fileLocation: string) {
    unlinkSync(fileLocation);
  }

  private async getVideoInfo(videoId: string) {
    let videoInfo;

    try {
      videoInfo = await getBasicInfo(videoId);
    } catch (error) {
      if (!videoInfo || error instanceof Error) {
        throw NotFound(
          (error as Error)?.message ?? `No video id found: ${videoId}`,
        );
      }
    }

    return videoInfo;
  }
}
