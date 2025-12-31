import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { SuccessResponseDto } from '../dtos/success-response.dto';

/**
 * @description
 * This decorator is used to add a success response to a controller method (for swagger docs).
 * @example
 * -@ApiSuccessResponse(LoginResDto)
 * -@Post('login')
 * -async createUser(@Body() LoginReqDto: LoginReqDto) { ... }
 */

// used for add document the response data (dto) beside the success response
export const ApiSuccessResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(SuccessResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};
