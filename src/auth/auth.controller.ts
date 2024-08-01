import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserLoginResponseDto } from './dtos/user-login-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UserRequest } from './interfaces/user-request.interface';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login/google')
  @ApiBearerAuth('google-id-token')
  @ApiOkResponse({ type: UserLoginResponseDto })
  @ApiOperation({
    summary:
      'Login with Google (Do not forget to first authorize with your google id token.)',
  })
  @UseGuards(GoogleAuthGuard)
  async loginGoogle(
    @Request() req: UserRequest,
  ): Promise<UserLoginResponseDto> {
    return await this.authService.login(req.user, req.isNewUser);
  }
}
