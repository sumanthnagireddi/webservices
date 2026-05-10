import { PartialType } from '@nestjs/mapped-types';
import { CreateInterviewBankDto } from './create-interview-bank.dto';

export class UpdateInterviewBankDto extends PartialType(
  CreateInterviewBankDto,
) {}
