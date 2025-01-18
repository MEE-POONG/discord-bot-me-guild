import { StringOption } from 'necord';

export class ServerUpdateRoleNameDto {
  @StringOption({
    name: 'server-update-role-name',
    description: 'ชื่อบทบาท',
    required: true,
  })
  rolename: string;
}
