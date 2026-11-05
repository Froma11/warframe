const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    const browser = await chromium.launch({ channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 1200, height: 680 } });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #04070e;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            width: 100%;
            max-width: 1080px;
            background: linear-gradient(180deg, #0d1422 0%, #070b14 100%);
            border: 1.5px solid rgba(0, 229, 255, 0.45);
            border-radius: 28px;
            padding: 36px 44px;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(0, 229, 255, 0.18);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 22px;
            margin-bottom: 26px;
          }
          .title {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 2px;
            color: #ffffff;
            text-transform: uppercase;
          }
          .title span { color: #00e5ff; }
          .badge {
            background: rgba(0, 229, 255, 0.12);
            border: 1px solid rgba(0, 229, 255, 0.4);
            color: #00e5ff;
            padding: 8px 18px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            padding: 14px 18px;
            font-size: 13px;
            color: #a3a29d;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
          }
          td {
            padding: 18px 18px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 17px;
          }
          .rank { font-weight: 700; color: #ffffff; }
          .rank-5 { color: #00e5ff; font-weight: 800; }
          .pips { display: inline-flex; gap: 6px; }
          .pip {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
          }
          .pip.active {
            background: #00e5ff;
            box-shadow: 0 0 10px #00e5ff;
          }
          .next {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 10px;
            background: rgba(16, 185, 129, 0.18);
            border: 1px solid rgba(16, 185, 129, 0.45);
            color: #34d399;
            font-weight: 700;
            font-size: 15px;
          }
          .next-none { color: #64748b; font-weight: 700; }
          .total {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
          }
          .total-5 { color: #00e5ff; font-size: 26px; }
          .footer {
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="title">
              УЛУЧШЕНИЕ <span>МИСТИФИКАТОРОВ</span>
            </div>
            <div class="badge">R5 = 21 КОПИЯ</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>РАНГ</th>
                <th style="text-align: center">ИНДИКАТОР</th>
                <th style="text-align: center">НА СЛЕДУЮЩИЙ</th>
                <th style="text-align: right">ВСЕГО КОПИЙ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="rank">0 РАНГ (базовый)</td>
                <td style="text-align: center"><div class="pips"><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div></td>
                <td style="text-align: center"><span class="next">+2</span></td>
                <td style="text-align: right" class="total">1 <span style="font-size: 14px; color: #64748b; font-weight: 500">шт</span></td>
              </tr>
              <tr>
                <td class="rank">1 РАНГ</td>
                <td style="text-align: center"><div class="pips"><div class="pip active"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div></td>
                <td style="text-align: center"><span class="next">+3</span></td>
                <td style="text-align: right" class="total">3 <span style="font-size: 14px; color: #64748b; font-weight: 500">шт</span></td>
              </tr>
              <tr>
                <td class="rank">2 РАНГ</td>
                <td style="text-align: center"><div class="pips"><div class="pip active"></div><div class="pip active"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div></td>
                <td style="text-align: center"><span class="next">+4</span></td>
                <td style="text-align: right" class="total">6 <span style="font-size: 14px; color: #64748b; font-weight: 500">шт</span></td>
              </tr>
              <tr>
                <td class="rank">3 РАНГ</td>
                <td style="text-align: center"><div class="pips"><div class="pip active"></div><div class="pip active"></div><div class="pip active"></div><div class="pip"></div><div class="pip"></div></div></td>
                <td style="text-align: center"><span class="next">+5</span></td>
                <td style="text-align: right" class="total">10 <span style="font-size: 14px; color: #64748b; font-weight: 500">шт</span></td>
              </tr>
              <tr>
                <td class="rank">4 РАНГ</td>
                <td style="text-align: center"><div class="pips"><div class="pip active"></div><div class="pip active"></div><div class="pip active"></div><div class="pip active"></div><div class="pip"></div></div></td>
                <td style="text-align: center"><span class="next">+6</span></td>
                <td style="text-align: right" class="total">15 <span style="font-size: 14px; color: #64748b; font-weight: 500">шт</span></td>
              </tr>
              <tr style="background: rgba(0, 229, 255, 0.04)">
                <td class="rank rank-5">5 РАНГ (макс.)</td>
                <td style="text-align: center"><div class="pips"><div class="pip active"></div><div class="pip active"></div><div class="pip active"></div><div class="pip active"></div><div class="pip active"></div></div></td>
                <td style="text-align: center"><span class="next-none">—</span></td>
                <td style="text-align: right" class="total total-5">21 <span style="font-size: 16px; color: #00e5ff; font-weight: 600">шт</span></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <span>WARFRAME MARKET ANALYTICS // GUIDE</span>
            <span>Формула слияния: (R+1)*(R+2)/2</span>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const element = await page.$('.card');
    await element.screenshot({ path: './client/public/arcane_upgrade_guide.png' });
    console.log('Successfully generated ./client/public/arcane_upgrade_guide.png');
    await browser.close();
  } catch (err) {
    console.error('Error generating guide png:', err);
  }
})();
