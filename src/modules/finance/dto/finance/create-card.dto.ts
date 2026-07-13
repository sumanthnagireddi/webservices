import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateCardDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(4)
  lastFour: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(31)
  billingDay: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  creditLimit: number;
}
