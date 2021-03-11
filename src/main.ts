import {Headers, Handler, LambdaHandler, Request} from './lambda-handler';
import {Schema} from 'joi';
import * as Boom from '@hapi/boom';

export interface HandlerOptions {
    validate?: {
        query?: Schema,
        path?: Schema,
        body?: Schema
    };
}

export function handle(handler: Handler, options: HandlerOptions): LambdaHandler {
    return async function(event, content, callback) {
        let headers: Headers = {};
        let statusCode = 200;
        try {
            let r = new Request(event);
            if(options.validate?.query) {
                const validateResult = options.validate.query.validate(r.query);
                if(validateResult.error) {
                    throw Boom.badRequest(validateResult.error.message);
                }
            }
            if(options.validate?.path) {
                const validateResult = options.validate.path.validate(r.path);
                if(validateResult.error) {
                    throw Boom.badRequest(validateResult.error.message);
                }
            }
            if(options.validate?.body) {
                const validateResult = options.validate.body.validate(r.body);
                if(validateResult.error) {
                    throw Boom.badRequest(validateResult.error.message);
                }
            }

            let response = await handler(r, {
                code(changeStatusCode) {
                    statusCode = changeStatusCode;
                },
                header(name: string, value: string | number): void {
                    headers[name] = value.toString();
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
            callback(e, {
                statusCode: e.output.statusCode,
                headers,
                body: JSON.stringify(e.output.payload)
            });
        }
    };
}