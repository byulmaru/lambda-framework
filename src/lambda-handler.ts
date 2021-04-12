import {parse} from 'qs';
import {parse as multipartParse} from 'lambda-multipart-parser';

export interface Headers {
    [key: string]: string;
}
export interface LambdaHandler {
    (event: LambdaRequest, context: any, callback: (error: object | null, response: {statusCode: number, headers: Headers, body: string}) => void): void
}
interface LambdaRequest {
    path: string,
    httpMethod: string,
    headers: object,
    queryStringParameters?: object,
    pathParameters?: object,
    body: string
}
export class Request {
    private readonly headers: Headers;
    public query: any;
    public params: any;
    public body: any;
    public bodyPromise?: Promise<void>
    public custom: any = {};
    constructor(request: LambdaRequest) {
        this.headers = {};
        for(const [key, value] of Object.entries(request.headers)) {
            this.headers[key.toLowerCase()] = value;
        }
        this.query = request.queryStringParameters || {};
        this.params = request.pathParameters || {};
        switch(this.getHeaders('Content-Type')?.toLowerCase().split(';')[0]) {
            case 'application/x-www-form-urlencoded':
                this.body = parse(request.body);
                break;
            case 'application/json':
                this.body = JSON.parse(request.body);
                break;
            case 'multipart/form-data':
                this.bodyPromise = multipartParse(request).then((result): void => {
                    this.body = result;
                    for(const i in result.files) {
                        this.body[result.files[i].fieldname] = result.files[i];
                    }
                });
                break;
            default:
                this.body = request.body;
        }
    }
    getHeaders(key: string) {
        return this.headers[key.toLowerCase()];
    }
}