import express from 'express'
import { google } from 'googleapis'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import cors from 'cors'
import bodyParser from 'body-parser'

dotenv.config({})

const calendar = google.calendar({
    version: 'v3',
    auth: process.env.API_KEY,
})
const app = express()

app.use(cors());
app.use(bodyParser.json());

const port = process.env.NODE_ENV || 3000

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
)
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

app.get("/google", (req ,res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES
    })
    res.redirect(url);
})

app.get("/google/redirect", async(req,res) => {
    
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);
    res.send({
        msg: tokens,
    });
})

const createOAuth2Client = (tokens) => {
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URL
    );
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
};

const fetchUserEvents = async (oauth2Client) => {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    console.log(calendar);

    const eventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return eventsResponse.data.items;
};

const createEventForUser = async (oauth2Client, eventData) => {
    console.log(eventData);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const result = await calendar.events.insert({
        calendarId: 'primary',
        auth: oauth2Client,
        requestBody: {
            summary: eventData.summary || 'Default Event Summary',
            description: eventData.description || 'Default Event Description',
            start: {
                dateTime: eventData.startDateTime || dayjs(new Date()).add(1, 'day').toISOString(),
                timeZone: eventData.timeZone || 'Asia/Kolkata',
            },
            end: {
                dateTime: eventData.endDateTime || dayjs(new Date()).add(1, 'day').add(1, 'hour').toISOString(),
                timeZone: eventData.timeZone || 'Asia/Kolkata',
            },
        },
    });

    return result.data;
};

app.post("/get_calendars", async (req, res) => {
    try {
        const userTokens = req.body.users;
        const getCalendars = [];

        for (const userToken of userTokens) {
            const oauth2Client = createOAuth2Client(userToken);
            const userEvents = await fetchUserEvents(oauth2Client);
            getCalendars.push({ user: userToken, events: userEvents });
        }
        res.json({ getCalendars });
    } catch (error) {
        console.error('Error syncing calendars:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post("/create_event", async(req,res) => {

    try {
        const eventdate = req.body.eventData;
        const userTokens = req.body.userTokens;

        const createdEvents = []

        for(const userToken of userTokens){
            const oauth2Client = createOAuth2Client(userToken);
            const createdEvent = await createEventForUser(oauth2Client,eventdate);
            createdEvents.push({ user: userToken, event: createdEvent });
        }
        res.json({ createdEvents });
    } catch (error) {
        console.error('Error creating event:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.listen(port, () => {
    console.log("Server started on port",port);
})