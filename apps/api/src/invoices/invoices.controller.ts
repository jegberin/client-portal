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
import { InvoicesService } from "./invoices.service";
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceListQueryDto,
} from "./invoices.dto";
import {
  AuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  CurrentOrg,
  PaginationQueryDto,
  sanitizeFilename,
} from "../common";
import type { StorageProvider } from "../files/storage/storage.interface";
import { STORAGE_PROVIDER } from "../files/storage/storage.interface";
import { randomUUID } from "crypto";
import { extname } from "path";

@Controller("invoices")
@UseGuards(AuthGuard, RolesGuard)
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  @Post()
  @Roles("owner", "admin")
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.invoicesService.create(dto, orgId);
  }

  @Get()
  @Roles("owner", "admin")
  findAll(
    @CurrentOrg("id") orgId: string,
    @Query() query: InvoiceListQueryDto,
  ) {
    return this.invoicesService.findAll(orgId, query);
  }

  @Get("stats")
  @Roles("owner", "admin")
  getStats(
    @CurrentOrg("id") orgId: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.invoicesService.getStats(orgId, projectId);
  }

  @Get("mine")
  findMine(
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.invoicesService.findMine(
      userId,
      orgId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get("mine/:id/pdf")
  async downloadMinePdf(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOneMine(id, userId, orgId);
    if (!invoice.pdfFileKey) {
      throw new NotFoundException("No PDF attached to this invoice");
    }
    const { body, contentType } = await this.storage.download(invoice.pdfFileKey);
    const safeName = sanitizeFilename(invoice.pdfFileName || `${invoice.invoiceNumber}.pdf`);
    res.setHeader("Content-Type", contentType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    body.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    body.pipe(res);
  }

  @Get("mine/:id")
  findOneMine(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.invoicesService.findOneMine(id, userId, orgId);
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

    const invoice = await this.invoicesService.findOne(id, orgId);

    if (invoice.pdfFileKey) {
      await this.storage.delete(invoice.pdfFileKey).catch(() => {});
    }

    const safeName = sanitizeFilename(file.originalname);
    const storageKey = `${orgId}/invoices/${randomUUID()}-${safeName}`;
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    return this.invoicesService.setPdf(id, orgId, storageKey, safeName);
  }

  @Delete(":id/pdf")
  @Roles("owner", "admin")
  async deletePdf(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    const invoice = await this.invoicesService.findOne(id, orgId);
    if (invoice.pdfFileKey) {
      await this.storage.delete(invoice.pdfFileKey).catch(() => {});
    }
    return this.invoicesService.setPdf(id, orgId, null, null);
  }

  @Get(":id/pdf")
  @Roles("owner", "admin")
  async downloadPdf(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(id, orgId);
    if (!invoice.pdfFileKey) {
      throw new NotFoundException("No PDF attached to this invoice");
    }
    const { body, contentType } = await this.storage.download(invoice.pdfFileKey);
    const safeName = sanitizeFilename(invoice.pdfFileName || `${invoice.invoiceNumber}.pdf`);
    res.setHeader("Content-Type", contentType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    body.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    body.pipe(res);
  }

  @Get(":id")
  @Roles("owner", "admin")
  findOne(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.invoicesService.findOne(id, orgId);
  }

  @Put(":id")
  @Roles("owner", "admin")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.invoicesService.update(id, dto, orgId);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  remove(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.invoicesService.remove(id, orgId);
  }
}
