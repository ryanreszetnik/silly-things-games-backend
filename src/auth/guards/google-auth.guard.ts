import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('GoogleAuthGuard:canActivate:request: ', request.headers);
    const idToken = request.headers.authorization?.split(' ')[1];

    if (!idToken) throw new UnauthorizedException('No idToken provided');

    // Verify google id token
    const tokenPayload: TokenPayload = await this.verifyIdToken(idToken);
    const { gid, firstName, lastName, email, picture } =
      this.extractUserInfo(tokenPayload);

    // Find or create user
    console.log('creating/finding user:', email);
    const { user, isNewUser } = await this.usersService.findOrCreateUserFromGid(
      gid,
      firstName,
      lastName,
      email,
      picture,
    );

    if (!user) throw new UnauthorizedException('Invalid idToken');

    request.user = user;
    request.isNewUser = isNewUser;
    return true;
  }

  private extractUserInfo(tokenPayload: TokenPayload) {
    const { sub, given_name, family_name, email, picture } = tokenPayload;
    return {
      gid: sub,
      firstName: given_name,
      lastName: family_name,
      email: email ?? 'N/A',
      picture: picture ?? undefined,
    };
  }

  private async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const clientId = this.configService.get<string>('API_GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'API_GOOGLE_CLIENT_SECRET',
    );

    const googleOAuthClient = new OAuth2Client(clientId, clientSecret);
    const ticket: LoginTicket = await googleOAuthClient.verifyIdToken({
      idToken: idToken,
    });
    console.log('AuthService:verifyIdToken:ticket: ', ticket.getPayload());
    const payload: TokenPayload | undefined = ticket.getPayload();
    if (!payload) throw new Error('Invalid idToken');
    return payload;
  }
}
