type ValidationResult = {
    isValid: boolean;
    errors: string[];
};

type ValidationRule = (value: unknown) => string | null;
type ValidatorExtension<T> = (instance: T) => T;

interface Validator<T> {
    validate(value: unknown): ValidationResult;
}

abstract class ExtensibleValidator<T, Self extends ExtensibleValidator<T, Self>> implements Validator<T> {
    protected rules: ValidationRule[] = [];
    protected required: boolean = false;

    validate(value: unknown): ValidationResult {
        if (value === undefined || value === null) {
            if (this.required) {
                return { isValid: false, errors: ['Value is required'] };
            }
            return { isValid: true, errors: [] };
        }

        const errors = this.rules
            .map(rule => rule(value))
            .filter((error): error is string => error !== null);

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isRequired(): this {
        this.required = true;
        return this;
    }

    // Método para agregar reglas personalizadas
    addRule(rule: ValidationRule): this {
        this.rules.push(rule);
        return this;
    }

    // Método para aplicar extensiones
    extend(extension: ValidatorExtension<Self>): Self {
        return extension(this as unknown as Self);
    }
}

class StringValidator extends ExtensibleValidator<string, StringValidator> {
    constructor() {
        super();
        this.rules.push((value) => {
            if (typeof value !== 'string') {
                return 'Value must be a string';
            }
            return null;
        });
    }

    minLength(length: number): this {
        return this.addRule((value) => {
            if (typeof value === 'string' && value.length < length) {
                return `String must be at least ${length} characters long`;
            }
            return null;
        });
    }
}

class NumberValidator extends ExtensibleValidator<number, NumberValidator> {
    constructor() {
        super();
        this.rules.push((value) => {
            if (typeof value !== 'number') {
                return 'Value must be a number';
            }
            return null;
        });
    }

    isGreaterThan(min: number): this {
        return this.addRule((value) => {
            if (typeof value === 'number' && value <= min) {
                return `Number must be greater than ${min}`;
            }
            return null;
        });
    }
}

class ObjectValidator<T extends Record<string, Validator<any>>> extends ExtensibleValidator<T, ObjectValidator<T>> {
    private allowUnknown: boolean = false;

    constructor(private schema: T) {
        super();
        this.rules.push((value) => {
            if (typeof value !== 'object' || value === null) {
                return 'Value must be an object';
            }
            return null;
        });
    }

    override validate(value: unknown): ValidationResult {
        const baseResult = super.validate(value);
        if (!baseResult.isValid || value === null || value === undefined) {
            return baseResult;
        }

        const errors: string[] = [];
        const valueObject = value as Record<string, unknown>;

        if (!this.allowUnknown) {
            const unknownFields = Object.keys(valueObject).filter(
                key => !Object.prototype.hasOwnProperty.call(this.schema, key)
            );
            if (unknownFields.length > 0) {
                errors.push(`Unknown field(s): ${unknownFields.join(', ')}`);
            }
        }

        for (const [key, validator] of Object.entries(this.schema)) {
            const fieldResult = validator.validate(valueObject[key]);
            if (!fieldResult.isValid) {
                errors.push(...fieldResult.errors.map(error => `${key}: ${error}`));
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    allowUnknownFields(): this {
        this.allowUnknown = true;
        return this;
    }
}

class ArrayValidator<T> extends ExtensibleValidator<T[], ArrayValidator<T>> {
    constructor(private itemValidator: Validator<T>) {
        super();
        this.rules.push((value) => {
            if (!Array.isArray(value)) {
                return 'Value must be an array';
            }
            return null;
        });
    }

    override validate(value: unknown): ValidationResult {
        const baseResult = super.validate(value);
        if (!baseResult.isValid || value === null || value === undefined) {
            return baseResult;
        }

        const errors: string[] = [];
        (value as unknown[]).forEach((item, index) => {
            const itemResult = this.itemValidator.validate(item);
            if (!itemResult.isValid) {
                errors.push(...itemResult.errors.map(error => `[${index}]: ${error}`));
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

function isString() {
    return new StringValidator();
}

function isNumber() {
    return new NumberValidator();
}

function isObject<T extends Record<string, Validator<any>>>(schema: T) {
    return new ObjectValidator(schema);
}

function isArray<T>(itemValidator: Validator<T>) {
    return new ArrayValidator(itemValidator);
}

function validate<T>(validator: Validator<T>, value: unknown): ValidationResult {
    return validator.validate(value);
}

const withEmail = (validator: StringValidator) => {
    return validator.addRule((value) => {
        if (typeof value === 'string' && !value.includes('@')) {
            return 'Invalid email format';
        }
        return null;
    });
};

const withEvenNumber = (validator: NumberValidator) => {
    return validator.addRule((value) => {
        if (typeof value === 'number' && value % 2 !== 0) {
            return 'Number must be even';
        }
        return null;
    });
};

const validator = isObject({
    email: isString()
        .extend(withEmail)
        .isRequired(),
    age: isNumber()
        .extend(withEvenNumber)
        .isGreaterThan(0)
        .isRequired(),
    addresses: isArray(
        isObject({
            street: isString().isRequired(),
            number: isNumber().isRequired()
        })
    ).isRequired()
});

const testData = {
    _email: "invalid-email@mail.com",
    age: 26,
    addresses: [{
        street: "Main St",
        number: 123
    }]
};

console.log(validate(validator, testData));

type StringValidatorExtension = ValidatorExtension<StringValidator>;

const withUrl: StringValidatorExtension = (validator) => {
    return validator.addRule((value) => {
        try {
            if (typeof value === 'string') {
                new URL(value);
                return null;
            }
            return 'Invalid URL format';
        } catch {
            return 'Invalid URL format';
        }
    });
};

const withDate: StringValidatorExtension = (validator) => {
    return validator.addRule((value) => {
        if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return 'Invalid date format';
            }
        }
        return null;
    });
};

const websiteValidator = isObject({
    url: isString()
        .extend(withUrl)
        .isRequired(),
    createdAt: isString()
        .extend(withDate)
        .isRequired()
});