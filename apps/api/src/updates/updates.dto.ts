import { IsString, MaxLength } from "class-validator";

export class CreateUpdateDto {
  @IsString()
  @MaxLength(5000)
  content: string;
}
