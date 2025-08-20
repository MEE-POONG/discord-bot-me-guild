import { NumberOption, StringOption } from 'necord';

export class TransferDto {
  @StringOption({
    name: 'receiver-account-number',
    description: 'หมายเลขบัญชีผู้รับ',
    required: true,
  })
  receiverAccountNumber: string;

  @NumberOption({
    name: 'amount',
    description: 'จำนวนเหรียญที่จะส่ง',
    required: true,
  })
  amount: number;

  @StringOption({
    name: 'comment',
    description: 'หมายเหตุ',
    required: true,
  })
  comment: string;
}
