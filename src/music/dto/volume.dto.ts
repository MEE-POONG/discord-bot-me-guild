import { IntegerOption } from 'necord';

export class VolumeDto {
  @IntegerOption({
    name: 'level',
    description: 'ระดับเสียง (0-100)',
    required: true,
    min_value: 0,
    max_value: 100,
  })
  level: number;
}
