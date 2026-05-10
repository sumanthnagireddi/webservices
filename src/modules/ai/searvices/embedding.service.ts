import { HfInference, InferenceClient } from '@huggingface/inference';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmbeddingService {
  private hf: InferenceClient;
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 30000; // 30 seconds

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('HF_API_KEY');
    if (!apiKey) {
      this.logger.warn('HF_API_KEY not set. Embedding service will not work.');
    }
    this.hf = new InferenceClient(apiKey);
  }

  async embed(text: string): Promise<number[]> {
    // Try HuggingFace Inference Client first
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.log(`Embedding attempt ${attempt}/${this.MAX_RETRIES}`);

        const embedding = await this.hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: text,
          parameters: { normalize: true },
        });

        return embedding[0] as number[];
      } catch (error: any) {
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt === this.MAX_RETRIES) {
          // Last attempt failed, try direct API call
          return await this.embedDirect(text);
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    // Fallback in case loop completes without returning
    return await this.embedDirect(text);
  }

  /**
   * Direct API call to HuggingFace as fallback
   */
  private async embedDirect(text: string): Promise<number[]> {
    try {
      this.logger.log('Trying direct HuggingFace API call...');

      const apiKey = this.config.get<string>('HF_API_KEY');
      if (!apiKey) {
        throw new Error('HF_API_KEY not configured');
      }

      const response = await axios.post(
        'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.TIMEOUT,
        },
      );

      if (Array.isArray(response.data) && Array.isArray(response.data[0])) {
        this.logger.log('Direct API call succeeded');
        return response.data[0];
      }

      throw new Error('Invalid response format from HuggingFace API');
    } catch (error: any) {
      this.logger.error('Direct API call also failed:', error.message);

      // Return a dummy embedding as last resort (for testing)
      this.logger.warn('Returning dummy embedding for testing purposes');
      return this.generateDummyEmbedding(text);
    }
  }

  /**
   * Generate a simple hash-based embedding for testing when API is unavailable
   * WARNING: This is NOT suitable for production!
   */
  private generateDummyEmbedding(text: string): number[] {
    this.logger.warn(
      '⚠️  Using dummy embeddings - NOT suitable for production!',
    );

    // Simple hash-based approach for 384 dimensions
    const embedding = new Array(384).fill(0);

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * i) % 384;
      embedding[index] += charCode / 1000;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    return embedding.map((val) => val / (norm || 1));
  }
}
