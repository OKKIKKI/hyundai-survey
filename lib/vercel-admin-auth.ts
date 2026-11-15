import { createHash, timingSafeEqual } from 'node:crypto';

export function authenticateVercelAdmin(request: Request) {
  const username = process.env.SURVEY_ADMIN_USERNAME;
  const password = process.env.SURVEY_ADMIN_PASSWORD;
  if (!username || !password) return null;

  const expected = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
  const supplied = request.headers.get('authorization') ?? '';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(expected), digest(supplied)) ? username : null;
}

export function adminLoginRequired() {
  return Response.json({ error: '관리자 로그인이 필요합니다.' }, {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="OKIKI Admin", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}
