import { StringOption } from 'necord';

export class ServerCreateRoleNameDto {
  @StringOption({
    name: 'server-create-role-name',
    description: 'ชื่อบทบาท',
    required: true,
  })
  rolename: string;
}
