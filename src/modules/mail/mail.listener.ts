import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from './mail.service';
import type { AuthEventsPayload } from '../../auth/constants/auth-events';

@Injectable()
export class MailListener {
  constructor(private readonly mailService: MailService) {}

  /**
   * Handle Event When Verification Email Token Requested
   *
   * @param payload AuthEventsPayload (e.g: url, email, username);
   */
  @OnEvent('auth.verificationEmail', { async: true })
  async sendEmailVerificationdEventHandle(payload: AuthEventsPayload) {
    const { email, name, url } = payload;
    try {
      console.log('Sending email to ... ', payload.email);
      await this.mailService.sendVerificationEmail(email, name, url);
    } catch (err) {
      console.error(
        `${new Date().toTimeString()} Auth-verificationEmail-Event failed to send mail to: ${email}`,
        err,
      );
    }
  }
}
