import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Patch,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpReqDto, SignUpResDto } from './dtos/sign-up.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { LoginReqDto, LoginResDto } from './dtos/login.dto';
import { ForgotPasswordReqDto } from './dtos/forgot-password.dto';
import {
  ResetPasswordReqDto,
  ResetPasswordResDto,
} from './dtos/reset-password.dto';
import { RefreshReqDto, RefreshResDto } from './dtos/refresh.dto';
import { ChangePasswordReqDto } from './dtos/change-password.dto';
import { ApiSuccessResponse } from '../../common/decorators/api-response.decorator';
import { LocalAuthGuard } from './guards/local.guard';
import { ValidationGuard } from '../../common/guards/validation.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '../user/entities/user.entity';
import { Public } from '../../common/decorators/public-endpoint.decorator';
import { VerifyEmailResDto } from './dtos/verify-email.dto';
import type { AccessTokenPayload } from './constants/token-payload.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @Public()
  @ResponseMessage(
    'User successfully signed-up. Check your email for verification.',
  )
  /**
   * Registers a new user.
   *
   * @param signUpReqDto - The sign-up request data.
   * @returns The sign-up response containing tokens.
   */
  @ApiOperation({
    summary: 'Register a new user and sends a verification email.',
  })
  @ApiConflictResponse({
    description: 'Email or Username already exists.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiBody({ type: SignUpReqDto })
  @ApiSuccessResponse(SignUpResDto)
  async signUp(@Body() signUpReqDto: SignUpReqDto): Promise<SignUpResDto> {
    return await this.authService.signUp(signUpReqDto);
  }

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @UseGuards(ValidationGuard(LoginReqDto))
  @ResponseMessage('You successfully logged in. Welcome back!')
  /**
   * Logs in a user.
   *
   * @param user - The authenticated user (from LocalGuard).
   * @returns The login response containing tokens.
   */
  @ApiOperation({ summary: 'Login a user and provide tokens.' })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiBody({ type: LoginReqDto })
  @ApiSuccessResponse(LoginResDto)
  async login(@CurrentUser() user: User): Promise<LoginResDto> {
    return await this.authService.login(user);
  }

  @Get('refresh')
  @Public()
  /**
   * Refreshes access and refresh tokens.
   *
   * @param refreshToken - The refresh token.
   * @returns The new tokens.
   */
  @ApiOperation({
    summary: 'Get Refresh and Access Tokens.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token.',
  })
  @ApiBody({ type: RefreshReqDto })
  @ApiOkResponse({
    description: 'Refresh and Access Tokens generated successfully.',
    type: RefreshResDto,
  })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<RefreshResDto> {
    return await this.authService.refresh(refreshToken);
  }

  /**
   * Verifies the user's email.
   *
   * @param token - The verification token.
   * @param userPayload - The current user payload.
   * @returns The verification response.
   */
  @Get('email/verify') // ?token=token
  @ApiOperation({
    summary: 'Claim verifying email.',
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'token',
    description: 'The verification token.',
    required: true,
    type: String,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or missing token.',
  })
  @ResponseMessage('Your email is now verified')
  async verifyEmail(
    @Query('token') token: string,
    @CurrentUser() userPayload: AccessTokenPayload,
  ): Promise<VerifyEmailResDto> {
    if (!token) {
      throw new BadRequestException('Invalid token');
    }

    const user: User = await this.authService.verifyUserEmail(
      userPayload.id,
      token,
    );

    return await this.authService.login(user);
  }

  /**
   * Resends the verification email.
   *
   * @param payload - The authenticated user payload.
   */
  @Post('/email/resend')
  @ApiOperation({
    summary: 'Resend email verification token to the email.',
  })
  @ApiBearerAuth()
  @ResponseMessage('Please, check your email for verification')
  async requestEmailVerification(@CurrentUser() payload: AccessTokenPayload) {
    return await this.authService.requestEmailVerification(payload.id);
  }

  /**
   * Sends a password reset link to the user's email.
   *
   * @param forgotPasswordReqDto - The email to send the link to.
   */
  @Post('forgot-password')
  @Public()
  @ApiOperation({
    summary: "Send forgot password token to user's email to reset it.",
  })
  @ResponseMessage('Please, check your email for password reset')
  async forgotPassword(
    @Body() forgotPasswordReqDto: ForgotPasswordReqDto,
    // ): Promise<null> {
  ): Promise<any> {
    return await this.authService.forgotPassword(forgotPasswordReqDto.email);
    // return null;
  }

  /**
   * Resets the password using a reset token.
   *
   * @param resetPasswordReqDto - The new password data.
   * @param token - The reset token.
   * @returns The new tokens.
   */
  @Patch('reset-password') // ?token:resetToken
  @Public()
  @ApiOperation({
    summary: 'Reset Password to a new one.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid token or password mismatch.',
  })
  @ApiBody({ type: ResetPasswordReqDto })
  @ApiQuery({
    name: 'token',
    description: 'The verification token.',
    required: true,
    type: String,
  })
  @ResponseMessage('Password Updated Successfully.')
  async resetPassword(
    @Body() resetPasswordReqDto: ResetPasswordReqDto,
    @Query('token') token: string,
  ): Promise<ResetPasswordResDto> {
    const { accessToken, refreshToken } = await this.authService.resetPassword(
      resetPasswordReqDto.newPassword,
      token,
    );
    // add access refresh tokens to the cookies
    return { accessToken, refreshToken };
  }

  /**
   * Changes the password for an authenticated user.
   *
   * @param changePasswordReqDto - The current password.
   * @param payload - The authenticated user payload.
   */
  @Patch('change-password')
  @ApiOperation({
    summary: 'Change Password to a new one.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: ChangePasswordReqDto })
  @ApiBadRequestResponse({
    description: 'Invalid current password.',
  })
  @ResponseMessage('Check your email for verification - password changed.')
  async changePassword(
    @Body() changePasswordReqDto: ChangePasswordReqDto,
    @CurrentUser() payload: AccessTokenPayload,
  ): Promise<any> {
    return await this.authService.changePassword(
      payload.id,
      changePasswordReqDto.currentPassword,
    );
  }
  /**
   * Logs out the user and invalidates all active sessions.
   *
   * @param payload - The authenticated user payload.
   */
  @Post('logout')
  @ApiOperation({
    summary: 'Logout the user and revoke all active sessions.',
  })
  @ApiBearerAuth()
  @ResponseMessage('Successfully logged out. All sessions revoked.')
  async logout(@CurrentUser() payload: AccessTokenPayload): Promise<void> {
    return await this.authService.logout(payload.id);
  }
}
