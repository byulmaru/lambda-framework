import {Headers, LambdaHandler, Request} from './lambda-handler';
import {Schema} from 'joi';
import Boom from '@hapi/boom';
import fs from 'fs/promises';

interface HandlerOptions {
    handler: Handler,
    validate?: ValidateOptions
}
interface ValidateOptions {
    query?: Schema,
    params?: Schema,
    body?: Schema
}
interface Handler {
    (request: Request, handler: ResponseHandler): Promise<string | object | void | undefined>;
}
interface ResponseHandler {
    code(statusCode: number): void,
    header(name: string, value: string | number): void,
    redirect(location: string, options?: {statusCode?: number}): void,
    file(path: string, encoding: BufferEncoding): Promise<string> | undefined
}

export function handle({handler, validate}: HandlerOptions): LambdaHandler {
    return async function(event, content, callback) {
        let headers: Headers = {};
        let statusCode = 200;
        try {
            let r = new Request(event);
            if(validate) {
                if(validate.query) {
                    const validateResult = validate.query.validate(r.query);
                    if(validateResult.error) {
                        throw Boom.badRequest(validateResult.error.message);
                    }
                }
                if(validate.params) {
                    const validateResult = validate.params.validate(r.params);
                    if(validateResult.error) {
                        throw Boom.badRequest(validateResult.error.message);
                    }
                }
                if(validate.body) {
                    const validateResult = validate.body.validate(r.body);
                    if(validateResult.error) {
                        throw Boom.badRequest(validateResult.error.message);
                    }
                }
            }

            let response = await handler(r, {
                code(changeStatusCode) {
                    statusCode = changeStatusCode;
                },
                header(name: string, value: string | number): void {
                    headers[name] = value.toString();
                },
                redirect(location: string, options?: {statusCode?: number}) {
                    headers.Location = location;
                    statusCode = options?.statusCode || 302;
                },
                file(path: string, encoding: BufferEncoding = 'utf8') {
                    try {
                        return fs.readFile(path, {encoding}) as Promise<string>;
                    }
                    catch(e) {
                        console.error(e);
                        throw Boom.notFound();
                    }
                }
            });
            let body = typeof response === 'string' ? response : JSON.stringify(response);
            callback(null, {
                statusCode,
                headers,
                body
            });
        }
        catch(e) {
            if(!Boom.isBoom(e)) {
                console.error(e);
                e = Boom.internal();
            }
            callback(null, {
                statusCode: e.output.statusCode,
                headers,
                body: JSON.stringify(e.output.payload)
            });
        }
    };
}