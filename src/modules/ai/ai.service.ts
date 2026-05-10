import { Injectable } from '@nestjs/common';
import { CreateAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import { FinanceRagAgent } from './agents/finance.agent';
import { NVIDIA_MODELS } from './searvices/nvidia-llm.service';

@Injectable()
export class AiService {
  constructor(private financeRag: FinanceRagAgent) {}
  create(createAiDto: CreateAiDto) {
    return 'This action adds a new ai';
  }
  addExpenseWithAI(message: string) {
    console.log('Processing message with AI:', message);
    this.financeRag.processMessage(message);
    return { success: true, message: 'Expense processed successfully' };
  }

  findAll() {
    return NVIDIA_MODELS;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: UpdateAiDto) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }
}
