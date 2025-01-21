import { PrismaService } from 'src/prisma.service';
import { GameCategoryDB } from '@prisma/client';
import { Injectable } from '@nestjs/common';
export type GameTypeRepositoryType = {
  getGameTypesWithPagination(
    categoryTitle: string,
    page: number,
    itemsPerPage: number,
  ): Promise<{
    data: GameCategoryDB[];
    total: number;
    page: number;
    limit: number;
  }>;
};

@Injectable()
export class GameTypeRepository implements GameTypeRepositoryType {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * ดึง Game Types พร้อม Pagination โดยใช้แนวเกมส์ (GameCategoryDB.title)
   * @param categoryTitle ชื่อแนวเกมส์
   * @param page หน้าปัจจุบัน
   * @param itemsPerPage จำนวนรายการต่อหน้า
   * @returns ข้อมูล Game Types พร้อม Pagination
   */
  public async getGameTypesWithPagination(
    categoryTitle: string,
    page: number,
    itemsPerPage: number,
  ): Promise<{
    data: GameCategoryDB[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * itemsPerPage;

    const category = await this.prismaService.gameCategoryDB.findFirst({
      where: { title: categoryTitle },
    });

    if (!category) {
      throw new Error(`ไม่พบหมวดหมู่เกมที่ชื่อ "${categoryTitle}"`);
    }
    
    const data = await this.prismaService.gameTypeDB.findMany({
      where: {
        categoryId: category.id, // กรองตาม categoryId
        gameTypeGame: {
          some: {}, // เงื่อนไขนี้กรองเฉพาะรายการที่มีความสัมพันธ์กับ GameTypeGame
        },
      },
      skip,
      take: itemsPerPage,
    });

    const totalItems = await this.prismaService.gameTypeDB.count({
      where: { categoryId: category.id },
    });

    return {
      data,
      total: totalItems,
      page: page,
      limit: itemsPerPage,
    };
  }
}
