import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
} from '@nestjs/common';
import { JwtAccessTokenAuthGuard } from '../auth/guards/jwt-access-token-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JWTRequest } from '../shared/interfaces/jwt-request.interface';
import { UsersService } from './users.service';
import { UpdateUserRequestDto } from './dtos/update-user-request.dto';
import { UpdateUserResponseDto } from './dtos/update-user-response.dto';
import { GetUsersResponseDto } from './dtos/get-users-response.dto';
import { User } from '../shared/models/user.interface';
import { GetUserResponseDto } from './dtos/get-user-response.dto';
@Controller('users')
@ApiTags('Users')
@ApiBearerAuth('jwt-access-token')
@UseGuards(JwtAccessTokenAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/all')
  @ApiOkResponse({ type: GetUsersResponseDto })
  @ApiOperation({ summary: 'Get all users.' })
  async getAllUsers(): Promise<GetUsersResponseDto> {
    const users: User[] = await this.usersService.getAllUsers();

    return { users: this.usersService.toUserDtos(users) };
  }

  @Get('/me')
  @ApiOkResponse({ type: GetUserResponseDto })
  @ApiOperation({ summary: 'Get my profile' })
  async getMyProfile(@Request() req: JWTRequest): Promise<GetUserResponseDto> {
    const uid = req.user.uid;
    const user = await this.usersService.findUser(uid);
    if (!user) throw new Error('User not found');
    return { user: this.usersService.toUserDto(user) };
  }

  @Post('/update')
  @ApiOperation({
    summary: 'Updates a user.',
  })
  async updateUser(
    @Request() req: JWTRequest,
    @Body() updateUserRequestDto: UpdateUserRequestDto,
  ): Promise<UpdateUserResponseDto> {
    const newUser = await this.usersService.update(
      req.user.uid,
      updateUserRequestDto,
    );
    return { user: this.usersService.toUserDto(newUser) };
  }
}
