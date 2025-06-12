import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsStringNumberMap(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStringNumberMap',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return false;
          }

          return Object.entries(value).every(
            ([key, val]) =>
              typeof key === 'string' &&
              key.trim().length > 0 &&
              typeof val === 'number' &&
              !isNaN(val),
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with string keys and number values`;
        },
      },
    });
  };
}
