import fs from "node:fs";
import zlib from "zlib";
import {Result} from "../lib/result";
import {Scenario} from "../lib/scenario";

export function readResultsFile(filePath:string):Record<string, Result<any>> {
    if (isEmptyFile(filePath)) {
        // we can ignore the error, and start the tests from scratch
        console.info(`Results file ${filePath} does not exist or is empty. Starting from scratch.`);
        return {};
    }

    return readFile(filePath, true) as Record<string, Result<any>>;
}


export function isEmptyFile(filePath:string) {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return true
    }

    // check if the file is empty
    return fs.statSync(filePath).size === 0;
}

export function readFile(filePath:string, gzip:boolean):any {
    // Check if the file is readable/writable
    try {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
        // this is a critical error. we can't ignore and start the tests from scratch.
        console.error(`File ${filePath} is not readable or writable.`);
        throw new Error(`File ${filePath} is not readable or writable.`);
    }

    // Read the file
    let data:string;
    try {
        if (gzip) {
            const compressedData = fs.readFileSync(filePath);
            data = zlib.gunzipSync(compressedData).toString("utf-8");
        } else {
            data = fs.readFileSync(filePath, "utf-8");
        }
    } catch (err) {
        // this is a critical error. we can't ignore and start the tests from scratch.
        console.error(`Error reading file ${filePath}: ${err}`);
        throw new Error(`Error reading file ${filePath}: ${err}`);
    }

    // Parse the JSON data
    let theMap:Record<string, Result<any>>;
    try {
        theMap = JSON.parse(data) as Record<string, Result<any>>;
    } catch (err) {
        console.error(`Error parsing JSON data from file ${filePath}: ${err}`);
        throw new Error(`Error parsing JSON data from file ${filePath}: ${err}`);
    }

    return theMap;
}
