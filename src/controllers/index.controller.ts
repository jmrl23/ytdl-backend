import { Router } from 'express';
import { wrapper } from '../utils/express';
import { AppService } from '../services';
import { ValidatorTarget, requestValidatorMiddleware } from '../middlewares';
import {
  AppDownloadDto,
  AppDownloadPrevent,
  AppDownloadTypes,
  AppSuggestionsDto,
  AppVideosDto,
} from '../dto';
import { logger } from '../utils';
import contentDisposition from 'content-disposition';

export const controller = Router();

controller
  .post(
    '/suggestions',
    requestValidatorMiddleware(ValidatorTarget.BODY, AppSuggestionsDto),
    wrapper(async function (request) {
      const appService = await AppService.getInstance();

      return appService.suggestions(request.body);
    }),
  )

  .post(
    '/videos',
    requestValidatorMiddleware(ValidatorTarget.BODY, AppVideosDto),
    wrapper(async function (request) {
      const appService = await AppService.getInstance();

      return appService.videos(request.body);
    }),
  )

  .get(
    '/download',
    requestValidatorMiddleware(ValidatorTarget.QUERY, AppDownloadDto),
    wrapper(async function (request, response) {
      const appService = await AppService.getInstance();
      const payload = request.query as unknown as AppDownloadDto;
      const actionMethods = {
        [AppDownloadTypes.AUDIO]: appService.downloadAudio,
        [AppDownloadTypes.VIDEO]: appService.downloadVideo,
      };
      const { fileLocation, fileName, fileInfo } = await actionMethods[
        payload.type
      ].bind(appService)(payload);

      logger.info(`Downloaded | ${payload.video_id} | ${fileName}`);

      if (
        !('prevent_download' in payload) ||
        payload.prevent_download === AppDownloadPrevent.FALSE
      ) {
        response.setHeader('Content-Disposition', contentDisposition(fileName));
      }

      response.setHeader('Content-Type', 'audio/mpeg');
      response.setHeader('Cache-Control', 'max-age=36000');
      response.setHeader('Content-Length', fileInfo.size);

      if (payload.type === AppDownloadTypes.VIDEO) {
        response.setHeader('Content-Type', 'video/mp4');
      }

      response.sendFile(fileLocation, () =>
        appService.cleanDownloadedFile(fileLocation),
      );
    }),
  )

  .get(
    '/swagger.json',
    wrapper(async function () {
      return AppService.swaggerData();
    }),
  )

  .use('/swagger', ...AppService.swaggerServe());
