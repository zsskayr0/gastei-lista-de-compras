import { Module } from '@nestjs/common';
import { UsersController, UserMediaController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UserMediaController],
  providers: [UsersService],
})
export class UsersModule {}
