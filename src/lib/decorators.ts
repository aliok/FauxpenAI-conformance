import {FactorRegistry} from "./factorRegistry";

export function Register(registry:FactorRegistry<any>) {
    return function (target:Function) {
        // Register all static fields of the same type
        for (const key of Object.getOwnPropertyNames(target)) {
            if (key === "length" || key === "prototype" || key === "name") {
                continue;
            }

            const value = (target as any)[key];

            if (value instanceof target) {
                registry.register(target, value)
            }
        }
    }
}
