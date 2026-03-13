import { Transform } from "class-transformer";
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
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;

  @Transform(({ value }) => (typeof value === "string" ? parseInt(value, 10) : value))
  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;

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

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @IsIn(["pending", "accepted", "declined"])
  status?: string;
}

export class RespondQuoteDto {
  @IsString()
  @IsOptional()
  @IsIn(["accepted", "declined"])
  response?: string;

  @IsString()
  @IsOptional()
  @IsIn(["accepted", "declined"])
  decision?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;

  get resolvedResponse(): string | undefined {
    return this.response || this.decision || undefined;
  }
}

export class QuoteListQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  @IsIn(["pending", "accepted", "declined"])
  status?: string;
}
