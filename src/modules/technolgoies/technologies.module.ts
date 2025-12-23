import { Module } from '@nestjs/common';
import { TechnologyService } from './technologies.service';
import { TechnologyController } from './technologies.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Technology, TechnologySchema } from './technologies.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Technology.name, schema: TechnologySchema },
    ]),
  ],
  providers: [TechnologyService],
  controllers: [TechnologyController],
  exports: [TechnologyService],
})
export class TechnologiesModule {}
