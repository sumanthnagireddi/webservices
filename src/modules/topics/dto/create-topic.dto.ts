import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTopicsDTO {
  @IsString()
  @IsNotEmpty()
  technologyId: string;
  
  @IsString()
  @IsNotEmpty()
  name: string;
}
