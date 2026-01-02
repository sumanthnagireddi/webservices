import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument, ContentStatus } from './blog.schema';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name)
    private readonly blogModel: Model<BlogDocument>,
  ) {}

  /* ---------- Create ---------- */
  async create(data: Partial<Blog>): Promise<Blog> {
    const blog = new this.blogModel(data);
    return blog.save();
  }

  /* ---------- Get All ---------- */
  async findAll(): Promise<Blog[]> {
    return this.blogModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /* ---------- Get By ID ---------- */
  async findById(id: string): Promise<Blog> {
    const blog = await this.blogModel.findById(id).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  /* ---------- Get By Slug ---------- */
  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogModel.findOne({ slug, isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  /* ---------- Update ---------- */
  async update(id: string, data: Partial<Blog>): Promise<Blog> {
    const blog = await this.blogModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  /* ---------- Publish ---------- */
  async publish(id: string): Promise<Blog> {
    const blog = await this.blogModel.findByIdAndUpdate(
      id,
      {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      { new: true },
    );

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  /* ---------- Soft Delete ---------- */
  async remove(id: string): Promise<void> {
    const result = await this.blogModel.findByIdAndUpdate(
      id,
      { isActive: false },
    );

    if (!result) {
      throw new NotFoundException('Blog not found');
    }
  }
}
