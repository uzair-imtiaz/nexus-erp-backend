import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  // should it be uuid or string
  parentAccount?: string;
}
