import { Server } from 'Socket.IO'
import type { NextApiRequest, NextApiResponse } from 'next'
import { ErrorResponse } from '../../../interfaces'
import Redis from '../../../utility/redis'

global.storage = Redis.getInstance()

const SocketHandler = ( req: NextApiRequest,
    res: NextApiResponse<ErrorResponse>) => {
        const redis = global.storage.getItem('socket')
  if (redis) {
    console.log('Socket is already running')
    res.status(500).json({error: true, data: ''})
    return
  } else {
    console.log('Socket is initializing')
    //@ts-ignore
    const io = new Server(res.socket.server)
    //@ts-ignore
    res.socket.server.io = io
    global.storage.setItem('socket', io)
  }
  res.end()
}

export default SocketHandler