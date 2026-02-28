import * as expenseModel from '../../model/expense.model';
import {
  IsBoolean,
  isNotEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFinanceDto {
  @IsNotEmpty()
  @IsString()
  title: string;
  @IsNotEmpty()
  @IsNumber()
  amount: number;
  @IsNotEmpty()
  @IsString()
  category: expenseModel.ExpenseCategory;
  @IsNotEmpty()
  @IsString()
  date: string;
  @IsOptional()
  @IsString()
  notes?: string;
  @IsOptional()
  @IsString()
  source?: 'manual' | 'sms';
  @IsOptional()
  @IsString()
  createdAt?: string;
  @IsOptional()
  @IsString()
  updatedAt?: string;
  @IsOptional()
  @IsString()
  deletedAt?: string;
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
  @IsOptional()
  cardType: string;
  @IsNotEmpty()
  @IsString()
  type:
    | 'expense'
    | 'debt'
    | 'budget'
    | 'income'
    | 'construction'
    | 'home_budget';
}
