import { Injectable } from '@nestjs/common';
import { SearchQueryDto } from './dto/create-search.dto';
import { UpdateSearchDto } from './dto/update-search.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
export interface SearchResult {
  _id: string;
  type: string; // which collection this result came from
  score: number; // relevance score
  [key: string]: any; // original document fields
}
@Injectable()
export class SearchService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  private readonly SEARCHABLE_COLLECTIONS: Record<string, string[]> = {
    content: ['title', 'body', 'description','topicId'],
    blogs: ['title', 'content', 'description'],
    topics: ['name', 'topic_description'],
  };
  async search(searchQueryDto: SearchQueryDto) {
    const { q, page = 1, limit = 100, collections } = searchQueryDto;

    const collectionList: string[] =
      typeof collections === 'string'
        ? collections.split(',')
        : (collections ?? []);

    const targets = collectionList.length
      ? collectionList.filter((c) => c in this.SEARCHABLE_COLLECTIONS)
      : Object.keys(this.SEARCHABLE_COLLECTIONS);
    // Run text search on each collection in parallel
    const searchPromises = targets.map((collectionName) =>
      this.searchCollection(collectionName, q),
    );

    const perCollectionResults = await Promise.all(searchPromises);

    // Merge + tag each result with its source collection
    const merged: SearchResult[] = perCollectionResults
      .flatMap((results, i) =>
        results.map((doc) => ({
          ...this.mapSearchResult(doc, targets[i]),
          collection: targets[i],
        })),
      )
      .sort((a, b) => b.score - a.score); // global sort by score

    // Pagination applied AFTER merging
    const total = merged.length;
    // const paginated = merged.slice((page - 1) * limit, page * limit);

    // Summary per collection
    const byCollection = targets.reduce(
      (acc, name) => {
        acc[name] = merged.filter((r) => r.collection === name).length;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      total,
      byCollection,
      results: merged,
    };
    // return 'This action adds a new search';
  }
  private async searchCollection(
    collectionName: string,
    q: string,
  ): Promise<any[]> {
    try {
      const fields = this.SEARCHABLE_COLLECTIONS[collectionName];

      // Build projection: always include score + registered fields
      const projection = fields.reduce(
        (acc, field) => ({ ...acc, [field]: 1 }),
        { score: { $meta: 'textScore' } } as Record<string, any>,
      );

      return (await this.connection
        .collection(collectionName)
        .find({ $text: { $search: q } }, { projection })
        .sort({ score: { $meta: 'textScore' } })
        .toArray()) as any[];
    } catch {
      // Collection may not exist yet or has no text index — skip silently
      return [];
    }
  }

  private mapSearchResult(doc: any, collection: string): SearchResult {
    if (collection === 'content') return this.mapContentResult(doc);
    if (collection === 'blogs') return this.mapBlogResult(doc);
    if (collection === 'topics') return this.mapTopicResult(doc);
    return {
      _id: doc._id.toString(),
      collection,
      score: doc.score,
      ...doc,
    };
  }

  private mapContentResult(doc: any): SearchResult {
    return {
      _id: doc._id.toString(),
      type: 'content',
      score: doc.score,
      title: doc.title,
      // body: doc.body,
      description: doc.description,
      icon: 'article',
      url: `/pages/${doc.topicId}`,
    };
  }
  private mapBlogResult(doc: any): SearchResult {
    return {
      _id: doc._id.toString(),
      type: 'blogs',
      score: doc.score,
      title: doc.title,
      // content: doc.content,
      description: doc.description,
      icon: 'rate_review',
      url: `/blogs/view/${doc._id}`,
    };
  }
  private mapTopicResult(doc: any): SearchResult {
    return {
      _id: doc._id.toString(),
      type: 'topics',
      score: doc.score,
      name: doc.name,
      topic_description: doc.topic_description,
      icon: 'topic',
      url: `/pages/${doc._id}`,
    };
  }
}
