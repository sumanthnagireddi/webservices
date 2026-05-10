import { IsNotEmpty } from 'class-validator';

export class CopyBudgetDto {
  @IsNotEmpty()
  fromKey: string;

  @IsNotEmpty()
  toKey: string;
}
