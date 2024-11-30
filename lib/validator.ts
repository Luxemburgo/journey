type ValidationRule = {
    validate: (value: any) => ValidationResult;
    getDocumentation?: (not?: boolean) => {[key: string]: any} | string;
};

type ValidationResult = {
    isValid: boolean;
    errors: string[];
    notError?: string;
};

function validateRules(value: any, rules: ValidationRule[], fieldName: string): ValidationResult {
    const results = rules.map(rule => rule.validate(value));
    const isValid = results.every(result => result.isValid);
    const errors = results
        .filter(result => !result.isValid)
        .flatMap(result => result.errors || [])
        .map(error => `${fieldName}: ${error}`);

    return {
        isValid,
        errors
    };
}

function either(...rules: (ValidationRule | ValidationRule[])[]): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {

            let isValid = false;
            const errors: string[] = [];

            for(const rule of rules) {
                
                const result = Array.isArray(rule) ? validateRules(value, rule, "") : rule.validate(value);
                
                if(result.isValid) isValid = true;
                
                errors.push(...(Array.isArray(rule) ?
                    [result.errors.map(e => e.replace(/^: /, "")).join(" and ")]
                :
                    result.errors)
                );
                
            }

            return {
                isValid,
                errors: isValid ? [] : [errors.map(e => `(${e})`).flat().join(" or ")]
            };
        },
        getDocumentation: () => {

            const docs: {[key: string]: any} = { either: []};

            for(const rule of rules) {

                if(Array.isArray(rule)) {
                    docs.either.push(rule.map(r => r.getDocumentation?.() ?? ""));
                }else{
                    docs.either.push(rule.getDocumentation?.() ?? "");
                }
            }

            return docs;
        }
    };
}

function not(rule: ValidationRule): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const result = rule.validate(value);
            const isValid = result.isValid;
            return isValid ? 
                {isValid: false, errors: [result.notError ?? `Wrong value given`]}
            :
                {isValid: true, errors: []}
        },
        getDocumentation: () => rule.getDocumentation?.(true) ?? ""
    };
}

function is(target: string | number, message: string = `Value must be ${target}`, notMessage: string = `Value must not be ${target}`): ValidationRule {
    return {
        validate: (value: string | number): ValidationResult => {
            
            const isValid = value === undefined || value === target;

            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            };
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isString(message: string = 'Value must be a string', notMessage: string = "Value must not be a string"): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = typeof value === 'string' || value === undefined;
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isNumber(message: string = 'Value must be a number', notMessage: string = "Value must not be a number"): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = typeof value === 'number' || value === undefined;
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isRequired(message: string = 'Value is required'): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = value !== undefined;
            return {
                isValid,
                errors: isValid ? [] : [message]
            };
        },
        getDocumentation: (not?: boolean) => not ? undefined : message
    };
}



function isGreaterThanOrEqualTo(min: any, message: string = `Value must be greater than or equal to ${min}`, notMessage: string = `Value must not be greater than or equal to ${min}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => { 
            const isValid = value === undefined || value >= min;
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isGreaterThan(min: any, message: string = `Value must be greater than ${min}`, notMessage: string = `Value must not be greater than ${min}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => { 
            const isValid = value === undefined || value > min;
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isLessThanOrEqualTo(max: any, message: string = `Value must be less than or equal to ${max}`, notMessage: string = `Value must not be less than or equal to ${max}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = value === undefined || value <= max;
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isLessThan(max: any, message: string = `Value must be less than ${max}`, notMessage: string = `Value must not be less than ${max}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = value === undefined || value < max;
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isBetween(min: any, max: any, message: string = `Value must be between ${min} and ${max}`, notMessage: string = `Value must not be between ${min} and ${max}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = value === undefined || (value >= min && value <= max);
            return { isValid, errors: isValid ? [] : [message], notError: isValid ? notMessage : undefined };
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isShorterThan(max: number, message: string = `Value must be shorter than ${max}`, notMessage: string = `Value must not be shorter than ${max}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = value === undefined || ((value ?? {}).length !== undefined && value.length < max);
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isLongerThan(min: number, message: string = `Value must be longer than ${min}`, notMessage: string = `Value must not be longer than ${min}`): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            const isValid = value === undefined || ((value ?? {}).length !== undefined && value.length > min);
            return {
                isValid,
                errors: isValid ? [] : [message],
                notError: isValid ? notMessage : undefined
            }
        },
        getDocumentation: (not?: boolean) => not ? notMessage : message
    };
}

function isObject(schema: {[key: string]: ValidationRule[] | ValidationRule}, message: string = 'Value must be an object', notMessage: string = "Value must not be an object"): ValidationRule {
    const validator: ValidationRule = {
        validate: (value: any): ValidationResult => {
            
            if ((typeof value !== 'object' || value === null) && value !== undefined) {
                return {
                    isValid: false,
                    errors: [message],
                    notError: notMessage
                };
            }

            if(!value) return { isValid: true, errors: [] };

            const unknownFields = Object.keys(value).filter(key => !schema[key]);
            const unknownFieldErrors = unknownFields.map(field => `Unknown field detected: ${field}`);

            const results = Object.entries(schema).map(([key, rules]) => {
                const fieldValue = value[key];
                return validateRules(fieldValue, Array.isArray(rules) ? rules : [rules], key);
            });

            const isValid = results.every(result => result.isValid) && unknownFields.length === 0;

            const errors = [
                ...unknownFieldErrors,
                ...results
                    .filter(result => !result.isValid)
                    .flatMap(result => result.errors || [])
            ];

            return {
                isValid,
                errors: errors.length > 0 ? errors : [],
                notError: isValid ? notMessage : undefined
            };
        },
        getDocumentation: (not?: boolean) => {

            const docs: {[key: string]: any} = {};

            for(const [key, rules] of Object.entries(schema)) {
                
                if(Array.isArray(rules)) {

                    docs[key] = rules.map(rule => rule.getDocumentation?.(not) ?? "");

                    if(docs[key].length === 1) docs[key] = docs[key][0];

                }else{

                    if(rules.getDocumentation) {
                        docs[key] = rules.getDocumentation(not);
                    }
                }
            }

            return docs;
        }
    };

    return validator;
}

function isArray(itemRules: ValidationRule[] | ValidationRule, message: string = 'Value must be an array', notMessage: string = "Value must not be an array"): ValidationRule {
    return {
        validate: (value: any): ValidationResult => {
            if (!Array.isArray(value) && value !== undefined) {
                return {
                    isValid: false,
                    errors: [message],
                    notError: notMessage
                };
            }

            if(!value) return { isValid: true, errors: [] };

            const results = value.map((item, index) => {
                return validateRules(item, Array.isArray(itemRules) ? itemRules : [itemRules], `item #${index}`);
            });

            const isValid = results.every(result => result.isValid);
            const errors = results
                .filter(result => !result.isValid)
                .flatMap(result => result.errors || []);

            return {
                isValid,
                errors: errors.length > 0 ? errors : [],
                notError: isValid ? notMessage : undefined
            };
        },
        getDocumentation: (not?: boolean) => Array.isArray(itemRules) ? 
            {array: itemRules.map(rule => rule.getDocumentation?.(not) ?? "")}
        :
            {array: itemRules.getDocumentation?.(not) ?? ""}

    };
}

function isISODate(message: string = "Value must be a valid ISO date"): ValidationRule {
    return {
        validate: function (value: string) {

            const isValid = value === undefined || /^\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
            return {isValid, errors: isValid ? [] : [message]}
        },
        getDocumentation: () => message
    };
}

function translate(messages: string[], replaces: {[key: string]: string}): string[] {
    return messages.map(message => {
        let translatedMessage = message;
        for (const [key, value] of Object.entries(replaces)) {
            translatedMessage = translatedMessage.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }
        return translatedMessage;
    });
}

const spanishReplaces = {
    "Unknown field detected": "Campo desconocido detectado",
    "Value is required": "El valor es requerido", 
    "Value must be a string": "El valor debe ser una cadena de texto",
    "Value must not be a string": "El valor no debe ser una cadena de texto",
    "Value must be a number": "El valor debe ser un número",
    "Value must not be a number": "El valor no debe ser un número",
    "Value must be an object": "El valor debe ser un objeto", 
    "Value must not be an object": "El valor no debe ser un objeto",
    "Value must be an array": "El valor debe ser un array",
    "Value must not be an array": "El valor no debe ser un array",
    "Value must be greater than": "El valor debe ser mayor que",
    "Value must be greater than or equal to": "El valor debe ser mayor o igual a",
    "Value must be less than": "El valor debe ser menor que",
    "Value must be less than or equal to": "El valor debe ser menor o igual a",
    "Value must be longer than": "El valor debe ser más largo que",
    "Value must be shorter than": "El valor debe ser más corto que",
    "Value must be between": "El valor debe estar entre",
    "Value must not be between": "El valor no debe estar entre",
    "Value must be": "El valor debe ser",
    "Value must not be": "El valor no debe ser",
    ") or (": ") o (",
    " and ": " y "
};


const personValidator = isObject({
    name:isObject({
        firstName: [
            isString(),
            isRequired()
        ],
        lastName: isString()
    }),
    age: [
        isNumber(),
        isRequired(),
        isGreaterThan(0)
    ],
    addresses: isArray(isObject({
        street: [
            isString(),
            isRequired()
        ],
        number: [
            isNumber(),
            isRequired()
        ],
        country: [
            not(isNumber())
        ]
    }))
});



const person = {
    name: {
        firstName: "John",
        lastName: "Doe"
    },
    age: 10,
    addresses: [
        {
            street: "Main St",
            number: 123,
            country: "Argentina"
        },
        {
            street: "Main St",
            number: 123,
            country: "Paraguay"
        }
    ]
};


const bookStatesValidator = either(is("Available"), is("Borrowed"), is("Lost"));

const bookValidator = isObject({
    id: [
        either([isString(), isLongerThan(3), not(is("1234"))], [isNumber(), isGreaterThan(999)]),
        isRequired()
    ],
    state: [
        bookStatesValidator,
        isRequired()
    ],
    statesHistory: [
        isArray(isObject({
            state: [bookStatesValidator],
            date: [isISODate()]
        }))
    ],
    title: [
        isString(),
        isRequired()
    ],
    ids: [
        isArray(either(isString(), isNumber())),
        isLongerThan(5)
    ],
    owner: [
        personValidator,
        isRequired()
    ]
});

const book = {
    id: 1234,
    ids: ["1234", "5678", 6, 7, 8, 9],
    title: "The Great Gatsby",
    state: "Available",
    statesHistory: [
        {state: "Available", date: "2024-01-01T10:23:00.000Z"},
        {state: "Borrowed", date: "2024-01-02T12:30:00.000Z"},
        {state: "Lost", date: "2024-01-03T15:00:00.000Z"}
    ],
    owner: person
};

// console.log("Person:", personValidator.validate(person));

console.log(JSON.stringify(bookValidator.getDocumentation?.(), null, 4));
// console.log(JSON.stringify(bookValidator.getDocumentation?.(), null, 2));

const bookValidation = bookValidator.validate(book);

console.log("Book:", translate(bookValidation.errors, spanishReplaces));


