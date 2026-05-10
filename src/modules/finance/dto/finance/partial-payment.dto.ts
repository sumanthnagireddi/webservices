import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class PartialPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;
}
