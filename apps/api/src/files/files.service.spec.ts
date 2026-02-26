import { describe, expect, it, mock, beforeEach } from "bun:test";
import { FilesService } from "./files.service";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Readable } from "stream";

const mockStorage = {
  upload: mock(() => Promise.resolve()),
  download: mock(() =>
    Promise.resolve({
      body: Readable.from(Buffer.from("data")),
      contentType: "text/plain",
    }),
  ),
  getSignedUrl: mock(() => Promise.resolve("https://example.com/signed")),
  delete: mock(() => Promise.resolve()),
};

const mockPrisma = {
  project: {
    findFirst: mock(() =>
      Promise.resolve({ id: "proj-1", organizationId: "org-1" }),
    ),
  },
  file: {
    create: mock((args: any) =>
      Promise.resolve({ id: "file-1", ...args.data }),
    ),
    findMany: mock(() => Promise.resolve([])),
    findFirst: mock(() => Promise.resolve(null)),
    delete: mock(() => Promise.resolve()),
    deleteMany: mock(() => Promise.resolve({ count: 1 })),
  },
  projectClient: {
    findFirst: mock(() => Promise.resolve(null)),
  },
  $transaction: mock((fn: any) => fn(mockPrisma)),
};

const mockConfig = {
  get: (key: string, fallback?: string) => {
    if (key === "MAX_FILE_SIZE_MB") return "50";
    return fallback;
  },
};

describe("FilesService", () => {
  let service: FilesService;

  beforeEach(() => {
    service = new FilesService(
      mockPrisma as any,
      mockConfig as any,
      mockStorage as any,
    );
  });

  it("upload rejects files over size limit", async () => {
    const file = {
      originalname: "big.zip",
      buffer: Buffer.alloc(0),
      mimetype: "application/zip",
      size: 100 * 1024 * 1024, // 100MB
    } as any;

    try {
      await service.upload(file, "proj-1", "org-1", "user-1");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
    }
  });

  it("upload creates file record", async () => {
    const file = {
      originalname: "doc.pdf",
      buffer: Buffer.from("pdf content"),
      mimetype: "application/pdf",
      size: 1024,
    } as any;

    const result = await service.upload(file, "proj-1", "org-1", "user-1");
    expect(result.filename).toBe("doc.pdf");
    expect(mockStorage.upload).toHaveBeenCalled();
  });

  it("download throws when file not found", async () => {
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(null));

    try {
      await service.download("nonexistent", "org-1", "user-1", "owner");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
    }
  });

  it("download allows owner to access any file", async () => {
    const file = {
      id: "file-1",
      filename: "doc.pdf",
      storageKey: "org/proj/doc.pdf",
      projectId: "proj-1",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));

    const result = await service.download("file-1", "org-1", "user-1", "owner");
    expect(result.filename).toBe("doc.pdf");
  });

  it("download allows admin to access any file", async () => {
    const file = {
      id: "file-1",
      filename: "doc.pdf",
      storageKey: "org/proj/doc.pdf",
      projectId: "proj-1",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));

    const result = await service.download("file-1", "org-1", "user-1", "admin");
    expect(result.filename).toBe("doc.pdf");
  });

  it("download allows member assigned to project", async () => {
    const file = {
      id: "file-1",
      filename: "doc.pdf",
      storageKey: "org/proj/doc.pdf",
      projectId: "proj-1",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));
    mockPrisma.projectClient.findFirst.mockReturnValue(
      Promise.resolve({ id: "pc-1", projectId: "proj-1", userId: "user-1" }),
    );

    const result = await service.download("file-1", "org-1", "user-1", "member");
    expect(result.filename).toBe("doc.pdf");
  });

  it("download rejects member not assigned to project", async () => {
    const file = {
      id: "file-1",
      filename: "doc.pdf",
      storageKey: "org/proj/doc.pdf",
      projectId: "proj-1",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));
    mockPrisma.projectClient.findFirst.mockReturnValue(Promise.resolve(null));

    try {
      await service.download("file-1", "org-1", "user-1", "member");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("getDownloadUrl rejects member not assigned to project", async () => {
    const file = {
      id: "file-1",
      filename: "doc.pdf",
      storageKey: "org/proj/doc.pdf",
      projectId: "proj-1",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));
    mockPrisma.projectClient.findFirst.mockReturnValue(Promise.resolve(null));

    try {
      await service.getDownloadUrl("file-1", "org-1", "user-1", "member");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("getDownloadUrl allows admin to access any file", async () => {
    const file = {
      id: "file-1",
      filename: "doc.pdf",
      storageKey: "org/proj/doc.pdf",
      projectId: "proj-1",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));

    const result = await service.getDownloadUrl("file-1", "org-1", "user-1", "admin");
    expect(result.url).toBe("/api/files/file-1/download");
  });

  it("remove deletes from storage and db", async () => {
    const file = {
      id: "file-1",
      storageKey: "org/proj/file.pdf",
      organizationId: "org-1",
    };
    mockPrisma.file.findFirst.mockReturnValue(Promise.resolve(file));

    await service.remove("file-1", "org-1");
    expect(mockStorage.delete).toHaveBeenCalled();
    expect(mockPrisma.file.deleteMany).toHaveBeenCalled();
  });
});
