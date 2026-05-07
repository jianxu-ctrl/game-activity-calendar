import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GameActivityController } from './game-activity.controller';
import { GameActivityService } from './game-activity.service';
import { GameActivityAutomationService } from './game-activity.automation';
import { LocalGameActivityStore } from './local-game-activity.store';

@Module({
  imports: [HttpModule],
  controllers: [GameActivityController],
  providers: [
    GameActivityService,
    GameActivityAutomationService,
    LocalGameActivityStore,
  ],
  exports: [
    GameActivityService,
    GameActivityAutomationService,
    LocalGameActivityStore,
  ],
})
export class GameActivityModule {}
