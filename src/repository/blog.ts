import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BlogDB } from '@prisma/client';

export type BlogRepositoryType = {
  createBlog(data: Partial<Omit<BlogDB, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BlogDB>;
  getAllBlogs(): Promise<BlogDB[]>;
  getBlogById(id: string): Promise<BlogDB | null>;
  updateBlog(id: string, data: Partial<Omit<BlogDB, 'id' | 'createdAt'>>): Promise<BlogDB>;
  deleteBlog(id: string): Promise<BlogDB>;
};

@Injectable()
export class BlogRepository implements BlogRepositoryType {
  constructor(private readonly prismaService: PrismaService) {}

  async createBlog(data: Partial<Omit<BlogDB, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BlogDB> {
    const now = new Date();
    return this.prismaService.blogDB.create({
      data: {
        ...data,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  async getAllBlogs(): Promise<BlogDB[]> {
    return this.prismaService.blogDB.findMany();
  }

  async getBlogById(id: string): Promise<BlogDB | null> {
    return this.prismaService.blogDB.findUnique({
      where: { id },
    });
  }

  async updateBlog(id: string, data: Partial<Omit<BlogDB, 'id' | 'createdAt'>>): Promise<BlogDB> {
    return this.prismaService.blogDB.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteBlog(id: string): Promise<BlogDB> {
    return this.prismaService.blogDB.delete({
      where: { id },
    });
  }
}
