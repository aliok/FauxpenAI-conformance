import {createHash} from "crypto";

export function getHash(s:string):string {
    return createHash('sha256').update(s).digest('hex');
}

export function generateTuples<T>(buckets:readonly T[][], n:number):T[][] {
    if (n < 2 || n > buckets.length) {
        throw new Error("Invalid n: should be between 2 and the number of buckets.");
    }

    function backtrack(start:number, combination:T[]):void {
        if (combination.length === n) {
            result.push([...combination]); // Copy to avoid mutation
            return;
        }

        for (let i = start; i < buckets.length; i++) {
            for (const item of buckets[i]) {
                backtrack(i + 1, [...combination, item]); // Use a new array to prevent modification
            }
        }
    }

    const result:T[][] = [];
    backtrack(0, []);
    return result;
}

export async function sleep(ms:number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function redact(text:string):string {
    if (!text) {
        return text;
    }

    if (text.length < 3) {
        return text;
    }

    const firstChar = text[0];
    const lastChar = text[text.length - 1];
    const middle = text.slice(1, -1).replace(/./g, "*");
    return `${firstChar}${middle}${lastChar}`;
}

export function escapeCSVValue(value:string) {
    if (value === null || value === undefined) return ''; // Handle null/undefined
    const str = String(value).replace(/"/g, '""'); // Escape double quotes
    return str.includes(',') ? `"${str}"` : str;  // Wrap in quotes if needed
}
