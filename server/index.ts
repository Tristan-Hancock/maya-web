// import 'dotenv/config';
// import express from 'express';
// import cors from 'cors';
// import morgan from 'morgan';
// import OpenAI from 'openai';
// import * as jose from 'jose';

// const app = express();
// const PORT = Number(process.env.PORT ?? 3001);
// const jwks = jose.createRemoteJWKSet(
//     new URL(`https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
//   );
// app.use(morgan('dev'));
// app.use(express.json({ limit: '1mb' }));

// // If you prefer CORS (useful when NOT proxying via Vite)
// app.use(
//   cors({
//     origin: ['http://localhost:5173'],
//     credentials: false,
//   })
// );
// async function verifyCognitoJwt(req: any, res: any, next: any) {
//     try {
//       const auth = req.headers.authorization || '';
//       const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
//       if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  
//       const { payload } = await jose.jwtVerify(token, jwks, {
//         algorithms: ['RS256'],
//         issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
//       });
  
//       // attach user info to request
//       req.user = {
//         sub: payload.sub,
//         email: payload.email,
//         username: payload['cognito:username'],
//       };
//       next();
//     } catch (e: any) {
//       console.error('JWT verify failed:', e?.message);
//       return res.status(401).json({ error: 'Invalid or expired token' });
//     }
//   }

// app.get('/api/health', (_req, res) => {
//   res.json({ ok: true, time: new Date().toISOString() });
// });

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // Simple, non-streaming chat endpoint.
// // Send: { messages: [{role:'user'|'system'|'assistant', content:string}[]] }
// app.post('/api/chat', async (req, res) => {
//   try {
//     const { messages = [] } = req.body ?? {};
//     if (!Array.isArray(messages) || messages.length === 0) {
//       return res.status(400).json({ error: 'messages[] required' });
//     }

//     // Use Responses API (current primary)…
//     const response = await client.responses.create({
//       model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
//       input: messages.map(m => ({ role: m.role, content: m.content })),
//     });

//     // one plain string back is easy for your UI:
//     // output_text is a convenience that joins the text parts
//     // (available on the SDK)
//     const text = response.output_text ?? '';
//     res.json({ text, raw: response });
//   } catch (err: any) {
//     console.error(err);
//     res.status(500).json({ error: err?.message ?? 'Server error' });
//   }
// });

// app.listen(PORT, () => {
//   // console.log(`API listening on http://localhost:${PORT}`);
// });
