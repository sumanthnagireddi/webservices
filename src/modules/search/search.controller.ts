import { Controller, Get, Param, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/create-search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search({
      q: query.q,
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 100),
      collections:
        typeof query.collections === 'string'
          ? (query.collections as string).split(',')
          : query.collections,
    });
  }
}
