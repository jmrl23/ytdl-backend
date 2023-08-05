import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { wrapper } from '../utils/express';
import { BadRequest } from 'http-errors';

export enum ValidatorTarget {
  PARAMS,
  BODY,
  QUERY,
}

export const requestValidatorMiddleware = function requestValidatorMiddleware<
  T extends object,
>(validatorTarget: ValidatorTarget, cls: ClassConstructor<T>) {
  const [callback] = wrapper(async function (request, _response, next) {
    const map = {
      [ValidatorTarget.PARAMS]: request.params,
      [ValidatorTarget.BODY]: request.body,
      [ValidatorTarget.QUERY]: request.query,
    };
    const target = map[validatorTarget];
    const instance = plainToInstance(cls, target);
    const [validationError] = await validate(instance, {
      stopAtFirstError: true,
    });

    if (validationError) {
      for (const key in validationError.constraints) {
        const message = validationError.constraints[key];
        throw new BadRequest(message);
      }
    }

    map[validatorTarget] = instance;
    next();
  });

  return callback;
};
