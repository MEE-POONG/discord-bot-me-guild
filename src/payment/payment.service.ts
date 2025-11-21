import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-intent.dto';
import { PrismaService } from '../prisma.service';
import { ServerRepository } from '../repository/server';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';

@Injectable()
export class PaymentService implements OnModuleInit {
    private readonly logger = new Logger(PaymentService.name);
    private stripe: Stripe;
    private pollingInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly serverRepository: ServerRepository,
        @Inject(Client) private readonly client: Client,
    ) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (secretKey) {
            this.stripe = new Stripe(secretKey, {
                // @ts-ignore
                apiVersion: '2025-11-17.clover',
            });
        } else {
            this.logger.warn('STRIPE_SECRET_KEY is not configured');
        }
    }

    onModuleInit() {
        if (this.stripe) {
            this.startPaymentPolling();
        }
    }

    private startPaymentPolling() {
        const pollInterval = 5000; // 5 seconds
        this.logger.log(`[PaymentPolling] Starting payment status polling every ${pollInterval / 1000} seconds`);

        this.pollingInterval = setInterval(() => {
            void this.pollPendingPayments();
        }, pollInterval);
    }

    private async pollPendingPayments() {
        if (!this.stripe) return;
        try {
            // @ts-ignore
            const pendingPayments = await this.prisma.paymentDB.findMany({
                where: {
                    status: {
                        notIn: ['SUCCEEDED', 'FAILED', 'CANCELED'],
                    },
                    stripePaymentIntentId: { not: null }
                },
                take: 10,
            });

            if (pendingPayments.length === 0) return;

            for (const payment of pendingPayments) {
                if (!payment.stripePaymentIntentId) continue;
                try {
                    await this.getPaymentIntentStatus(payment.stripePaymentIntentId);
                } catch (error: any) {
                    if (error?.code === 'resource_missing' || error?.statusCode === 404) {
                        // @ts-ignore
                        await this.prisma.paymentDB.update({
                            where: { id: payment.id },
                            data: { status: 'CANCELED' },
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error('[PaymentPolling] Error polling payments:', error);
        }
    }

    async createPaymentIntent(dto: CreatePaymentIntentDto, discordMessageInfo?: { channelId: string, messageId: string, userId: string, guildId: string }) {
        if (!this.stripe) throw new Error('Stripe not configured');
        try {
            const { amount, currency = 'thb', description, email, metadata } = dto;

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount,
                currency: currency.toLowerCase(),
                payment_method_types: ['promptpay'],
                description,
                metadata: metadata || {},
                confirm: true,
                payment_method_data: {
                    type: 'promptpay',
                    billing_details: { email: email || 'example@example.com' },
                },
            });

            let qrCodeUrl: string | null = null;
            if (paymentIntent.status === 'requires_action' && paymentIntent.next_action) {
                const nextAction = paymentIntent.next_action as any;
                const qrCode = nextAction.promptpay_display_qr_code || nextAction.display_qr_code;
                if (qrCode) {
                    qrCodeUrl = qrCode.image_url_png || qrCode.image_url_svg || qrCode.hosted_instructions_url;
                }
            }

            // @ts-ignore
            await this.prisma.paymentDB.create({
                data: {
                    paymentMethod: 'PromptPay',
                    stripePaymentIntentId: paymentIntent.id,
                    stripeAmount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
                    qrCodeUrl: qrCodeUrl,
                    metadata: metadata as any,
                    discordChannelId: discordMessageInfo?.channelId,
                    discordMessageId: discordMessageInfo?.messageId,
                    discordUserId: discordMessageInfo?.userId,
                    discordGuildId: discordMessageInfo?.guildId,
                },
            });

            return {
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                status: paymentIntent.status,
                qrCodeUrl,
            };
        } catch (error) {
            this.logger.error('Failed to create PaymentIntent', error);
            throw error;
        }
    }

    async getPaymentIntentStatus(paymentIntentId: string) {
        if (!this.stripe) throw new Error('Stripe not configured');
        try {
            // @ts-ignore
            const localPayment = await this.prisma.paymentDB.findUnique({
                where: { stripePaymentIntentId: paymentIntentId },
            });

            if (localPayment && ['SUCCEEDED', 'FAILED', 'CANCELED'].includes(localPayment.status || '')) {
                return localPayment;
            }

            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            const updatedStatus = this.mapStripeStatusToPaymentStatus(paymentIntent.status);

            if (localPayment && updatedStatus !== localPayment.status) {
                // @ts-ignore
                await this.prisma.paymentDB.update({
                    where: { stripePaymentIntentId: paymentIntentId },
                    data: { status: updatedStatus },
                });

                if (updatedStatus === 'SUCCEEDED') {
                    await this.handlePaymentSuccess(paymentIntentId);
                }
            }

            return {
                status: updatedStatus,
                qrCodeUrl: localPayment?.qrCodeUrl,
            };
        } catch (error) {
            this.logger.error(`Failed to retrieve PaymentIntent: ${paymentIntentId}`, error);
            throw error;
        }
    }

    private async handlePaymentSuccess(paymentIntentId: string) {
        this.logger.log(`Processing payment success for: ${paymentIntentId}`);
        // @ts-ignore
        const payment = await this.prisma.paymentDB.findUnique({
            where: { stripePaymentIntentId: paymentIntentId },
        });

        if (!payment || !payment.metadata) return;

        const metadata = payment.metadata as any;
        const type = metadata.type;
        const guildId = metadata.guildId;
        const packageId = metadata.packageId;
        const days = parseInt(metadata.days || '30');

        if (type === 'package_subscription' && guildId) {
            // Update server expiration
            const server = await this.serverRepository.getServerById(guildId);
            if (server) {
                const currentExpiry = server.openUntilAt ? new Date(server.openUntilAt) : new Date();
                const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

                // If expired, start from now
                if (currentExpiry < new Date()) {
                    const now = new Date();
                    newExpiry.setTime(now.getTime() + days * 24 * 60 * 60 * 1000);
                }

                await this.prisma.serverDB.update({
                    where: { id: server.id },
                    data: {
                        openUntilAt: newExpiry,
                        openBot: true // เปิดใช้งานบอทเมื่อชำระเงินสำเร็จ
                    }
                });
                this.logger.log(`Extended package for guild ${guildId} by ${days} days. New expiry: ${newExpiry}`);
            }
        }

        // Update Discord message
        await this.updateDiscordMessage(payment, metadata);
    }

    private async updateDiscordMessage(payment: any, metadata: any) {
        try {
            if (!payment.discordChannelId || !payment.discordMessageId) {
                this.logger.warn('[updateDiscordMessage] Missing channel or message ID');
                return;
            }

            const channel = await this.client.channels.fetch(payment.discordChannelId) as TextChannel;
            if (!channel || !channel.isTextBased()) {
                this.logger.warn('[updateDiscordMessage] Channel not found or not text-based');
                return;
            }

            const message = await channel.messages.fetch(payment.discordMessageId);
            if (!message) {
                this.logger.warn('[updateDiscordMessage] Message not found');
                return;
            }

            const packageName = metadata.packageId ? `Package ${metadata.packageId}` : 'แพ็คเกจ';
            const days = metadata.days || '30';

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ ชำระเงินสำเร็จ!')
                .setDescription(
                    `**สินค้า:** ${packageName}\n` +
                    `**ระยะเวลา:** ${days} วัน\n` +
                    `**สถานะ:** ชำระเงินเรียบร้อยแล้ว\n\n` +
                    `ขอบคุณที่ใช้บริการ! บอทได้เปิดใช้งานแล้ว 🎉`
                )
                .setColor(0x00ff00)
                .setTimestamp();

            await message.edit({ embeds: [successEmbed], components: [] });
            this.logger.log(`[updateDiscordMessage] Successfully updated message ${payment.discordMessageId}`);
        } catch (error) {
            this.logger.error('[updateDiscordMessage] Failed to update Discord message:', error);
        }
    }

    constructWebhookEvent(payload: any, signature: string) {
        if (!this.stripe) throw new Error('Stripe not configured');
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    async handleWebhookEvent(event: Stripe.Event) {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                // @ts-ignore
                await this.prisma.paymentDB.update({
                    where: { stripePaymentIntentId: paymentIntent.id },
                    data: { status: 'SUCCEEDED' },
                });
                await this.handlePaymentSuccess(paymentIntent.id);
                break;
            case 'payment_intent.payment_failed':
            case 'payment_intent.canceled':
                const intent = event.data.object as Stripe.PaymentIntent;
                // @ts-ignore
                await this.prisma.paymentDB.update({
                    where: { stripePaymentIntentId: intent.id },
                    data: { status: 'FAILED' },
                });
                break;
        }
    }

    private mapStripeStatusToPaymentStatus(stripeStatus: string): string {
        switch (stripeStatus) {
            case 'succeeded': return 'SUCCEEDED';
            case 'processing': return 'PROCESSING';
            case 'canceled': return 'CANCELED';
            case 'requires_payment_method': return 'FAILED';
            default: return 'PENDING';
        }
    }
}
