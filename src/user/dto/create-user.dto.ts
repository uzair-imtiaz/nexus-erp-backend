import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(150)
  firstName: string;

  @IsString()
  @MaxLength(150)
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(24)
  password: string;

  @IsString()
  @IsNotEmpty()
  tenantName: string;
}
