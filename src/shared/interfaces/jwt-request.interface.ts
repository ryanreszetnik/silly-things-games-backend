import { Request } from 'express';
import { JwtUser } from './jwt-user.interface';

export interface JWTRequest extends Request {
  user: JwtUser;
}
