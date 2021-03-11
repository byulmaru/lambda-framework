import {Headers, Handler, LambdaHandler, Request} from './lambda-handler';
import {Schema} from 'joi';
import * as Boom from '@hapi/boom';

interface HandlerOptions {
    handler: Handler,
    validate?: ValidateOptions
}
interface ValidateOptions {
    query?: Schema,
    params?: Schema,
    body?: Schema
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