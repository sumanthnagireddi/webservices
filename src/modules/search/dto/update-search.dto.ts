import { PartialType } from '@nestjs/mapped-types';
import { SearchQueryDto } from './create-search.dto';

export class UpdateSearchDto extends PartialType(SearchQueryDto) {}
