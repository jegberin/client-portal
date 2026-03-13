import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../common";

export class DecisionOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  label!: string;
}

export class CreateDecisionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsIn(["multiple_choice", "open"])
  type!: string;

  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DecisionOptionDto)
  @IsOptional()
  options?: DecisionOptionDto[];
}

export class UpdateDecisionDto {
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
  @IsIn(["open", "closed"])
  status?: string;
}

export class RespondDecisionDto {
  @IsString()
  @IsOptional()
  selectedOptionId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  openResponse?: string;
}

export class DecisionListQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  @IsIn(["open", "closed"])
  status?: string;
}
