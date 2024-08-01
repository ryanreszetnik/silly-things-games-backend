import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessTokenStrategy } from './strategies/jwt-access-token.strategy';
import { JwtAccessTokenAuthGuard } from './guards/jwt-access-token-auth.guard';
import { ConfigService } from '@nestjs/config';
import { DynamoDBModule } from 'src/dynamodb/dynamodb.module';
import { WsJwtAccessTokenAuthGuard } from './guards/ws-jwt-access-token-auth.guard';
import { AuthController } from './auth.controller';

@Global()
@Module({
  imports: [
    DynamoDBModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_TOKEN_KEY'),
        signOptions: {
          expiresIn: `${configService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_DAYS',
          )}d`,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtAccessTokenStrategy,
    JwtAccessTokenAuthGuard,
    WsJwtAccessTokenAuthGuard,
    // RefreshTokenStrategy
  ],
  exports: [JwtAccessTokenAuthGuard, WsJwtAccessTokenAuthGuard, JwtModule],
  controllers: [AuthController],
})
export class AuthModule {}
