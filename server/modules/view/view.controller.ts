import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  async render(@Req() req: Request, @Res() res: Response) {
    const templatePath = this.getTemplatePath();
    const template = await readFile(templatePath, 'utf8');
    const platformData = req.__platform_data__ ?? {};
    const appName = process.env.APP_NAME || 'Game Events Calendar';
    const appDescription =
      process.env.APP_DESCRIPTION || 'Game activity calendar preview';

    const values: Record<string, string> = {
      appName,
      appAvatar: '/favicon.svg',
      appDescription,
      currentUrl: req.originalUrl,
      csrfToken: String(platformData.csrfToken ?? ''),
      userId: String(platformData.userId ?? ''),
      tenantId: String(platformData.tenantId ?? ''),
      appId: String(platformData.appId ?? ''),
      environment: process.env.NODE_ENV || 'development',
      __platform__: JSON.stringify(platformData).replace(/</g, '\\u003c'),
    };

    this.setLocalCsrfCookie(res, values.csrfToken);
    res.type('html').send(this.renderTemplate(template, values));
  }

  private renderTemplate(template: string, values: Record<string, string>) {
    let html = this.injectViteReactRefreshPreamble(
      this.sanitizeGeneratedRuntime(template),
    );

    for (const [key, value] of Object.entries(values)) {
      html = html.split(`{{{${key}}}}`).join(value);
      html = html.split(`{{${key}}}`).join(value);
    }

    return html;
  }

  private sanitizeGeneratedRuntime(html: string) {
    return html.replace(
      /err\.stack\+='[\r\n]+\s+at '\+e\.filename/g,
      "err.stack+='\\n    at '+e.filename",
    );
  }

  private injectViteReactRefreshPreamble(html: string) {
    if (
      process.env.NODE_ENV === 'production' ||
      html.includes('__vite_plugin_react_preamble_installed__')
    ) {
      return html;
    }

    const preamble = `  <script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>`;

    return html.replace(
      '  <script type="module" src="/client/src/index.tsx"></script>',
      `${preamble}\n  <script type="module" src="/client/src/index.tsx"></script>`,
    );
  }

  private getTemplatePath() {
    const htmlPath =
      process.env.NODE_ENV === 'production'
        ? 'dist/client/index.html'
        : 'client/index.html';

    return join(process.cwd(), htmlPath);
  }

  private setLocalCsrfCookie(res: Response, csrfToken: string) {
    if (process.env.NODE_ENV === 'production' || !csrfToken) {
      return;
    }

    res.cookie('suda-csrf-token', csrfToken, {
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
  }
}
