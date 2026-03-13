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
import { DecisionsService } from "./decisions.service";
import { CreateDecisionDto, UpdateDecisionDto, DecisionListQueryDto, RespondDecisionDto } from "./decisions.dto";
import { AuthGuard, RolesGuard, Roles, CurrentUser, CurrentOrg, PaginationQueryDto } from "../common";

@Controller("decisions")
@UseGuards(AuthGuard, RolesGuard)
export class DecisionsController {
  constructor(private decisionsService: DecisionsService) {}

  @Post()
  @Roles("owner", "admin")
  create(@Body() dto: CreateDecisionDto, @CurrentOrg("id") orgId: string) {
    return this.decisionsService.create(dto, orgId);
  }

  @Get()
  @Roles("owner", "admin")
  findAll(@CurrentOrg("id") orgId: string, @Query() query: DecisionListQueryDto) {
    return this.decisionsService.findAll(orgId, query);
  }

  @Get("mine")
  findMine(
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Query("projectId") projectId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.decisionsService.findMine(userId, orgId, projectId, pagination.page, pagination.limit);
  }

  @Post("mine/:id/respond")
  respond(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Body() dto: RespondDecisionDto,
  ) {
    return this.decisionsService.respond(id, userId, orgId, dto);
  }

  @Get(":id")
  @Roles("owner", "admin")
  findOne(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.decisionsService.findOne(id, orgId);
  }

  @Put(":id")
  @Roles("owner", "admin")
  update(@Param("id") id: string, @Body() dto: UpdateDecisionDto, @CurrentOrg("id") orgId: string) {
    return this.decisionsService.update(id, dto, orgId);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  remove(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.decisionsService.remove(id, orgId);
  }
}
