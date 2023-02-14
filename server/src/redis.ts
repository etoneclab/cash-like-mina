interface RedisObject {
    [key: string]: any;
 }

declare global {
    var storage: Redis 
}

export default class Redis
{
    private static storage:RedisObject = {}
    private static _instance: Redis;

    private constructor() {
        Redis._instance = this;
    }

    public static getInstance():Redis
    {
        if (!this._instance) {
            new Redis()
            return this._instance
        }
        return this._instance
    }

    public setItem(key:string, value:any) {
        Redis.storage[key] = value
    }

    public getItem(key:string) {
        return Redis.storage[key] || null
    }

    public removeItem(key:string) {
        delete Redis.storage[key]
    }
}

global.storage = Redis.getInstance()
