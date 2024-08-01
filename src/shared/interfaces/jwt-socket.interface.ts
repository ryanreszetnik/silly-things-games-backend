import { Socket } from 'socket.io';
import { JwtUser } from './jwt-user.interface';

export interface JwtSocket extends Socket {
  user: JwtUser;
}
