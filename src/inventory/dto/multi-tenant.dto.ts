import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class MultiUnitDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    factor: number;
}