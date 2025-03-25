import { Response } from 'express';

interface ResponseValues {
  [key: string]: any;
}

export const responseData = function (
  response: Response, 
  statusCode: number, 
  message: string, 
  values?: ResponseValues
): void {
  const data = {
    statusCode: statusCode,
    message: message,
    data: values,
  };
  
  response.status(statusCode).json(data);
  response.end();
};

export const responseMessage = function (response: Response, statusCode: number, message: string): void {
    const data = {
        statusCode: statusCode,
        message: message,
    };
    response.status(statusCode).json(data);
    response.end();
};