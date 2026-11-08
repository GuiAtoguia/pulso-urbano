// Servidor estático local opcional. Não instala dependências nem chama APIs próprias.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
createServer(async (req,res)=>{
  if(req.method !== 'GET' && req.method !== 'HEAD'){res.writeHead(405);return res.end();}
  try {
    const u = new URL(req.url,`http://127.0.0.1:${port}`);
    const decoded = decodeURIComponent(u.pathname);
    if (decoded.includes('\\') || decoded.includes('\0')) {res.writeHead(400);return res.end();}
    const relative = decoded.endsWith('/') ? decoded+'index.html' : decoded;
    const file = resolve(root, '.' + relative);
    if(file !== resolve(root, 'index.html') && !file.startsWith(root + sep)){res.writeHead(403);return res.end();}
    if(!(await stat(file)).isFile()){res.writeHead(404);return res.end();}
    const content = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file).toLowerCase()] ?? 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:content);
  } catch {res.writeHead(404);res.end('Arquivo não encontrado');}
}).listen(port,'127.0.0.1',()=>console.log(`Pulso Urbano disponível em http://127.0.0.1:${port}`));
