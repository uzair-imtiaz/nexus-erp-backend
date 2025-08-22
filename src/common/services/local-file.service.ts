import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalFileService {
  private basePath = path.join(process.cwd(), 'storage', 'pdfs');

  constructor() {
    fs.mkdir(this.basePath, { recursive: true }).catch(console.error);
  }

  getFilePath(fileName: string) {
    return path.join(this.basePath, fileName);
  }

  async save(fileName: string, buffer: Buffer) {
    await fs.writeFile(this.getFilePath(fileName), buffer);
  }

  async exists(fileName: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(fileName));
      return true;
    } catch {
      return false;
    }
  }

  async read(fileName: string): Promise<Buffer> {
    return fs.readFile(this.getFilePath(fileName));
  }

  async delete(fileName: string) {
    if (await this.exists(fileName)) {
      await fs.unlink(this.getFilePath(fileName));
    }
  }
}
