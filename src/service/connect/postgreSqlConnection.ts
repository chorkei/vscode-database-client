import { Node } from "@/model/interface/node";
import { Client, QueryArrayResult } from "pg";
import { IConnection, queryCallback } from "./connection";

export class PostgreSqlConnection implements IConnection {
    private client: Client;
    constructor(opt: Node) {
        const config = {
            host: opt.host, port: opt.port,
            user: opt.user, password: opt.password,
            database: opt.database,
            connectionTimeoutMillis: 5000,
            statement_timeout: 10000,
        };
        this.client = new Client(config);
    }
    isAlive(): boolean {
        const temp = this.client as any;
        return temp._connected && (!temp._ending);
    }
    query(sql: string, callback?: queryCallback): void;
    query(sql: string, values: any, callback?: queryCallback): void;
    query(sql: any, values?: any, callback?: any) {

        if (!callback && values instanceof Function) {
            callback = values;
        }
        this.client.query(sql, (err, res) => {
            if (err) {
                callback(err)
            } else {
                if (res instanceof Array) {
                    callback(null, res.map(row => this.adaptResult(row)), res.map(row => row.fields))
                } else {
                    callback(null, this.adaptResult(res), res.fields)
                }
            }
        })
    }
    adaptResult(res: QueryArrayResult<any>) {
        if (res.command != 'SELECT') {
            return { affectedRows: res.rowCount }
        }
        return res.rows;
    }

    connect(callback: (err: Error) => void): void {
        this.client.connect(err => {
            callback(err)
        })
    }
    async beginTransaction() {
        await this.client.query("BEGIN")
    }
    async rollback() {
        await this.client.query("ROLLBACK")
    }
    async commit() {
        await this.client.query("COMMIT")
    }
    end(): void {
        this.client.end()
    }

}