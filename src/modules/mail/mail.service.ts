import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send Verification Email Token To User Via Mail
   *
   * @param email email to send token to
   * @param name name of the user
   * @param url url to be sent and used by user
   * @returns {Promise<boolean>} True if success, False otherwise
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    url: string,
  ): Promise<boolean> {
    await this.mailerService.sendMail({
      to: email,
      from: this.configService.get<string>('MAILER_FROM_ADDRESS'),
      subject: `Verify Your Email`,
      template: './verify-email.template.ejs',
      context: {
        username: name,
        verificationUrl: url,
      },
    });

    return true;
  }

  /**
   * Send Reset Password Email Token To User Via Mail
   *
   * @param email email to send token to
   * @param name name of the user
   * @param url url to be sent and used by user
   * @returns {Promise<boolean>} True if success, False otherwise
   */
  async sendResetPasswordEmail(
    email: string,
    name: string,
    url: string,
  ): Promise<boolean> {
    await this.mailerService.sendMail({
      to: email,
      from: this.configService.get<string>('MAILER_FROM_ADDRESS'),
      subject: `Reset Your Password`,
      template: './reset-password.template.ejs',
      context: {
        username: name,
        resetPasswordUrl: url,
      },
    });

    return true;
  }

  /**
   * Send Change Password Email Token To User Via Mail
   *
   * @param email email to send token to
   * @param name name of the user
   * @param url url to be sent and used by user
   * @returns {Promise<boolean>} True if success, False otherwise
   */
  async sendChangePasswordEmail(
    email: string,
    name: string,
    url: string,
  ): Promise<boolean> {
    await this.mailerService.sendMail({
      to: email,
      from: this.configService.get<string>('MAILER_FROM_ADDRESS'),
      subject: `Change Your Password`,
      template: './change-password.template.ejs',
      context: {
        username: name,
        changePasswordUrl: url,
      },
    });

    return true;
  }
}
