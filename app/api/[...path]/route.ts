import { env } from 'cloudflare:workers';
import { createSurveyHandler } from '../../../lib/survey-api';

export const dynamic = 'force-dynamic';

function handle(request: Request) {
  return createSurveyHandler(env)(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
