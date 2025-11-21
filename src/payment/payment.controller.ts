import { Controller, Post, Headers, Req, RawBodyRequest, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(private readonly paymentService: PaymentService) { }

    @Post('webhook')
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() req: RawBodyRequest<Request>,
    ) {
        if (!signature) return;
        try {
            const event = this.paymentService.constructWebhookEvent(req.rawBody, signature);
            await this.paymentService.handleWebhookEvent(event);
            return { received: true };
        } catch (err) {
            this.logger.error(`Webhook Error: ${err.message}`);
            throw err;
        }
    }
}
