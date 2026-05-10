import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { Finance, FinanceSchema } from './schema/finance.schema';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService],
  imports: [
    MongooseModule.forFeature([{ name: Finance.name, schema: FinanceSchema }]),
  ],
})
export class FinanceModule {}
