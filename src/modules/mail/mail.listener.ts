import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from './mail.service';
import { AuthEventsPayload } from '../auth/constants/auth-events-payload';
import { PinoLogger } from 'nestjs-pino';
import { SecurityEvents } from '../../common/events/security.events';
import {
  InvitationEvents,
  UserInvitedEvent,
} from '../../common/events/invitation.events';

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
  @OnEvent(SecurityEvents.EMAIL_VERIFICATION_REQUESTED, { async: true })
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
  @OnEvent(SecurityEvents.PASSWORD_FORGOT, { async: true })
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

  @OnEvent(SecurityEvents.PASSWORD_CHANGED, { async: true })
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

  /**
   * Handle Event When A User Is Invited To Join A Club
   *
   * @param payload UserInvitedEvent (email, actionUrl, clubName, clubId)
   */
  @OnEvent(InvitationEvents.USER_INVITED, { async: true })
  async sendClubInvitationEventHandle(payload: UserInvitedEvent) {
    const { email, actionUrl, clubName, clubId } = payload;
    try {
      this.logger.info(
        `Attempting to send club invitation email to: ${email} for club: ${clubId}`,
      );
      const success = await this.mailService.sendInvitationEmail(
        email,
        clubName,
        actionUrl,
      );

      if (!success) {
        throw new Error('Failed to send club invitation email');
      }

      this.logger.info(
        `Successfully sent club invitation email to: ${email} for club: ${clubId}`,
      );
    } catch (err) {
      this.logger.error(
        err,
        `Failed to send club invitation email to: ${email} for club: ${clubId}`,
      );
    }
  }
}
