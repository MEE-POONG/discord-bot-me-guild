import { IsNumber, IsOptional, IsString, IsObject, Min, IsEmail } from 'class-validator';

export class CreatePaymentIntentDto {
    @IsNumber()
    @Min(1, { message: 'Amount must be at least 1 satang (0.01 THB)' })
    amount: number; // จำนวนเงินในหน่วยสตางค์ (satang)

    @IsOptional()
    @IsString()
    currency?: string = 'thb';

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string; // Email สำหรับ PromptPay (จำเป็นสำหรับการ refund)

    @IsOptional()
    @IsString()
    callbackUrl?: string; // URL สำหรับ redirect กลับหลังชำระเงินสำเร็จ (absolute หรือ relative)

    @IsOptional()
    @IsString()
    cancelUrl?: string; // URL สำหรับ redirect เมื่อยกเลิก (absolute หรือ relative)

    @IsOptional()
    @IsObject()
    metadata?: Record<string, string>;
}
