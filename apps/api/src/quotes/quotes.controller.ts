import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto, UpdateQuoteDto, QuoteListQueryDto, RespondQuoteDto } from "./quotes.dto";
import { AuthGuard, RolesGuard, Roles, CurrentUser, CurrentOrg, PaginationQueryDto } from "../common";

@Controller("quotes")
@UseGuards(AuthGuard, RolesGuard)
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @Roles("owner", "admin")
  create(@Body() dto: CreateQuoteDto, @CurrentOrg("id") orgId: string) {
    return this.quotesService.create(dto, orgId);
  }

  @Get()
  @Roles("owner", "admin")
  findAll(@CurrentOrg("id") orgId: string, @Query() query: QuoteListQueryDto) {
    return this.quotesService.findAll(orgId, query);
  }

  @Get("mine")
  findMine(
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Query("projectId") projectId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.quotesService.findMine(userId, orgId, projectId, pagination.page, pagination.limit);
  }

  @Post("mine/:id/respond")
  respond(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Body() dto: RespondQuoteDto,
  ) {
    return this.quotesService.respond(id, userId, orgId, dto);
  }

  @Get(":id")
  @Roles("owner", "admin")
  findOne(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.quotesService.findOne(id, orgId);
  }

  @Put(":id")
  @Roles("owner", "admin")
  update(@Param("id") id: string, @Body() dto: UpdateQuoteDto, @CurrentOrg("id") orgId: string) {
    return this.quotesService.update(id, dto, orgId);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  remove(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.quotesService.remove(id, orgId);
  }
}
