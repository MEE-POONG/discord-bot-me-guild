import { StringOption } from 'necord';

export class PlayDto {
  @StringOption({
    name: 'query',
    description: 'ชื่อเพลงหรือ URL ที่ต้องการเล่น (ไม่ระบุจะสุ่มให้)',
    required: false,
  })
  query?: string;
}
