import {Scenario} from "./scenario";

export interface ErrorEntry {
    message:object;
    statusCode:number;
}

export interface Response {
    status:number;
    headers:{ [k:string]:string } | null;
    body:object | null;
}

export class Result<Target> {
    readonly key:string;
    readonly scenario:Scenario<Target>;
    response:Response | null;
    errors:ErrorEntry[];

    constructor(source:Scenario<Target>, response:Response | null = null, errors:ErrorEntry[] = []) {
        this.key = source.key;
        this.scenario = source;
        this.response = response;
        this.errors = errors;
    }
}
