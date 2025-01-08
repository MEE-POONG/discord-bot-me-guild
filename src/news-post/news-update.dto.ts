import { IsString } from 'class-validator';

export class NewsUpdateDto {
  @IsString()
  id: string; // ID ของข่าวที่ต้องการดึงข้อมูล
}
