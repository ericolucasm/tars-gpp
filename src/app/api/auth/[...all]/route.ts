import { auth } from '@/lib/auth';

// Endpoints do login (início do OAuth, retorno do Google, sessão, saída).
export const GET = (req: Request) => auth().handler(req);
export const POST = (req: Request) => auth().handler(req);
