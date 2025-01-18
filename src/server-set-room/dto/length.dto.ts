import { StringOption } from 'necord';

export class ServerSetRoomDto {
  @StringOption({
    name: 'server-room-name',
    description: 'ชื่อห้องที่ต้องการสร้าง',
    required: true,
  })
  roomName: string;
}
