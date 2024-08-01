import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/shared/models/user.interface';
import { UserLoginResponseDto } from './dtos/user-login-response.dto';
import { JwtUser } from 'src/shared/interfaces/jwt-user.interface';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(user: User, isNewUser: boolean): Promise<UserLoginResponseDto> {
    const userToSign: Omit<JwtUser, 'iat' | 'exp'> = {
      uid: user.uid,
    };

    const response = {
      accessToken: this.jwtService.sign(userToSign),
      user,
      isNewUser,
    };
    return response;
  }
}
