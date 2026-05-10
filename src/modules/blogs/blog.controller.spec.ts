import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { Blog, ContentStatus } from './blog.schema';

describe('BlogController', () => {
  let controller: BlogController;
  let service: BlogService;

  const mockBlogService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    remove: jest.fn(),
  };

  const mockBlog: Partial<Blog> = {
    title: 'Test Blog',
    description: 'Test Description',
    content: 'Test Content',
    authorId: '64f1a1c2a12b3c001a000001',
    status: ContentStatus.DRAFT,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        {
          provide: BlogService,
          useValue: mockBlogService,
        },
      ],
    }).compile();

    controller = module.get<BlogController>(BlogController);
    service = module.get<BlogService>(BlogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new blog', async () => {
      mockBlogService.create.mockResolvedValue(mockBlog);

      const result = await controller.create(mockBlog);

      expect(service.create).toHaveBeenCalledWith(mockBlog);
      expect(result).toEqual(mockBlog);
    });

    it('should handle blog creation with minimal data', async () => {
      const minimalBlog = { title: 'Minimal', content: 'Content' };
      mockBlogService.create.mockResolvedValue(minimalBlog);

      const result = await controller.create(minimalBlog);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(minimalBlog);
    });
  });

  describe('findAll', () => {
    it('should return an array of blogs', async () => {
      const blogs = [mockBlog, { ...mockBlog, title: 'Another Blog' }];
      mockBlogService.findAll.mockResolvedValue(blogs);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(blogs);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no blogs exist', async () => {
      mockBlogService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a blog by id', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      mockBlogService.findById.mockResolvedValue(mockBlog);

      const result = await controller.findById(blogId);

      expect(service.findById).toHaveBeenCalledWith(blogId);
      expect(result).toEqual(mockBlog);
    });

    it('should propagate not found error from service', async () => {
      const blogId = 'nonexistent';
      mockBlogService.findById.mockRejectedValue(new Error('Blog not found'));

      await expect(controller.findById(blogId)).rejects.toThrow(
        'Blog not found',
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a blog by slug', async () => {
      const slug = 'test-blog';
      mockBlogService.findBySlug.mockResolvedValue(mockBlog);

      const result = await controller.findBySlug(slug);

      expect(service.findBySlug).toHaveBeenCalledWith(slug);
      expect(result).toEqual(mockBlog);
    });

    it('should handle slug with special characters', async () => {
      const slug = 'test-blog-2024';
      mockBlogService.findBySlug.mockResolvedValue(mockBlog);

      const result = await controller.findBySlug(slug);

      expect(service.findBySlug).toHaveBeenCalledWith(slug);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update a blog', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      const updateData = { title: 'Updated Title' };
      const updatedBlog = { ...mockBlog, ...updateData };

      mockBlogService.update.mockResolvedValue(updatedBlog);

      const result = await controller.update(blogId, updateData);

      expect(service.update).toHaveBeenCalledWith(blogId, updateData);
      expect(result).toEqual(updatedBlog);
    });

    it('should handle partial updates', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      const partialUpdate = { description: 'New Description' };

      mockBlogService.update.mockResolvedValue({
        ...mockBlog,
        ...partialUpdate,
      });

      const result = await controller.update(blogId, partialUpdate);

      expect(result).toHaveProperty('description', 'New Description');
    });
  });

  describe('publish', () => {
    it('should publish a blog', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      const publishedBlog = {
        ...mockBlog,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      mockBlogService.publish.mockResolvedValue(publishedBlog);

      const result = await controller.publish(blogId);

      expect(service.publish).toHaveBeenCalledWith(blogId);
      expect(result).toEqual(publishedBlog);
      expect(result.status).toBe(ContentStatus.PUBLISHED);
    });

    it('should handle publishing non-existent blog', async () => {
      const blogId = 'nonexistent';
      mockBlogService.publish.mockRejectedValue(new Error('Blog not found'));

      await expect(controller.publish(blogId)).rejects.toThrow(
        'Blog not found',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a blog', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      mockBlogService.remove.mockResolvedValue(undefined);

      await controller.remove(blogId);

      expect(service.remove).toHaveBeenCalledWith(blogId);
    });

    it('should handle deletion of non-existent blog', async () => {
      const blogId = 'nonexistent';
      mockBlogService.remove.mockRejectedValue(new Error('Blog not found'));

      await expect(controller.remove(blogId)).rejects.toThrow('Blog not found');
    });
  });
});
