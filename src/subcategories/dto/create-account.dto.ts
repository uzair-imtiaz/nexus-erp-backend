import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsUUID()
  parentAccount?: string;
}
