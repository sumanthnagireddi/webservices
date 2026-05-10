import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { getModelToken } from '@nestjs/mongoose';
import { Blog, ContentStatus } from './blog.schema';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';

describe('BlogService', () => {
  let service: BlogService;
  let model: Model<Blog>;

  const mockBlog = {
    _id: '64f1a1c2a12b3c001a000002',
    title: 'Test Blog',
    description: 'Test Description',
    content: 'Test Content',
    authorId: '64f1a1c2a12b3c001a000001',
    status: ContentStatus.DRAFT,
    isActive: true,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockBlogModel = {
    new: jest.fn().mockResolvedValue(mockBlog),
    constructor: jest.fn().mockResolvedValue(mockBlog),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
    sort: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: getModelToken(Blog.name),
          useValue: mockBlogModel,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
    model = module.get<Model<Blog>>(getModelToken(Blog.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new blog', async () => {
      const blogData = {
        title: 'New Blog',
        content: 'Content',
      };

      const saveMock = jest.fn().mockResolvedValue({
        ...blogData,
        authorId: '64f1a1c2a12b3c001a000001',
      });

      mockBlogModel.save = saveMock;
      jest.spyOn(model, 'constructor' as any).mockImplementation(() => ({
        save: saveMock,
      }));

      // Create a proper mock instance
      const blogInstance = {
        ...blogData,
        authorId: '64f1a1c2a12b3c001a000001',
        save: saveMock,
      };

      const result = await blogInstance.save();

      expect(result).toBeDefined();
      expect(result.authorId).toBe('64f1a1c2a12b3c001a000001');
    });
  });

  describe('findAll', () => {
    it('should return all active blogs', async () => {
      const blogs = [mockBlog, { ...mockBlog, _id: 'another-id' }];

      const execMock = jest.fn().mockResolvedValue(blogs);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });
      mockBlogModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAll();

      expect(model.find).toHaveBeenCalledWith({ isActive: true });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(blogs);
    });

    it('should return empty array when no blogs exist', async () => {
      const execMock = jest.fn().mockResolvedValue([]);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });
      mockBlogModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a blog by id', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      const execMock = jest.fn().mockResolvedValue(mockBlog);
      mockBlogModel.findById.mockReturnValue({ exec: execMock });

      const result = await service.findById(blogId);

      expect(model.findById).toHaveBeenCalledWith(blogId);
      expect(result).toEqual(mockBlog);
    });

    it('should throw NotFoundException when blog not found', async () => {
      const blogId = 'nonexistent';
      const execMock = jest.fn().mockResolvedValue(null);
      mockBlogModel.findById.mockReturnValue({ exec: execMock });

      await expect(service.findById(blogId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(blogId)).rejects.toThrow('Blog not found');
    });
  });

  describe('findBySlug', () => {
    it('should return a blog by slug', async () => {
      const slug = 'test-blog';
      const execMock = jest.fn().mockResolvedValue(mockBlog);
      mockBlogModel.findOne.mockReturnValue({ exec: execMock });

      const result = await service.findBySlug(slug);

      expect(model.findOne).toHaveBeenCalledWith({
        slug,
        isActive: true,
      });
      expect(result).toEqual(mockBlog);
    });

    it('should throw NotFoundException when blog not found by slug', async () => {
      const slug = 'nonexistent-slug';
      const execMock = jest.fn().mockResolvedValue(null);
      mockBlogModel.findOne.mockReturnValue({ exec: execMock });

      await expect(service.findBySlug(slug)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a blog', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      const updateData = { title: 'Updated Title' };
      const updatedBlog = { ...mockBlog, ...updateData };

      mockBlogModel.findByIdAndUpdate.mockResolvedValue(updatedBlog);

      const result = await service.update(blogId, updateData);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(blogId, updateData, {
        new: true,
      });
      expect(result).toEqual(updatedBlog);
    });

    it('should throw NotFoundException when blog not found', async () => {
      const blogId = 'nonexistent';
      mockBlogModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.update(blogId, { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publish', () => {
    it('should publish a blog', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      const publishedBlog = {
        ...mockBlog,
        status: ContentStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      };

      mockBlogModel.findByIdAndUpdate.mockResolvedValue(publishedBlog);

      const result = await service.publish(blogId);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        blogId,
        {
          status: ContentStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
        { new: true },
      );
      expect(result.status).toBe(ContentStatus.PUBLISHED);
    });

    it('should throw NotFoundException when blog not found', async () => {
      const blogId = 'nonexistent';
      mockBlogModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.publish(blogId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a blog', async () => {
      const blogId = '64f1a1c2a12b3c001a000002';
      mockBlogModel.findByIdAndUpdate.mockResolvedValue(mockBlog);

      await service.remove(blogId);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(blogId, {
        isActive: false,
      });
    });

    it('should throw NotFoundException when blog not found', async () => {
      const blogId = 'nonexistent';
      mockBlogModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.remove(blogId)).rejects.toThrow(NotFoundException);
    });
  });
});
