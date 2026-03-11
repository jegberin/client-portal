import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ValidateIf((o) => o.dueDate !== null)
  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}

export class ReorderTasksDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  taskIds!: string[];
}
