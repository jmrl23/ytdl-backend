import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export enum AppDownloadTypes {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum AppDownloadPrevent {
  TRUE = 'true',
  FALSE = 'false',
}

export class AppDownloadDto {
  @IsString()
  @Length(1)
  readonly video_id: string;

  @IsEnum(AppDownloadTypes)
  readonly type: AppDownloadTypes;

  @IsOptional()
  @IsString()
  @IsEnum(AppDownloadPrevent)
  readonly prevent_download?: AppDownloadPrevent;
}
