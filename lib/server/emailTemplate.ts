import { ArtStyle, styleLabel } from '../../src/models/Artwork';
import { GenreProfile } from '../../src/data/genreProfiles';

export function weeklyEmailHtml(params: {
  style: ArtStyle;
  profile: GenreProfile;
  imageUrl: string;
  siteUrl: string;
  kind?: 'welcome' | 'weekly';
}): string {
  const { style, profile, imageUrl, siteUrl, kind = 'weekly' } = params;
  const heading = kind === 'welcome' ? `Welcome — here's your first ${styleLabel(style)} piece` : `Your weekly ${styleLabel(style)} piece`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#111018;color:#eeeaf5;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:2rem 1rem;">
      <tr><td style="text-align:center;padding-bottom:1.5rem;">
        <p style="color:#d5a8ff;text-transform:uppercase;letter-spacing:.15em;font-size:.7rem;font-weight:700;margin:0 0 .4rem;">The Living Museum</p>
        <h1 style="margin:0;font-size:1.4rem;">${heading}</h1>
        <p style="color:#aaa0bc;font-size:.9rem;margin:.5rem 0 0;">In the spirit of ${profile.realName}</p>
      </td></tr>
      <tr><td style="padding-bottom:1.5rem;">
        <img src="${imageUrl}" alt="This week's ${styleLabel(style)} piece" width="560" style="display:block;width:100%;height:auto;border-radius:12px;" />
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:1.5rem;">
        <a href="${siteUrl}" style="display:inline-block;background:#8f5fc4;color:#fff;text-decoration:none;padding:.7rem 1.4rem;border-radius:8px;font-weight:600;">Watch the museum evolve</a>
      </td></tr>
      <tr><td style="text-align:center;color:#786d87;font-size:.75rem;">
        <a href="${siteUrl}/unsubscribe" style="color:#786d87;">Manage your subscription</a>
      </td></tr>
    </table>
  </body>
</html>`;
}
