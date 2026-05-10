import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InterviewBankService } from './interview-bank.service';
import { CreateInterviewBankDto } from './dto/create-interview-bank.dto';
import { UpdateInterviewBankDto } from './dto/update-interview-bank.dto';

@Controller('interview-bank')
export class InterviewBankController {
  constructor(private readonly interviewBankService: InterviewBankService) {}

  @Post()
  create(@Body() createInterviewBankDto: CreateInterviewBankDto) {
    return this.interviewBankService.create(createInterviewBankDto);
  }

  @Get()
  findAll() {
    return this.interviewBankService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interviewBankService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInterviewBankDto: UpdateInterviewBankDto,
  ) {
    return this.interviewBankService.update(+id, updateInterviewBankDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interviewBankService.remove(+id);
  }
}
