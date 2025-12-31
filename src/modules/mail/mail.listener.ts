import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from './mail.service';
import type { AuthEventsPayload } from '../auth/constants/auth-events-payload';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class MailListener {
  constructor(
    private readonly mailService: MailService,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Handle Event When Verification Email Token Requested
   *
   * @param payload AuthEventsPayload (e.g: url, email, username);
   */
  @OnEvent('auth.verificationEmail', { async: true })
  async sendEmailVerificationdEventHandle(payload: AuthEventsPayload) {
    const { email, name, url } = payload;
    try {
      this.logger.info(`Attempting to send email to: ${payload.email}`);
      await this.mailService.sendVerificationEmail(email, name, url);
      this.logger.info(`Successfully sent email to: ${payload.email}`);
    } catch (err) {
      this.logger.error(err, `Failed to send  email to: ${payload.email}`);
    }
  }

  /**
   * Handle Event When Reset Password Token Requested
   *
   * @param payload AuthEventsPayload (e.g: url, email, username);
   */
  @OnEvent('auth.forgot-password', { async: true })
  async sendResetPasswordEventHandle(payload: AuthEventsPayload) {
    const { email, name, url } = payload;
    try {
      this.logger.info(`Attempting to send email to: ${payload.email}`);
      await this.mailService.sendResetPasswordEmail(email, name, url);
      this.logger.info(`Successfully sent email to: ${payload.email}`);
    } catch (err) {
      this.logger.error(err, `Failed to send  email to: ${payload.email}`);
    }
  }

  @OnEvent('auth.change-password', { async: true })
  async sendChangePasswordEventHandle(payload: AuthEventsPayload) {
    const { email, name, url } = payload;
    try {
      this.logger.info(`Attempting to send email to: ${payload.email}`);
      await this.mailService.sendChangePasswordEmail(email, name, url);
      this.logger.info(`Successfully sent email to: ${payload.email}`);
    } catch (err) {
      this.logger.error(err, `Failed to send  email to: ${payload.email}`);
    }
  }
}
