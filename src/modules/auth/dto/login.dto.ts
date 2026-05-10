import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDataDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  // @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  // @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
