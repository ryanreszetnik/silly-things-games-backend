import { Module } from '@nestjs/common';
import { StrategoController } from './stratego.controller';
import { StrategoService } from './stratego.service';
import { DynamoDBModule } from 'src/dynamodb/dynamodb.module';
import { StrategoSocketGateway } from './stratego-socket.gateway';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [DynamoDBModule, UsersModule],
  controllers: [StrategoController],
  providers: [StrategoService, StrategoSocketGateway],
})
export class StrategoModule {}
