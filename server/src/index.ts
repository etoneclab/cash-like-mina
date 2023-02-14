import express, { Express, Request, Response } from 'express';
import cors from 'cors'
import { pollTransaction, setupEndpoints } from './request.js';
import Redis from './redis.js';
import expressWs from 'express-ws'
import http from 'http'
import { v4 } from 'uuid';
global.storage = Redis.getInstance()

const appBase: Express = express();
const port = process.env.PORT;

var wsInstance = expressWs(appBase);
var { app } = wsInstance; 
app.use(express.json())

app.use(cors({credentials: true, origin: true, methods: "GET,HEAD,PUT,PATCH,POST,DELETE"}))

app.options('*', cors())

app.all('/*', function(req:any, res:any, next:any) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Token");
    next();
});

setupEndpoints(appBase)

app.get('/', (req: Request, res: Response) => {
  res.send('PSP Mina Like Cash');
});

let s = http.createServer(app)
expressWs(app, s)

app.ws('/api/login/v2', (ws:any, req:any) => {
  const token = v4()
  ws.on('message', (msg:string) => {
    global.storage.setItem(token, {ws})
    ws.send(JSON.stringify({session: token}))
  })

  ws.on('close', () => {
    global.storage.removeItem(token);
    console.log('WebSocket was closed')
  })
})


s.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
