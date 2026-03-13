import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../common";

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  projectId!: string;
}

export class UpdateQuoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @IsIn(["draft", "sent", "accepted", "declined"])
  status?: string;
}

export class RespondQuoteDto {
  @IsString()
  @IsIn(["accepted", "declined"])
  response!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;
}

export class QuoteListQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  @IsIn(["draft", "sent", "accepted", "declined"])
  status?: string;
}
