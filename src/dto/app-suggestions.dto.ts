import {
  Length,
  IsString,
  IsPositive,
  IsInt,
  IsOptional,
} from 'class-validator';

export class AppSuggestionsDto {
  @IsString()
  @Length(1)
  readonly query: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly limit?: number;
}
