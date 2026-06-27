import { IsOptional, IsString } from 'class-validator';

// Existing DTOs

export class CreateAtlassianContentDto {
  @IsString()
  atlassianId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  body?:
    | string
    | {
        storage?: { value?: string; representation?: string };
        atlas_doc_format?: unknown;
      };

  @IsOptional()
  @IsString()
  spaceKey?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  parentType?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  version?: {
    number?: number;
    createdAt?: string;
  };

  @IsOptional()
  _links?: {
    webui?: string;
    editui?: string;
    edituiv2?: string;
    tinyui?: string;
  };

  @IsOptional()
  createdAt?: string;
}

// New DTOs

export class CreatePageDto {
  @IsString()
  title!: string;

  @IsString()
  spaceKey!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdatePageDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;
}
