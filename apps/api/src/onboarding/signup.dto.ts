import { IsString, IsEmail, MinLength, MaxLength, Matches } from "class-validator";

export class SignupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  @Matches(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  @Matches(/[0-9]/, { message: "Password must contain at least one number" })
  @Matches(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
  password: string;

  @IsString()
  @MinLength(1)
  orgName: string;
}
