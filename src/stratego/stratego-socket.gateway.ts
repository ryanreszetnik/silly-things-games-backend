import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtAccessTokenAuthGuard } from 'src/auth/guards/ws-jwt-access-token-auth.guard';
import { JwtSocket } from 'src/shared/interfaces/jwt-socket.interface';
import { UsersService } from 'src/users/users.service';
import { StrategoService } from './stratego.service';
import { StrategoGame } from 'src/shared/models/stratego-game.interface';
import {
  SocketIncomingEventMap,
  SocketRequestEvent,
  SocketResponseEvent,
} from '../shared/interfaces/socket.interface';

@WebSocketGateway({ cors: true })
export class StrategoSocketGateway implements OnGatewayConnection {
  constructor(
    private readonly usersService: UsersService,
    private readonly strategoService: StrategoService,
  ) {}

  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected', client.id);
  }

  @UseGuards(WsJwtAccessTokenAuthGuard)
  @SubscribeMessage(SocketRequestEvent.STRATEGO_JOIN_GAME)
  async joinGame(
    @ConnectedSocket() client: JwtSocket,
    @MessageBody()
    data: SocketIncomingEventMap[SocketRequestEvent.STRATEGO_JOIN_GAME],
  ) {
    const uid = client.user.uid;
    const resp = await this.strategoService.joinGame(uid, data.gameId);
    client.join(data.gameId);
    this.sendGameUpdate(resp);
  }

  @UseGuards(WsJwtAccessTokenAuthGuard)
  @SubscribeMessage(SocketRequestEvent.STRATEGO_CONFIRM_SETUP)
  async confirmSetup(
    @ConnectedSocket() client: JwtSocket,
    @MessageBody()
    data: SocketIncomingEventMap[SocketRequestEvent.STRATEGO_CONFIRM_SETUP],
  ) {
    const uid = client.user.uid;
    const resp = await this.strategoService.confirmSetup(
      uid,
      data.gameId,
      data.pieces,
    );

    this.sendGameUpdate(resp);
  }

  @UseGuards(WsJwtAccessTokenAuthGuard)
  @SubscribeMessage(SocketRequestEvent.STRATEGO_PLAY_MOVE)
  async playMove(
    @ConnectedSocket() client: JwtSocket,
    @MessageBody()
    data: SocketIncomingEventMap[SocketRequestEvent.STRATEGO_PLAY_MOVE],
  ) {
    const uid = client.user.uid;
    const resp = await this.strategoService.playMove(
      uid,
      data.gameId,
      data.from,
      data.to,
    );

    this.sendGameUpdate(resp);
  }

  async sendGameUpdate(game: StrategoGame) {
    this.server
      .to(game.gameId)
      .emit(SocketResponseEvent.STRATEGO_GAME_UPDATED, game);
  }
}
