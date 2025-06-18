export interface BulkHandler {
  importFile(file: Express.Multer.File): Promise<{ imported: number }>;
}
