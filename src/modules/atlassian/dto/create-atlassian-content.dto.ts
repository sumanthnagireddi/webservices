import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AtlassianContentVersionDto {
  @IsInt()
  number: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;
}

export class AtlassianContentStorageDto {
  @IsString()
  representation: string;

  @IsString()
  value: string;
}

export class AtlassianContentBodyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AtlassianContentStorageDto)
  storage?: AtlassianContentStorageDto;

  @IsOptional()
  @IsObject()
  atlas_doc_format?: Record<string, unknown>;
}

export class AtlassianContentLinksDto {
  @IsOptional()
  @IsString()
  editui?: string;

  @IsOptional()
  @IsString()
  webui?: string;

  @IsOptional()
  @IsString()
  edituiv2?: string;

  @IsOptional()
  @IsString()
  tinyui?: string;
}

export class CreateAtlassianContentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  parentType?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ValidateNested()
  @Type(() => AtlassianContentVersionDto)
  version: AtlassianContentVersionDto;

  @ValidateNested()
  @Type(() => AtlassianContentBodyDto)
  body: AtlassianContentBodyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AtlassianContentLinksDto)
  _links?: AtlassianContentLinksDto;
}

export class BulkUpsertAtlassianContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAtlassianContentDto)
  items: CreateAtlassianContentDto[];
}
