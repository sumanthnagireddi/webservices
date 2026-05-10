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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AtlassianContentVersionDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  number: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: '2025-06-01T09:31:47.395Z' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}

export class AtlassianContentStorageDto {
  @ApiProperty({ example: 'storage' })
  @IsString()
  representation: string;

  @ApiProperty({ example: '<h1>Signals</h1>' })
  @IsString()
  value: string;
}

export class AtlassianContentBodyDto {
  @ApiPropertyOptional({ type: AtlassianContentStorageDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AtlassianContentStorageDto)
  storage?: AtlassianContentStorageDto;

  @ApiPropertyOptional({
    description: 'Atlas doc format body returned by Atlassian page APIs',
    example: { type: 'doc', version: 1, content: [] },
  })
  @IsOptional()
  @IsObject()
  atlas_doc_format?: Record<string, unknown>;
}

export class AtlassianContentLinksDto {
  @ApiPropertyOptional({ example: '/pages/resumedraft.action?draftId=196647' })
  @IsOptional()
  @IsString()
  editui?: string;

  @ApiPropertyOptional({
    example:
      '/spaces/~712020ee5617697c9048f0ad47c93d292f605d/pages/196647/Signals',
  })
  @IsOptional()
  @IsString()
  webui?: string;

  @ApiPropertyOptional({
    example:
      '/spaces/~712020ee5617697c9048f0ad47c93d292f605d/pages/edit-v2/196647',
  })
  @IsOptional()
  @IsString()
  edituiv2?: string;

  @ApiPropertyOptional({ example: '/x/JwAD' })
  @IsOptional()
  @IsString()
  tinyui?: string;
}

export class CreateAtlassianContentDto {
  @ApiProperty({ example: '196647' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Signals' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'folder' })
  @IsOptional()
  @IsString()
  parentType?: string;

  @ApiPropertyOptional({ example: '1736732' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: '98309' })
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiPropertyOptional({ example: 'current' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2025-05-26T08:49:20.893Z' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiProperty({ type: AtlassianContentVersionDto })
  @ValidateNested()
  @Type(() => AtlassianContentVersionDto)
  version: AtlassianContentVersionDto;

  @ApiProperty({ type: AtlassianContentBodyDto })
  @ValidateNested()
  @Type(() => AtlassianContentBodyDto)
  body: AtlassianContentBodyDto;

  @ApiPropertyOptional({ type: AtlassianContentLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AtlassianContentLinksDto)
  _links?: AtlassianContentLinksDto;
}

export class BulkUpsertAtlassianContentDto {
  @ApiProperty({ type: [CreateAtlassianContentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAtlassianContentDto)
  items: CreateAtlassianContentDto[];
}
