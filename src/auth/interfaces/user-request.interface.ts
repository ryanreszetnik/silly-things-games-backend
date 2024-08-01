import { Request } from 'express';
import { User } from 'src/shared/models/user.interface';
export interface UserRequest extends Request {
  user: User;
  isNewUser: boolean;
}
