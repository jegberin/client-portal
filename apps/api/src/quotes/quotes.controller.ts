import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto, UpdateQuoteDto, QuoteListQueryDto, RespondQuoteDto } from "./quotes.dto";
import { AuthGuard, RolesGuard, Roles, CurrentUser, CurrentOrg, PaginationQueryDto, sanitizeFilename } from "../common";
import type { StorageProvider } from "../files/storage/storage.interface";
import { STORAGE_PROVIDER } from "../files/storage/storage.interface";
import { extname } from "path";
import { randomUUID } from "crypto";

@Controller("quotes")
@UseGuards(AuthGuard, RolesGuard)
export class QuotesController {
  constructor(
    private quotesService: QuotesService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  @Post()
  @Roles("owner", "admin")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  async create(
    @Body() dto: CreateQuoteDto,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number } | undefined,
    @CurrentOrg("id") orgId: string,
  ) {
    let storageKey: string | undefined;
    let safeName: string | undefined;

    if (file) {
      const ext = extname(file.originalname).toLowerCase();
      if (ext !== ".pdf") throw new BadRequestException("Only PDF files are allowed");

      const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      if (file.buffer.length < 4 || !file.buffer.subarray(0, 4).equals(pdfMagic)) {
        throw new BadRequestException("File does not appear to be a valid PDF");
      }

      safeName = sanitizeFilename(file.originalname);
      storageKey = `${orgId}/quotes/${randomUUID()}-${safeName}`;
      await this.storage.upload(storageKey, file.buffer, file.mimetype);
    }

    const quote = await this.quotesService.create(dto, orgId);

    if (storageKey && safeName) {
      return this.quotesService.setPdf(quote.id, orgId, storageKey, safeName);
    }

    return quote;
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

  @Get("mine/:id/pdf")
  async downloadMinePdf(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOneMine(id, userId, orgId);
    if (!quote.pdfFileKey) {
      throw new NotFoundException("No PDF attached to this quote");
    }
    const { body, contentType } = await this.storage.download(quote.pdfFileKey);
    const safeName = sanitizeFilename(quote.pdfFileName || `${quote.title}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    body.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    body.pipe(res);
  }

  @Post(":id/respond")
  respondById(
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

  @Post(":id/pdf")
  @Roles("owner", "admin")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadPdf(
    @Param("id") id: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    @CurrentOrg("id") orgId: string,
  ) {
    if (!file) throw new BadRequestException("No file provided");
    const ext = extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") throw new BadRequestException("Only PDF files are allowed");

    const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    if (file.buffer.length < 4 || !file.buffer.subarray(0, 4).equals(pdfMagic)) {
      throw new BadRequestException("File does not appear to be a valid PDF");
    }

    const quote = await this.quotesService.findOne(id, orgId);
    if (quote.pdfFileKey) {
      await this.storage.delete(quote.pdfFileKey).catch(() => {});
    }

    const safeName = sanitizeFilename(file.originalname);
    const storageKey = `${orgId}/quotes/${randomUUID()}-${safeName}`;
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    return this.quotesService.setPdf(id, orgId, storageKey, safeName);
  }

  @Delete(":id/pdf")
  @Roles("owner", "admin")
  async deletePdf(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    const quote = await this.quotesService.findOne(id, orgId);
    if (quote.pdfFileKey) {
      await this.storage.delete(quote.pdfFileKey).catch(() => {});
    }
    return this.quotesService.setPdf(id, orgId, null, null);
  }

  @Get(":id/pdf")
  @Roles("owner", "admin")
  async downloadPdf(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOne(id, orgId);
    if (!quote.pdfFileKey) {
      throw new NotFoundException("No PDF attached to this quote");
    }
    const { body, contentType } = await this.storage.download(quote.pdfFileKey);
    const safeName = sanitizeFilename(quote.pdfFileName || `${quote.title}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    body.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    body.pipe(res);
  }

  @Put(":id")
  @Roles("owner", "admin")
  update(@Param("id") id: string, @Body() dto: UpdateQuoteDto, @CurrentOrg("id") orgId: string) {
    return this.quotesService.update(id, dto, orgId);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  async remove(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    const quote = await this.quotesService.findOne(id, orgId);
    if (quote.pdfFileKey) {
      await this.storage.delete(quote.pdfFileKey).catch(() => {});
    }
    return this.quotesService.remove(id, orgId);
  }
}
