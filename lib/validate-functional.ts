// Tipos base
type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

type ValidatorFn = (value: unknown) => ValidationResult;

// Interfaz para mantener la API fluida
interface FluentValidator<T> {
  validate: ValidatorFn;
  isRequired(): FluentValidator<T>;
  extend(fn: (v: ValidatorFn) => ValidatorFn): FluentValidator<T>;
}

// Helpers para ValidationResult
const success: ValidationResult = { isValid: true, errors: [] };
const error = (message: string): ValidationResult => ({
  isValid: false,
  errors: [message]
});

// Combinador de validadores
const combine = (...validators: ValidatorFn[]): ValidatorFn =>
  (value) => {
    const results = validators.map(v => v(value));
    const errors = results.flatMap(r => r.errors);
    return { isValid: errors.length === 0, errors };
  };

// Factory para crear validadores fluidos
const createFluentValidator = (baseValidator: ValidatorFn): FluentValidator<unknown> => {
  const validators: ValidatorFn[] = [baseValidator];

  const getCurrentValidator = () => combine(...validators);

  return {
    validate: (value: unknown) => getCurrentValidator()(value),

    isRequired(): FluentValidator<unknown> {
      validators.push((value) =>
        value === undefined || value === null
          ? error('Value is required')
          : success
      );
      return this;
    },

    extend(fn: (v: ValidatorFn) => ValidatorFn): FluentValidator<unknown> {
      validators.push(fn(getCurrentValidator()));
      return this;
    }
  };
};

// Validadores base
const isString = () => {
  const stringValidator: ValidatorFn = (value) =>
    typeof value !== 'string'
      ? error('Value must be a string')
      : success;

  return createFluentValidator(stringValidator);
};

const isNumber = () => {
  const numberValidator: ValidatorFn = (value) =>
    typeof value !== 'number'
      ? error('Value must be a number')
      : success;

  // Creamos una interfaz específica para el validador de números
  interface NumberValidator extends FluentValidator<number> {
    isGreaterThan(min: number): NumberValidator;
  }

  const validator = createFluentValidator(numberValidator) as NumberValidator;

  return {
    ...validator,
    isGreaterThan(min: number): NumberValidator {
      return validator.extend(v => value => {
        const baseResult = v(value);
        if (!baseResult.isValid) return baseResult;
        return typeof value === 'number' && value <= min
          ? error(`Number must be greater than ${min}`)
          : success;
      }) as NumberValidator;
    }
  };
};

const isArray = <T>(itemValidator: FluentValidator<T>) => {
  const arrayValidator: ValidatorFn = (value) => {
    if (!Array.isArray(value)) {
      return error('Value must be an array');
    }

    const results = value.map((item, index) => {
      const result = itemValidator.validate(item);
      return {
        ...result,
        errors: result.errors.map(err => `[${index}]: ${err}`)
      };
    });

    return {
      isValid: results.every(r => r.isValid),
      errors: results.flatMap(r => r.errors)
    };
  };

  return createFluentValidator(arrayValidator);
};

const isObject = <T extends Record<string, FluentValidator<any>>>(schema: T) => {
  const objectValidator: ValidatorFn = (value) => {
    if (typeof value !== 'object' || value === null) {
      return error('Value must be an object');
    }

    const valueObj = value as Record<string, unknown>;
    const errors: string[] = [];

    // Validar campos desconocidos
    const unknownFields = Object.keys(valueObj).filter(
      key => !Object.prototype.hasOwnProperty.call(schema, key)
    );
    if (unknownFields.length > 0) {
      errors.push(`Unknown field(s): ${unknownFields.join(', ')}`);
    }

    // Validar campos conocidos
    for (const [key, validator] of Object.entries(schema)) {
      const fieldValue = valueObj[key];
      const result = validator.validate(fieldValue);
      errors.push(...result.errors.map(err => `${key}: ${err}`));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return createFluentValidator(objectValidator);
};

// Extensiones de ejemplo
const withEmail = (validator: ValidatorFn): ValidatorFn =>
  (value) => {
    const baseResult = validator(value);
    if (!baseResult.isValid) return baseResult;

    return typeof value === 'string' && !value.includes('@')
      ? error('Invalid email format')
      : success;
  };

const withEvenNumber = (validator: ValidatorFn): ValidatorFn =>
  (value) => {
    const baseResult = validator(value);
    if (!baseResult.isValid) return baseResult;

    return typeof value === 'number' && value % 2 !== 0
      ? error('Number must be even')
      : success;
  };

// Función validate
const validate = (validator: FluentValidator<unknown>, value: unknown): ValidationResult =>
  validator.validate(value);

// Ejemplo de uso manteniendo la misma API
const validator = isObject({
  email: isString()
    .extend(withEmail)
    .isRequired(),
  age: isNumber()
    .isGreaterThan(0)
    .isRequired(),
  addresses: isArray(
    isObject({
      street: isString().isRequired(),
      number: isNumber().isRequired()
    })
  ).isRequired()
});

// Pruebas
const validData = {
  email: "test@example.com",
  age: 26,
  addresses: [{
    street: "Main St",
    number: 123
  }]
};

const invalidData = {
  email: "invalid-email",
  age: 25,
  addresses: [{
    street: "Main St",
    number: "123" // Tipo incorrecto
  }],
  unknown: "field" // Campo desconocido
};

console.log('Valid data:', validate(validator, validData));
console.log('Invalid data:', validate(validator, invalidData));