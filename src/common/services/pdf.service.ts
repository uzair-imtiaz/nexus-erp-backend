import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { chromium, Browser, BrowserContext } from 'playwright';
import * as path from 'path';
import * as ejs from 'ejs';
import * as fs from 'fs';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private templateDir: string;

  constructor() {
    this.templateDir = path.join(process.cwd(), 'src/templates');
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      await this.launchBrowser();
    }
    return this.browser!;
  }

  private async launchBrowser() {
    try {
      this.browser = await chromium.launch({ args: ['--no-sandbox'] });
      this.browser.on('disconnected', () => {
        this.logger.warn('Browser disconnected');
        this.browser = null;
      });
      this.logger.log('Chromium browser launched');
    } catch (error) {
      this.logger.error('Failed to launch Chromium browser', error);
      throw error;
    }
  }

  async renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(this.templateDir, `${templateName}.ejs`);

    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Template not found: ${templatePath}`);
      throw new Error(`Template not found: ${templatePath}`);
    }

    try {
      const templateContent = await fs.promises.readFile(templatePath, 'utf8');
      return ejs.render(templateContent, data);
    } catch (error) {
      this.logger.error(`Failed to render template: ${templateName}`, error);
      throw error;
    }
  }

  async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluateHandle('document.fonts.ready');

      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });
      return buffer;
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw error;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      this.logger.log('Closing browser on module destroy');
      await this.browser.close();
    }
  }
}
