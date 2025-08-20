import { StringOption } from 'necord';

export class CreateStageDto {
  @StringOption({
    name: 'topic',
    description: 'หัวข้อเวที',
    required: true,
  })
  topic: string;
}
