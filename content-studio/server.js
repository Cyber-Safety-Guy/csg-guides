import 'dotenv/config';
import express from 'express';
import generateRoute from './routes/generate.js';
import downloadRoute from './routes/download.js';
import interviewRoute from './routes/interview.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/generate', generateRoute);
app.use('/download', downloadRoute);
app.use('/interview', interviewRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CSG Studio running on port ${PORT}`));
