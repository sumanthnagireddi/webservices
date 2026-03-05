import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchQueryDto {
  @IsNotEmpty()
  @IsString()
  q: string;
  @IsOptional()
  @IsString()
  page?: number;
  @IsOptional()
  @IsString()
  limit?: number;
  @IsOptional()
  @IsString()
  collections?: string | string[];
}
