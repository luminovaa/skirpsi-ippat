import { Express } from 'express';
import pzemRouter from '../src/pzem/routes';
import suhuRouter from '../src/suhu/routes';

export default (app: Express) => {

    app.use('/api/pzem', pzemRouter);
    app.use('/api/suhu', suhuRouter);
    app.use('*', (req, res) => {
        res.status(404).send('Not found!!!');
    });
}