import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtAccessTokenAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const authToken = client.handshake.headers.authorization;
    if (!authToken) {
      return false;
    }

    const token = authToken.split(' ')[1];

    try {
      const decoded = this.jwtService.verify(token);
      client.user = decoded;
      return true;
    } catch (err) {
      console.log('error in ws jwt auth guard:', err);
      return false;
    }
  }
}
