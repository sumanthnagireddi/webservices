import { Module } from '@nestjs/common';
import {  TestService } from './test.service';
import { TestController } from './test.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Technology, TechnologySchema } from './technologies.schema';
import { Test, TestSchema } from './test.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Test.name, schema: TestSchema },
    ]),
  ],
  providers: [TestService],
  controllers: [TestController],
  exports: [TestService],
})
export class TestModule {}
