import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog } from '../../blogs/blog.schema';

export interface SearchResult {
  text: string;
  type: 'blog';
  title: string;
  score: number;
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(@InjectModel(Blog.name) private blogModel: Model<Blog>) {}

  /**
   * Text-based search for blog content without extra AI module dependencies.
   */
  async search(query: string, limit = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const blogResults = await this.blogModel
        .find(
          {
            $text: { $search: query },
          },
          { score: { $meta: 'textScore' } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();

      for (const doc of blogResults) {
        results.push({
          text: `${doc.title}\n${doc.description || ''}\n${doc.content.substring(0, 500)}`,
          type: 'blog',
          title: doc.title,
          score: (doc as any).score || 1,
        });
      }

      this.logger.log(`Found ${results.length} results for query: "${query}"`);
      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error: any) {
      this.logger.warn('Text search error:', error.message);
      return [];
    }
  }
}
