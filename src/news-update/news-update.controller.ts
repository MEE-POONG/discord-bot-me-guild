import { Controller, Get, Param } from '@nestjs/common';
import { NewsUpdateService } from './news-update.service';

@Controller('news-updates')
export class NewsUpdateController {
  constructor(private readonly newsUpdateService: NewsUpdateService) {}

  // API: ดึงข้อมูล 5 ลำดับล่าสุด
  @Get('latest')
  async getLatestNews() {
    return this.newsUpdateService.getLatestNews();
  }

  // API: ดึงข้อมูลข่าวตาม ID
  @Get(':id')
  async getNewsById(@Param('id') id: string) {
    return this.newsUpdateService.getNewsById(id);
  }
}
