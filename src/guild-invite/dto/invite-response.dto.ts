export class InviteResponseDto {
  status: 'success' | 'fail';
  message: string;
  inviteId?: string | null;

  constructor(status: 'success' | 'fail', message: string, inviteId?: string | null) {
    this.status = status;
    this.message = message;
    this.inviteId = inviteId;
  }

  static success(message: string, inviteId?: string): InviteResponseDto {
    return new InviteResponseDto('success', message, inviteId);
  }

  static failure(message: string): InviteResponseDto {
    return new InviteResponseDto('fail', message, null);
  }
}
